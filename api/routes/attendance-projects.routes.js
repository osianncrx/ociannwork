'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance-projects.controller');
const { requireAttendanceAuth, requireAttendanceAdmin } = require('../middlewares/attendance-auth');

router.get('/', requireAttendanceAuth, controller.listProyectos);
router.post('/', requireAttendanceAuth, requireAttendanceAdmin, controller.createProyecto);
router.put('/:id', requireAttendanceAuth, requireAttendanceAdmin, controller.updateProyecto);
router.delete('/:id', requireAttendanceAuth, requireAttendanceAdmin, controller.deleteProyecto);
router.post('/marks', requireAttendanceAuth, controller.insertMarcaProyecto);
router.post('/threshold', requireAttendanceAuth, controller.verificarHorasProyectos);

module.exports = router;
