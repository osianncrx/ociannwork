'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance-status.controller');
const { requireAttendanceAuth, requireAttendanceAdmin } = require('../middlewares/attendance-auth');

router.get('/dashboard', requireAttendanceAuth, requireAttendanceAdmin, controller.estadoEmpleados);
router.get('/by-date', requireAttendanceAuth, requireAttendanceAdmin, controller.estadoActual);

module.exports = router;
