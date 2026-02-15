const express = require('express');
const router = express.Router();
const { authenticate, authorizeTeamRole } = require('../middlewares/auth');
const subscriptionController = require('../controllers/subscription.controller');

router.post('/preview-change', authenticate, authorizeTeamRole(['admin']), subscriptionController.previewPlanChange);
router.post('/change', authenticate, authorizeTeamRole(['admin']), subscriptionController.changePlan);

// Calculate subscription cost
router.post('/calculate', authenticate, authorizeTeamRole(['admin']), subscriptionController.calculateSubscriptionCost);

// Subscribe to a plan
router.post('/subscribe', authenticate, authorizeTeamRole(['admin']), subscriptionController.subscribeToPlan);

// Get current active subscription (must come before /:id routes)
router.get('/current', authenticate, authorizeTeamRole(['admin', 'member']), subscriptionController.getCurrentSubscription);
router.get('/team/current', authenticate, authorizeTeamRole(['admin', 'member']), subscriptionController.getTeamCurrentSubscription);

// Get subscription history with pagination
router.get('/history', authenticate, authorizeTeamRole(['admin']), subscriptionController.getSubscriptionHistory);

// Cancel a subscription by ID
router.put('/:id/cancel', authenticate, authorizeTeamRole(['admin']), subscriptionController.cancelSubscription);

module.exports = router;