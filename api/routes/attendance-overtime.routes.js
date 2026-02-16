'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance-overtime.controller');
const { requireAttendanceAuth, requireApprovalRole } = require('../middlewares/attendance-auth');

router.post('/', requireAttendanceAuth, controller.horasExtras);
router.post('/mine', requireAttendanceAuth, controller.extrasUsuario);
router.post('/accepted', requireAttendanceAuth, controller.extrasRango);
router.post('/all', requireAttendanceAuth, requireApprovalRole, controller.tablaExtras);
router.post('/approve', requireAttendanceAuth, requireApprovalRole, controller.aceptarExtras);

module.exports = router;
