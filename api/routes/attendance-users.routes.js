'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance-users.controller');
const { requireAttendanceAuth, requireAttendanceAdmin } = require('../middlewares/attendance-auth');

router.get('/', requireAttendanceAuth, requireAttendanceAdmin, controller.listUsers);
router.post('/', requireAttendanceAuth, requireAttendanceAdmin, controller.createUser);
router.put('/:id', requireAttendanceAuth, requireAttendanceAdmin, controller.updateUser);
router.get('/:id', requireAttendanceAuth, requireAttendanceAdmin, controller.getUser);
router.post('/bank-accounts', requireAttendanceAuth, controller.registerBankAccount);
router.get('/bank-accounts/list', requireAttendanceAuth, requireAttendanceAdmin, controller.listBankAccounts);

module.exports = router;
