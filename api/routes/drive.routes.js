const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticate, authorizeTeamRole } = require('../middlewares/auth');
const driveController = require('../controllers/drive.controller');
const { uploadFiles } = require('../utils/upload');

router.get(
  '/',
  authenticate,
  authorizeTeamRole(['admin', 'member']),
  driveController.getDrive
);

router.post(
  '/upload',
  authenticate,
  authorizeTeamRole(['admin', 'member']),
  uploadFiles('messages', 'files', 10, { useTeamFolders: true }),
  driveController.uploadFile
);

module.exports = router;
