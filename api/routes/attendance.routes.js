'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance.controller');
const { requireAttendanceAuth } = require('../middlewares/attendance-auth');

router.post('/', requireAttendanceAuth, controller.insertMarca);
router.post('/list', requireAttendanceAuth, controller.getMarcas);
router.post('/today', requireAttendanceAuth, controller.getMarcasHoy);
router.post('/workday', requireAttendanceAuth, controller.jornada);
router.post('/break', requireAttendanceAuth, controller.descanso);
router.post('/exit', requireAttendanceAuth, controller.salida);

module.exports = router;
