const express = require('express');
const router = express.Router();
const { authenticate, authorizeTeamRole } = require('../middlewares/auth');
const reminderController = require('../controllers/reminder.controller');

router.get('/', authenticate, authorizeTeamRole(['admin', 'member']), reminderController.getReminders);
router.post('/set', authenticate, authorizeTeamRole(['admin', 'member']), reminderController.setReminder);
router.put('/edit/:id', authenticate, authorizeTeamRole(['admin', 'member']), reminderController.editReminder);
router.delete('/delete/:id', authenticate, authorizeTeamRole(['admin', 'member']), reminderController.deleteReminder);
router.post('/cancel', authenticate, authorizeTeamRole(['admin', 'member']), reminderController.cancelReminder);

module.exports = router;