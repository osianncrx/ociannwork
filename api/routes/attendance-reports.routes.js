'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance-reports.controller');
const { requireAttendanceAuth, requireAttendanceAdmin } = require('../middlewares/attendance-auth');

router.post('/admin', requireAttendanceAuth, requireAttendanceAdmin, controller.reporte);
router.post('/mine', requireAttendanceAuth, controller.reporteMio);

module.exports = router;
