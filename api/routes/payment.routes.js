const express = require('express');
const router = express.Router();
const { authenticate, authorizeTeamRole } = require('../middlewares/auth');
const paymentController = require('../controllers/payment.controller');

router.post('/initiate', authenticate, authorizeTeamRole(['admin']), paymentController.initiatePayment);
router.post('/verify', authenticate, authorizeTeamRole(['admin']), paymentController.verifyPayment);
router.get('/teams', authenticate, authorizeTeamRole(['admin']), paymentController.getPaymentHistory);

module.exports = router;