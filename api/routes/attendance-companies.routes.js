'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance-companies.controller');
const { requireAttendanceAuth, requireAttendanceAdmin, requireSuperAdminMarcas } = require('../middlewares/attendance-auth');

router.get('/', requireAttendanceAuth, requireAttendanceAdmin, controller.listCompanies);
router.post('/', requireAttendanceAuth, requireSuperAdminMarcas, controller.createCompany);
router.put('/:id', requireAttendanceAuth, requireAttendanceAdmin, controller.updateCompany);
router.get('/:id/stats', requireAttendanceAuth, requireAttendanceAdmin, controller.companyStats);

module.exports = router;
