const { Op } = require("sequelize");
const { TeamSubscription, Plan, Wallet, WalletTransaction, Team } = require("../models");
const { sequelize } = require("../models");

/**
 * Calculate prorated amount for remaining subscription period
 */
const calculateProratedAmount = (subscription, newPricePerUser, newMemberCount) => {
    const now = new Date();
    const expiryDate = new Date(subscription.expiry_date);
    const subscriptionDate = new Date(subscription.subscription_date);
    
    // Calculate total days and remaining days
    const totalDays = Math.ceil((expiryDate - subscriptionDate) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    if (remainingDays <= 0) {
        return {
            remainingDays: 0,
            totalDays,
            unusedAmount: 0,
            newPeriodAmount: 0,
            proratedCharge: 0
        };
    }
    
    // Calculate unused amount from current subscription
    const currentTotalPaid = parseFloat(subscription.amount_paid);
    const unusedAmount = (currentTotalPaid / totalDays) * remainingDays;
    
    // Calculate new subscription amount for remaining period
    const newPeriodAmount = (newPricePerUser * newMemberCount / totalDays) * remainingDays;
    
    // Calculate the difference (positive = charge, negative = refund)
    const proratedCharge = newPeriodAmount - unusedAmount;
    
    return {
        remainingDays,
        totalDays,
        unusedAmount: parseFloat(unusedAmount.toFixed(2)),
        newPeriodAmount: parseFloat(newPeriodAmount.toFixed(2)),
        proratedCharge: parseFloat(proratedCharge.toFixed(2))
    };
};

/**
 * Preview upgrade/downgrade costs
 */
exports.previewPlanChange = async (req, res) => {
    try {
        const { new_plan_id, new_member_count } = req.body;

        if (!new_plan_id || !new_member_count) {
            return res.status(400).json({
                message: "New plan ID and member count are required"
            });
        }

        // Get current active subscription
        const currentSubscription = await TeamSubscription.findOne({
            where: {
                team_id: req.team_id,
                status: 'active',
                expiry_date: { [Op.gt]: new Date() }
            },
            include: [{
                model: Plan,
                as: 'plan'
            }]
        });

        if (!currentSubscription) {
            return res.status(404).json({
                message: "No active subscription found to change"
            });
        }

        // Get new plan details
        const newPlan = await Plan.findByPk(new_plan_id);
        if (!newPlan) {
            return res.status(404).json({ message: "New plan not found" });
        }

        if (newPlan.status !== 'active') {
            return res.status(400).json({
                message: "New plan is not active"
            });
        }

        const parsedMemberCount = parseInt(new_member_count);
        if (parsedMemberCount < 1) {
            return res.status(400).json({
                message: "Member count must be at least 1"
            });
        }

        // Check if it's actually a change
        if (currentSubscription.plan_id === new_plan_id && 
            currentSubscription.member_count === parsedMemberCount) {
            return res.status(400).json({
                message: "Selected plan and member count are the same as current subscription"
            });
        }

        // Calculate new price based on current billing cycle
        let newPricePerUser;
        if (currentSubscription.billing_cycle === 'monthly') {
            newPricePerUser = parseFloat(newPlan.price_per_user_per_month);
        } else {
            newPricePerUser = parseFloat(newPlan.getYearlyPrice());
        }

        // Calculate prorated amounts
        const proration = calculateProratedAmount(
            currentSubscription,
            newPricePerUser,
            parsedMemberCount
        );

        // Get wallet balance
        const wallet = await Wallet.findOne({
            where: { team_id: req.team_id }
        });

        const currentBalance = wallet ? parseFloat(wallet.balance) : 0;
        const willHaveSufficient = proration.proratedCharge <= 0 || 
                                   currentBalance >= proration.proratedCharge;

        return res.status(200).json({
            message: "Plan change preview calculated successfully",
            data: {
                current_plan: {
                    name: currentSubscription.plan.name,
                    member_count: currentSubscription.member_count,
                    billing_cycle: currentSubscription.billing_cycle,
                    expiry_date: currentSubscription.expiry_date
                },
                new_plan: {
                    name: newPlan.name,
                    member_count: parsedMemberCount,
                    price_per_user: newPricePerUser.toFixed(2),
                    billing_cycle: currentSubscription.billing_cycle
                },
                proration: {
                    days_remaining: proration.remainingDays,
                    unused_amount: proration.unusedAmount,
                    new_period_cost: proration.newPeriodAmount,
                    charge_or_refund: proration.proratedCharge,
                    type: proration.proratedCharge > 0 ? 'charge' : 'refund'
                },
                wallet: {
                    current_balance: currentBalance.toFixed(2),
                    balance_after_change: (currentBalance - proration.proratedCharge).toFixed(2),
                    sufficient_balance: willHaveSufficient
                },
                change_type: currentSubscription.plan_id !== new_plan_id ? 
                    (newPlan.price_per_user_per_month > currentSubscription.plan.price_per_user_per_month ? 'upgrade' : 'downgrade') :
                    (parsedMemberCount > currentSubscription.member_count ? 'increase_seats' : 'decrease_seats')
            }
        });

    } catch (err) {
        console.error("Error in previewPlanChange:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Execute plan upgrade or downgrade
 */
exports.changePlan = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { new_plan_id, new_member_count } = req.body;

        if (!new_plan_id || !new_member_count) {
            await transaction.rollback();
            return res.status(400).json({
                message: "New plan ID and member count are required"
            });
        }

        // Get current active subscription with lock
        const currentSubscription = await TeamSubscription.findOne({
            where: {
                team_id: req.team_id,
                status: 'active',
                expiry_date: { [Op.gt]: new Date() }
            },
            include: [{
                model: Plan,
                as: 'plan'
            }],
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!currentSubscription) {
            await transaction.rollback();
            return res.status(404).json({
                message: "No active subscription found to change"
            });
        }

        // Get new plan details
        const newPlan = await Plan.findByPk(new_plan_id, { transaction });
        if (!newPlan) {
            await transaction.rollback();
            return res.status(404).json({ message: "New plan not found" });
        }

        if (newPlan.status !== 'active') {
            await transaction.rollback();
            return res.status(400).json({
                message: "New plan is not active"
            });
        }

        const parsedMemberCount = parseInt(new_member_count);
        if (parsedMemberCount < 1) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Member count must be at least 1"
            });
        }

        // Check if it's actually a change
        if (currentSubscription.plan_id === new_plan_id && 
            currentSubscription.member_count === parsedMemberCount) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Selected plan and member count are the same as current subscription"
            });
        }

        // Calculate new price based on current billing cycle
        let newPricePerUser;
        if (currentSubscription.billing_cycle === 'monthly') {
            newPricePerUser = parseFloat(newPlan.price_per_user_per_month);
        } else {
            newPricePerUser = parseFloat(newPlan.getYearlyPrice());
        }

        // Calculate prorated amounts
        const proration = calculateProratedAmount(
            currentSubscription,
            newPricePerUser,
            parsedMemberCount
        );

        // Get wallet with lock
        let wallet = await Wallet.findOne({
            where: { team_id: req.team_id },
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!wallet) {
            wallet = await Wallet.create({
                team_id: req.team_id,
                balance: 0.00,
                status: 'active'
            }, { transaction });
        }

        if (wallet.status !== 'active') {
            await transaction.rollback();
            return res.status(400).json({
                message: "Wallet is not active"
            });
        }

        const balanceBefore = parseFloat(wallet.balance);
        let walletTransaction = null;

        // Handle payment or refund
        if (proration.proratedCharge > 0) {
            // Upgrade/increase - charge additional amount
            if (!wallet.hasSufficientBalance(proration.proratedCharge)) {
                await transaction.rollback();
                return res.status(400).json({
                    message: "Insufficient wallet balance for upgrade",
                    required: proration.proratedCharge.toFixed(2),
                    available: balanceBefore.toFixed(2),
                    shortfall: (proration.proratedCharge - balanceBefore).toFixed(2)
                });
            }

            await wallet.deductBalance(proration.proratedCharge, transaction);

            walletTransaction = await WalletTransaction.create({
                wallet_id: wallet.id,
                transaction_type: 'debit',
                amount: proration.proratedCharge,
                balance_before: balanceBefore,
                balance_after: parseFloat(wallet.balance),
                description: `Plan change to ${newPlan.name} (${parsedMemberCount} members) - Prorated charge for ${proration.remainingDays} days`,
                reference_type: 'subscription_change',
                status: 'completed'
            }, { transaction });

        } else if (proration.proratedCharge < 0) {
            // Downgrade/decrease - refund to wallet
            const refundAmount = Math.abs(proration.proratedCharge);
            await wallet.addBalance(refundAmount, transaction);

            walletTransaction = await WalletTransaction.create({
                wallet_id: wallet.id,
                transaction_type: 'credit',
                amount: refundAmount,
                balance_before: balanceBefore,
                balance_after: parseFloat(wallet.balance),
                description: `Plan change to ${newPlan.name} (${parsedMemberCount} members) - Prorated refund for ${proration.remainingDays} days`,
                reference_type: 'subscription_change',
                status: 'completed'
            }, { transaction });
        }

        // Mark old subscription as changed
        await currentSubscription.update({
            status: 'changed',
            ended_at: new Date()
        }, { transaction });

        // Calculate new total amount for the full remaining period
        const newTotalAmount = newPricePerUser * parsedMemberCount;

        // Create new subscription with same expiry date
        const newSubscription = await TeamSubscription.create({
            team_id: req.team_id,
            plan_id: new_plan_id,
            member_count: parsedMemberCount,
            amount_paid: proration.newPeriodAmount,
            billing_cycle: currentSubscription.billing_cycle,
            subscription_date: new Date(),
            expiry_date: currentSubscription.expiry_date,
            status: 'active',
            payment_source: 'wallet',
            wallet_transaction_id: walletTransaction ? walletTransaction.id : null,
            previous_subscription_id: currentSubscription.id
        }, { transaction });

        // Update wallet transaction with subscription reference if exists
        if (walletTransaction) {
            await walletTransaction.update({
                reference_id: newSubscription.id
            }, { transaction });
        }

        await transaction.commit();

        // Fetch complete subscription with plan details
        const completeSubscription = await TeamSubscription.findByPk(newSubscription.id, {
            include: [{
                model: Plan,
                as: 'plan',
                attributes: ['id', 'name', 'slug']
            }]
        });

        const changeType = currentSubscription.plan_id !== new_plan_id ? 
            (newPlan.price_per_user_per_month > currentSubscription.plan.price_per_user_per_month ? 'upgrade' : 'downgrade') :
            (parsedMemberCount > currentSubscription.member_count ? 'increase_seats' : 'decrease_seats');

        return res.status(200).json({
            message: `Successfully ${changeType === 'upgrade' || changeType === 'increase_seats' ? 'upgraded' : 'downgraded'} subscription`,
            data: {
                change_type: changeType,
                subscription: completeSubscription,
                proration: {
                    days_remaining: proration.remainingDays,
                    amount_charged: proration.proratedCharge > 0 ? proration.proratedCharge : 0,
                    amount_refunded: proration.proratedCharge < 0 ? Math.abs(proration.proratedCharge) : 0
                },
                wallet_balance: parseFloat(wallet.balance).toFixed(2),
                previous_subscription_id: currentSubscription.id
            }
        });

    } catch (err) {
        await transaction.rollback();
        console.error("Error in changePlan:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.calculateSubscriptionCost = async (req, res) => {
    try {
        const { plan_id, member_count, billing_cycle } = req.body;

        if (!plan_id || !member_count || !billing_cycle) {
            return res.status(400).json({
                message: "Plan ID, member count, and billing cycle are required"
            });
        }

        const plan = await Plan.findByPk(plan_id);
        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        if (plan.status !== 'active') {
            return res.status(400).json({
                message: "Plan is not active"
            });
        }

        const parsedMemberCount = parseInt(member_count);
        if (parsedMemberCount < 1) {
            return res.status(400).json({
                message: "Member count must be at least 1"
            });
        }

        let pricePerUser;
        let totalAmount;
        let expiryMonths;

        if (billing_cycle === 'monthly') {
            pricePerUser = parseFloat(plan.price_per_user_per_month);
            totalAmount = pricePerUser * parsedMemberCount;
            expiryMonths = 1;
        } else if (billing_cycle === 'yearly') {
            pricePerUser = parseFloat(plan.getYearlyPrice());
            totalAmount = pricePerUser * parsedMemberCount;
            expiryMonths = 12;
        } else {
            return res.status(400).json({
                message: "Invalid billing cycle. Must be 'monthly' or 'yearly'"
            });
        }

        // Calculate expiry date
        const subscriptionDate = new Date();
        const expiryDate = new Date(subscriptionDate);
        expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

        return res.status(200).json({
            message: "Subscription cost calculated successfully",
            data: {
                plan_name: plan.name,
                member_count: parsedMemberCount,
                price_per_user: pricePerUser.toFixed(2),
                billing_cycle,
                total_amount: totalAmount.toFixed(2),
                subscription_date: subscriptionDate,
                expiry_date: expiryDate
            }
        });

    } catch (err) {
        console.error("Error in calculateSubscriptionCost:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.subscribeToPlan = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { plan_id, member_count, billing_cycle } = req.body;

        // Validate input
        if (!req.team_id || !plan_id || !member_count || !billing_cycle) {
            return res.status(400).json({
                message: "Team ID, plan ID, member count, and billing cycle are required"
            });
        }

        // Verify team exists
        const team = await Team.findByPk(req.team_id, { transaction });
        if (!team) {
            await transaction.rollback();
            return res.status(404).json({ message: "Team not found" });
        }

        // Get plan details
        const plan = await Plan.findByPk(plan_id, { transaction });
        if (!plan) {
            await transaction.rollback();
            return res.status(404).json({ message: "Plan not found" });
        }

        if (plan.status !== 'active') {
            await transaction.rollback();
            return res.status(400).json({
                message: "Plan is not active"
            });
        }

        const parsedMemberCount = parseInt(member_count);
        if (parsedMemberCount < 1) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Member count must be at least 1"
            });
        }

        // Calculate cost
        let pricePerUser;
        let totalAmount;
        let expiryMonths;

        if (billing_cycle === 'monthly') {
            pricePerUser = parseFloat(plan.price_per_user_per_month);
            totalAmount = pricePerUser * parsedMemberCount;
            expiryMonths = 1;
        } else if (billing_cycle === 'yearly') {
            pricePerUser = parseFloat(plan.getYearlyPrice());
            totalAmount = pricePerUser * parsedMemberCount;
            expiryMonths = 12;
        } else {
            await transaction.rollback();
            return res.status(400).json({
                message: "Invalid billing cycle"
            });
        }

        // Get wallet with lock
        let wallet = await Wallet.findOne({
            where: { team_id: req.team_id },
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!wallet) {
            wallet = await Wallet.create({
                team_id: req.team_id,
                balance: 0.00,
                status: 'active'
            }, { transaction });
        }

        if (wallet.status !== 'active') {
            await transaction.rollback();
            return res.status(400).json({
                message: "Wallet is not active"
            });
        }

        if (totalAmount > 0 && !wallet.hasSufficientBalance(totalAmount)) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Insufficient wallet balance",
                required: totalAmount.toFixed(2),
                available: parseFloat(wallet.balance).toFixed(2),
                shortfall: (totalAmount - parseFloat(wallet.balance)).toFixed(2)
            });
        }

        const activeSubscription = await TeamSubscription.findOne({
            where: {
                team_id: req.team_id,
                status: 'active',
                expiry_date: { [Op.gt]: new Date() }
            },
            transaction
        });

        if (activeSubscription) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Team already has an active subscription",
                data: activeSubscription
            });
        }

        // Calculate dates
        const subscriptionDate = new Date();
        const expiryDate = new Date(subscriptionDate);
        expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

        let walletTransaction = null;

        if (totalAmount > 0) {
            const balanceBefore = parseFloat(wallet.balance);

            // Deduct from wallet
            await wallet.deductBalance(totalAmount, transaction);

            // Create wallet transaction
            walletTransaction = await WalletTransaction.create({
                wallet_id: wallet.id,
                transaction_type: 'debit',
                amount: totalAmount,
                balance_before: balanceBefore,
                balance_after: parseFloat(wallet.balance),
                description: `Subscription to ${plan.name} plan for ${parsedMemberCount} members (${billing_cycle})`,
                reference_type: 'subscription',
                status: 'completed'
            }, { transaction });
        }

        // Create subscription
        const subscription = await TeamSubscription.create({
            team_id: req.team_id,
            plan_id,
            member_count: parsedMemberCount,
            amount_paid: totalAmount,
            billing_cycle,
            subscription_date: subscriptionDate,
            expiry_date: expiryDate,
            status: 'active',
            payment_source: totalAmount > 0 ? 'wallet' : 'free',
            wallet_transaction_id: walletTransaction ? walletTransaction.id : null
        }, { transaction });

            // Update wallet transaction with subscription reference if transaction exists
        if (walletTransaction) {
            await walletTransaction.update({
                reference_id: subscription.id
            }, { transaction });
        }

        await transaction.commit();

        // Fetch complete subscription with plan details
        const completeSubscription = await TeamSubscription.findByPk(subscription.id, {
            include: [{
                model: Plan,
                as: 'plan',
                attributes: ['id', 'name', 'slug']
            }]
        });

        return res.status(201).json({
            message: "Successfully subscribed to plan",
            data: {
                subscription: completeSubscription,
                wallet_balance: parseFloat(wallet.balance),
                amount_deducted: totalAmount
            }
        });

    } catch (err) {
        await transaction.rollback();
        console.error("Error in subscribeToPlan:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.getCurrentSubscription = async (req, res) => {
    try {

        const subscription = await TeamSubscription.findOne({
            where: {
                team_id: req.team_id,
                status: 'active',
                expiry_date: { [Op.gt]: new Date() }
            },
            include: [{
                model: Plan,
                as: 'plan'
            }],
            order: [['created_at', 'DESC']]
        });

        if (!subscription) {
            return res.status(404).json({
                message: "No active subscription found"
            });
        }

        const daysRemaining = subscription.daysRemaining();

        return res.status(200).json({
            message: "Current subscription retrieved successfully",
            data: {
                subscription,
                days_remaining: daysRemaining,
                is_active: subscription.isActive()
            }
        });

    } catch (err) {
        console.error("Error in getCurrentSubscription:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Admin: fetch current subscription for the team provided via X-Team-ID header (req.team_id)
exports.getTeamCurrentSubscription = async (req, res) => {
    try {
        const teamId = req.team_id;

        if (!teamId) {
            return res.status(400).json({
                message: "Team ID is required"
            });
        }

        const team = await Team.findByPk(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        const subscription = await TeamSubscription.findOne({
            where: {
                team_id: teamId,
                status: 'active',
                expiry_date: { [Op.gt]: new Date() }
            },
            include: [{
                model: Plan,
                as: 'plan'
            }],
            order: [['created_at', 'DESC']]
        });

        if (!subscription) {
            return res.status(404).json({
                message: "No active subscription found for this team"
            });
        }

        const daysRemaining = subscription.daysRemaining();

        return res.status(200).json({
            message: "Team subscription retrieved successfully",
            data: {
                subscription,
                days_remaining: daysRemaining,
                is_active: subscription.isActive()
            }
        });

    } catch (err) {
        console.error("Error in getTeamCurrentSubscription:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.getSubscriptionHistory = async (req, res) => {
    try {
        const {
          page = 1,
          limit = 20,
          status
        } = req.query;

        const whereClause = { team_id: req.team_id };

        if (status) {
            whereClause.status = status;
        }

        const offset = (page - 1) * limit;
        const total = await TeamSubscription.count({ where: whereClause });

        const subscriptions = await TeamSubscription.findAll({
            where: whereClause,
            include: [{
                model: Plan,
                as: 'plan',
                attributes: ['id', 'name', 'slug']
            }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return res.status(200).json({
            message: "Subscription history retrieved successfully",
            subscriptions,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        });

    } catch (err) {
        console.error("Error in getSubscriptionHistory:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.cancelSubscription = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify team_id is available
        if (!req.team_id) {
            return res.status(400).json({ message: "Team ID is required" });
        }

        const subscription = await TeamSubscription.findByPk(id);

        if (!subscription) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        // Security check: Ensure subscription belongs to the team
        if (subscription.team_id != req.team_id) {
            return res.status(403).json({ 
                message: "You don't have permission to cancel this subscription" 
            });
        }

        if (subscription.status !== 'active') {
            return res.status(400).json({
                message: "Subscription is not active"
            });
        }

        await subscription.update({ status: 'cancelled' });

        return res.status(200).json({
            message: "Subscription cancelled successfully",
            data: subscription
        });

    } catch (err) {
        console.error("Error in cancelSubscription:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};