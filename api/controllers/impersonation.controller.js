const { Op } = require('sequelize');
const { User, TeamMember, Session } = require('../models');
const { generateToken } = require('../utils/jwt');

/**
 * Controller for handling user impersonation functionality
 * Super admin can impersonate team admins and members
 * Team admin can impersonate team members
 */

exports.startImpersonation = async (req, res) => {
  try {
    const { targetUserId } = req.body; 
    
    if (!targetUserId) {
      return res.status(400).json({ 
        success: false,
        message: 'Target user ID is required for impersonation' 
      });
    }
    
    // The impersonation logic is handled by the middleware
    // Here we just return the impersonation token
    
    if (!req.impersonation) {
      return res.status(500).json({ 
        success: false,
        message: 'Impersonation failed - middleware did not set impersonation data' 
      });
    }
    
    // Clean up any existing sessions with the same token to avoid duplicate entry error
    await Session.destroy({
      where: {
        session_token: req.impersonation.token
      }
    });
    
    // Also clean up any existing active or inactive impersonation sessions for this user by this impersonator
    // This prevents conflicts when restarting impersonation
    await Session.destroy({
      where: {
        user_id: req.impersonation.targetUser.id,
        agenda: `impersonation_by_${req.impersonation.impersonator.id}`
      }
    });
    
    // Create session for impersonation tracking
    let session;
    try {
      session = await Session.create({
        user_id: req.impersonation.targetUser.id,
        session_token: req.impersonation.token,
        device_info: req.headers["user-agent"],
        ip_address: req.ip,
        agenda: `impersonation_by_${req.impersonation.impersonator.id}`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'active'
      });
    } catch (createError) {
      // If duplicate entry error still occurs (race condition), find and update existing session
      if (createError.name === 'SequelizeUniqueConstraintError' || createError.code === 'ER_DUP_ENTRY') {
        session = await Session.findOne({
          where: {
            session_token: req.impersonation.token
          }
        });
        
        if (session) {
          await session.update({
            user_id: req.impersonation.targetUser.id,
            device_info: req.headers["user-agent"],
            ip_address: req.ip,
            agenda: `impersonation_by_${req.impersonation.impersonator.id}`,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            status: 'active'
          });
        } else {
          throw createError; // Re-throw if we can't find the session
        }
      } else {
        throw createError; // Re-throw if it's a different error
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Impersonation started successfully',
      token: req.impersonation.token,
      targetUser: {
        id: req.impersonation.targetUser.id,
        name: req.impersonation.targetUser.name,
        email: req.impersonation.targetUser.email,
        role: req.impersonation.targetUser.role
      },
      impersonator: {
        id: req.impersonation.impersonator.id,
        name: req.impersonation.impersonator.name,
        email: req.impersonation.impersonator.email,
        role: req.impersonation.impersonator.role
      },
      teamId: req.impersonation.teamId,
      targetRole: req.impersonation.targetRole,
      session_id: session.id
    });
    
  } catch (error) {
    console.error('Start impersonation error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error during impersonation start',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.stopImpersonation = async (req, res) => {
  try {
    // Check if user is currently impersonating
    if (!req.isImpersonating) {
      return res.status(400).json({ 
        success: false,
        message: 'User is not currently impersonating anyone' 
      });
    }
    
    // Get the original impersonator user
    const originalUser = await User.findByPk(req.impersonatorId);
    if (!originalUser) {
      return res.status(404).json({ 
        success: false,
        message: 'Original impersonator not found' 
      });
    }
    
    // Generate a new token for the original user
    const originalToken = generateToken({
      id: originalUser.id,
      email: originalUser.email,
      role: originalUser.role
    });
    
    // Update the session to mark impersonation as inactive
    // Find session by token and agenda pattern (impersonation sessions have agenda like "impersonation_by_X")
    const currentToken = req.headers.authorization?.split(' ')[1];
    if (currentToken) {
      await Session.update(
        { status: 'inactive' },
        { 
          where: { 
            session_token: currentToken,
            agenda: {
              [Op.like]: 'impersonation_by_%'
            }
          } 
        }
      );
    }
    
    return res.status(200).json({
      success: true,
      message: 'Impersonation stopped successfully',
      token: originalToken,
      originalUser: {
        id: originalUser.id,
        name: originalUser.name,
        email: originalUser.email,
        role: originalUser.role
      }
    });
    
  } catch (error) {
    console.error('Stop impersonation error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error during impersonation stop' 
    });
  }
};

exports.getImpersonationStatus = async (req, res) => {
  try {
    if (!req.isImpersonating) {
      return res.status(200).json({
        success: true,
        isImpersonating: false,
        message: 'User is not currently impersonating anyone'
      });
    }
    
    // Get impersonator info
    const impersonator = await User.findByPk(req.impersonatorId);
    
    return res.status(200).json({
      success: true,
      isImpersonating: true,
      impersonator: impersonator ? {
        id: impersonator.id,
        name: impersonator.name,
        email: impersonator.email,
        role: impersonator.role
      } : null,
      originalRole: req.originalRole
    });
    
  } catch (error) {
    console.error('Get impersonation status error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error getting impersonation status' 
    });
  }
};

// Get list of users that current user can impersonate
exports.getAvailableUsersToImpersonate = async (req, res) => {
  try {
    // Find all teams where the current user has admin rights
    const adminTeamMemberships = await TeamMember.findAll({
      where: {
        user_id: req.user.id,
        role: 'admin'
      }
    });
    
    let availableUsers = [];
    
    if (req.user.role === 'super_admin') {
      // Super admin can impersonate any team admin or member
      const allTeamMembers = await TeamMember.findAll({
        include: [{
          model: User,
          attributes: ['id', 'name', 'email', 'role'],
          required: true // Only include TeamMembers that have a valid User
        }]
      });
      
      availableUsers = allTeamMembers
        .filter(tm => tm.User && tm.User.id) // Additional safety check
        .map(tm => ({
          id: tm.User.id,
          name: tm.User.name,
          email: tm.User.email,
          role: tm.User.role,
          teamId: tm.team_id,
          teamRole: tm.role,
          canImpersonate: true
        }));
    } else if (adminTeamMemberships.length > 0) {
      // Team admin can impersonate members in their teams
      const teamIds = adminTeamMemberships.map(tm => tm.team_id);
      
      const teamMembers = await TeamMember.findAll({
        where: {
          team_id: teamIds,
          role: 'member' // Only members, not other admins
        },
        include: [{
          model: User,
          attributes: ['id', 'name', 'email', 'role'],
          required: true // Only include TeamMembers that have a valid User
        }]
      });
      
      availableUsers = teamMembers
        .filter(tm => tm.User && tm.User.id) // Additional safety check
        .map(tm => ({
          id: tm.User.id,
          name: tm.User.name,
          email: tm.User.email,
          role: tm.User.role,
          teamId: tm.team_id,
          teamRole: tm.role,
          canImpersonate: true
        }));
    }
    
    return res.status(200).json({
      success: true,
      availableUsers,
      total: availableUsers.length
    });
    
  } catch (error) {
    console.error('Get available users to impersonate error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error getting available users to impersonate' 
    });
  }
};

// Get current user's team memberships with impersonation info
exports.getCurrentUserTeams = async (req, res) => {
  try {
    const teamMemberships = await TeamMember.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: User,
        attributes: ['id', 'name', 'email', 'role']
      }]
    });
    
    const teams = teamMemberships.map(tm => ({
      id: tm.id,
      team_id: tm.team_id,
      user_id: tm.user_id,
      role: tm.role,
      status: tm.status,
      display_name: tm.display_name,
      createdAt: tm.created_at,
      updatedAt: tm.updated_at
    }));
    
    return res.status(200).json({
      success: true,
      teams,
      total: teams.length
    });
    
  } catch (error) {
    console.error('Get current user teams error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error getting user teams' 
    });
  }
};