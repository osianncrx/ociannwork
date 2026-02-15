const express = require('express');
const router = express.Router();
const { restrictImpersonationActions } = require("../middlewares/impersonation");
const { authenticate, authorizeRoles } = require('../middlewares/auth');
const userController = require('../controllers/user.controller');

// Admin
router.get('/all', authenticate, authorizeRoles(['super_admin']), userController.getAllUsers);
router.put('/:id/update', authenticate, authorizeRoles(['super_admin']), restrictImpersonationActions, userController.updateUser);
router.put('/update/status', authenticate, authorizeRoles(['super_admin']), restrictImpersonationActions, userController.updateUserStatus);
router.delete('/delete', authenticate, authorizeRoles(['super_admin']), restrictImpersonationActions, userController.deleteUser);
router.delete('/teams/:teamId/users/:userId', authenticate, authorizeRoles(['super_admin']), userController.removeUserFromTeam);

module.exports = router;