const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate, authorizeTeamRole } = require('../middlewares/auth');
const recordingController = require('../controllers/recording.controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'recordings'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    const name = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.webm', '.mp4', '.ogg', '.wav', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for recording'), false);
    }
  },
});

router.post(
  '/upload',
  authenticate,
  authorizeTeamRole(['admin', 'member']),
  upload.single('recording'),
  recordingController.uploadRecording
);

router.get(
  '/',
  authenticate,
  authorizeTeamRole(['admin', 'member']),
  recordingController.getRecordings
);

router.get(
  '/:id',
  authenticate,
  authorizeTeamRole(['admin', 'member']),
  recordingController.getRecording
);

router.delete(
  '/:id',
  authenticate,
  authorizeTeamRole(['admin', 'member']),
  recordingController.deleteRecording
);

router.get(
  '/:id/share',
  authenticate,
  authorizeTeamRole(['admin', 'member']),
  recordingController.getShareLink
);

router.post(
  '/:id/analyze',
  authenticate,
  authorizeTeamRole(['admin', 'member']),
  recordingController.analyzeRecording
);

module.exports = router;
