'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance-holidays.controller');
const { requireAttendanceAuth } = require('../middlewares/attendance-auth');

router.post('/', requireAttendanceAuth, controller.feriados);

module.exports = router;
