'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance-teams.controller');
const { requireAttendanceAuth, requireAttendanceAdmin } = require('../middlewares/attendance-auth');

router.post('/test', requireAttendanceAuth, requireAttendanceAdmin, controller.testWebhook);
router.post('/report', requireAttendanceAuth, requireAttendanceAdmin, controller.sendReport);
router.get('/logs', requireAttendanceAuth, requireAttendanceAdmin, controller.getLogs);

module.exports = router;
