const jwt = require('jsonwebtoken');
const { User, TeamMember } = require('../models');

exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token: user not found' });
    }
 
    req.user = user;
    req.token = token;
    req.decodedToken = decoded;
    
    // Add impersonation info to request if present
    req.isImpersonating = !!decoded.isImpersonated;
    req.impersonatorId = decoded.impersonatorId;
    req.originalRole = decoded.originalRole;
    
    next();
  } catch (err) {
    console.error('JWT error:', err);
    return res.status(403).json({ message: 'Token is invalid or expired' });
  }
};

// Middleware to check if a user can access another user's resources (for impersonation)
exports.canAccessUser = (targetUserId) => {
  return (req, res, next) => {
    // If user is the same as target user, allow access
    if (req.user.id == targetUserId) {
      return next();
    }
    
    // If user is impersonating and impersonator has permission, allow access
    if (req.isImpersonating) {
      // Super admin can access any user's resources
      if (req.originalRole === 'super_admin') {
        return next();
      }
      
      // Team admin can access team members' resources
      // Check if target user is a team member in teams where current user is admin
      return checkTeamAccess(req, targetUserId, next, res);
    }
    
    // If not impersonating, user can only access their own resources
    return res.status(403).json({ message: 'Forbidden: cannot access another user\'s resources' });
  };
};

// Helper function to check team-based access
async function checkTeamAccess(req, targetUserId, next, res) {
  try {
    // Find team membership of target user
    const targetMemberships = await TeamMember.findAll({
      where: { user_id: targetUserId }
    });
    
    // Find team membership of impersonator
    const impersonatorMemberships = await TeamMember.findAll({
      where: { user_id: req.impersonatorId }
    });
    
    // Check if there's a team where impersonator is admin and target is member
    for (const targetMember of targetMemberships) {
      if (targetMember.role === 'member') { // Target is a member
        const impersonatorAdminInSameTeam = impersonatorMemberships.find(
          impMember => impMember.team_id === targetMember.team_id && impMember.role === 'admin'
        );
        
        if (impersonatorAdminInSameTeam) {
          return next(); // Allow access
        }
      }
    }
    
    return res.status(403).json({ message: 'Forbidden: insufficient permissions to access this user\'s resources' });
  } catch (error) {
    console.error('Team access check error:', error);
    return res.status(500).json({ message: 'Internal server error during access check' });
  }
}

exports.authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    if (req.user.role === 'super_admin') {
      return next();
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};

exports.authorizeTeamRole = (allowedRoles = []) => {
  return async (req, res, next) => {

    const teamId = req.header("X-Team-ID");

    if (!teamId || isNaN(teamId)) {
      return res
        .status(400)
        .json({ message: "Missing or invalid X-Team-ID header" });
    }

    req.team_id = teamId;

    // Super admin bypass
    if (req.user.role === 'super_admin') {
      req.team_role = 'admin';
      return next();
    }

    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden: not a valid team user' });
    }

    try {
      const membership = await TeamMember.findOne({
        where: { team_id: teamId, user_id: req.user.id }
      });

      if (!membership) {
        return res.status(403).json({ message: 'User is not part of this team' });
      }

      req.team_role = membership.role;

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({ message: 'Forbidden: insufficient team permissions' });
      }

      next();
    } catch (err) {
      console.error('Team role check error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};