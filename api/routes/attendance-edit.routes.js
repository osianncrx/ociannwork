'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance-edit.controller');
const { requireAttendanceAuth, requireApprovalRole } = require('../middlewares/attendance-auth');

router.post('/', requireAttendanceAuth, controller.editarMarca);
router.post('/approve', requireAttendanceAuth, requireApprovalRole, controller.aprobarEditarMarca);
router.post('/reject', requireAttendanceAuth, requireApprovalRole, controller.eliminarEditarMarca);
router.post('/mine', requireAttendanceAuth, controller.marcasEditadas);
router.post('/all', requireAttendanceAuth, requireApprovalRole, controller.marcasEditadasTodas);
router.post('/missing-exit', requireAttendanceAuth, controller.diasSinSalida);
router.post('/request-exit', requireAttendanceAuth, controller.solicitarSalidaFaltante);

module.exports = router;
