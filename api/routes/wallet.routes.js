const express = require('express');
const router = express.Router();
const { authenticate, authorizeTeamRole } = require('../middlewares/auth');
const walletController = require('../controllers/wallet.controller');

router.get('/', authenticate, authorizeTeamRole(['admin']), walletController.getWallet);
router.get('/balance', authenticate, authorizeTeamRole(['admin']), walletController.getWalletBalance);
router.get('/transactions', authenticate, authorizeTeamRole(['admin']), walletController.getWalletTransactions);

module.exports = router;