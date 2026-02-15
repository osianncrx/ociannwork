const express = require('express');
const router = express.Router();
const { restrictImpersonationActions } = require("../middlewares/impersonation");
const { authenticate, authorizeRoles } = require('../middlewares/auth');
const accountController = require('../controllers/account.controller');
const { uploadSingle } = require('../utils/upload');

router.get('/getUserDetails', authenticate, authorizeRoles(['super_admin', 'user']), accountController.getUserDetails);
router.put('/updateProfile', authenticate, authorizeRoles(['super_admin', 'user']), restrictImpersonationActions, uploadSingle('avatars', 'avatar'), accountController.updateProfile);
router.put('/updatePassword', authenticate, authorizeRoles(['super_admin', 'user']), restrictImpersonationActions, accountController.updatePassword);
router.put('/savePlayerId', authenticate, authorizeRoles(['super_admin', 'user']), accountController.savePlayerId);
router.post('/logout', authenticate, authorizeRoles(['super_admin', 'user']), accountController.logout);
router.post('/logout-all-devices', authenticate, authorizeRoles(['super_admin', 'user']), restrictImpersonationActions, accountController.logoutFromAllDevices);

module.exports = router;