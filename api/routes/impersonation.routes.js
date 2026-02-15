const express = require('express');
const router = express.Router();
const impersonationController = require('../controllers/impersonation.controller');
const { authenticate } = require('../middlewares/auth');
const { impersonateUser, checkImpersonationStatus, restrictImpersonationActions } = require('../middlewares/impersonation');

// Apply authentication to all routes
router.use(authenticate);

// Check impersonation status middleware
router.use(checkImpersonationStatus);

// Get available users that current user can impersonate
router.get('/available-users', impersonationController.getAvailableUsersToImpersonate);

// Get current user's team memberships
router.get('/my-teams', impersonationController.getCurrentUserTeams);

// Get current impersonation status
router.get('/status', impersonationController.getImpersonationStatus);

// Start impersonation - super_admin can impersonate team admins and members
// team admin can impersonate team members
router.post('/start', impersonateUser, impersonationController.startImpersonation);

// Stop impersonation - return to original user session
router.post('/stop', impersonationController.stopImpersonation);

// Apply restriction middleware for sensitive actions during impersonation
// This should be applied to routes that need restrictions (like message sending)
router.use(restrictImpersonationActions);

module.exports = router;