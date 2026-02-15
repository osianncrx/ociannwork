const cron = require('node-cron');
const { TeamSubscription, Plan, Wallet, WalletTransaction } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');

/**
 * Get or create the basic plan for downgrade purposes.
 * The basic plan is identified by slug 'basic' and is the default free plan.
 */
async function getBasicPlan() {
    // First try to find the basic plan by slug
    let basicPlan = await Plan.findOne({
        where: { slug: 'basic', status: 'active' }
    });

    if (basicPlan) {
        return basicPlan;
    }

    // If basic plan doesn't exist, try to find any default plan
    basicPlan = await Plan.findOne({
        where: { is_default: true, status: 'active' }
    });

    if (basicPlan) {
        return basicPlan;
    }

    // If no default plan exists, create the basic plan
    console.log('Basic plan not found, creating one...');
    
    basicPlan = await Plan.create({
        name: 'Basic',
        slug: 'basic',
        description: 'Free basic plan with essential features for small teams.',
        price_per_user_per_month: 0.00,
        price_per_user_per_year: 0.00,
        billing_cycle: 'both',
        max_members: 5,
        max_storage_mb: 1000,
        max_message_search_limit: 5000,
        max_channels: 10,
        allows_private_channels: true,
        allows_file_sharing: true,
        allows_video_calls: false,
        allows_team_analytics: false,
        features: {
            message_history: 'limited',
            support: 'community',
            integrations: false,
            custom_branding: false
        },
        display_order: 0,
        is_default: true,
        trial_period_days: 0,
        status: 'active'
    });

    console.log('Basic plan created successfully');
    return basicPlan;
}

/**
 * Calculate the renewal cost for a subscription based on plan and member count.
 */
function calculateRenewalCost(plan, memberCount, billingCycle) {
    let pricePerUser;
    
    if (billingCycle === 'yearly') {
        // Use yearly price if available, otherwise calculate from monthly
        pricePerUser = plan.price_per_user_per_year 
            ? parseFloat(plan.price_per_user_per_year)
            : parseFloat(plan.price_per_user_per_month) * 12 * 0.8; // 20% discount for yearly
    } else {
        pricePerUser = parseFloat(plan.price_per_user_per_month);
    }
    
    return pricePerUser * memberCount;
}

/**
 * Attempt to auto-renew a subscription using wallet balance.
 * Returns true if renewal was successful, false if insufficient balance.
 */
async function attemptAutoRenewal(subscription, plan, transaction, io) {
    const teamId = subscription.team_id;
    const memberCount = subscription.member_count;
    const billingCycle = subscription.billing_cycle;
    
    // Calculate renewal cost
    const renewalCost = calculateRenewalCost(plan, memberCount, billingCycle);
    
    // If it's a free plan, no payment needed
    if (renewalCost <= 0) {
        return { success: true, isFree: true };
    }
    
    // Get wallet for the team
    let wallet = await Wallet.findOne({
        where: { team_id: teamId },
        lock: transaction.LOCK.UPDATE,
        transaction
    });
    
    // If no wallet exists, cannot auto-renew
    if (!wallet) {
        console.log(`Team ${teamId}: No wallet found, cannot auto-renew`);
        return { success: false, reason: 'no_wallet', required: renewalCost, available: 0 };
    }
    
    // Check if wallet is active
    if (wallet.status !== 'active') {
        console.log(`Team ${teamId}: Wallet is ${wallet.status}, cannot auto-renew`);
        return { success: false, reason: 'wallet_inactive', required: renewalCost, available: parseFloat(wallet.balance) };
    }
    
    const currentBalance = parseFloat(wallet.balance);
    
    // Check if wallet has sufficient balance
    if (!wallet.hasSufficientBalance(renewalCost)) {
        console.log(`Team ${teamId}: Insufficient balance. Required: ${renewalCost}, Available: ${currentBalance}`);
        return { 
            success: false, 
            reason: 'insufficient_balance', 
            required: renewalCost, 
            available: currentBalance,
            shortfall: renewalCost - currentBalance
        };
    }
    
    // Deduct from wallet
    const balanceBefore = currentBalance;
    await wallet.deductBalance(renewalCost, transaction);
    
    // Calculate new expiry date
    const subscriptionDate = new Date();
    const expiryDate = new Date(subscriptionDate);
    if (billingCycle === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
    }
    
    // Create wallet transaction
    const walletTransaction = await WalletTransaction.create({
        wallet_id: wallet.id,
        transaction_type: 'debit',
        amount: renewalCost,
        balance_before: balanceBefore,
        balance_after: parseFloat(wallet.balance),
        description: `Auto-renewal of ${plan.name} plan for ${memberCount} members (${billingCycle})`,
        reference_type: 'subscription',
        status: 'completed',
        metadata: {
            auto_renewal: true,
            previous_subscription_id: subscription.id
        }
    }, { transaction });
    
    // Mark old subscription as expired
    await subscription.update({
        status: 'expired'
    }, { transaction });
    
    // Create new subscription
    const newSubscription = await TeamSubscription.create({
        team_id: teamId,
        plan_id: plan.id,
        member_count: memberCount,
        amount_paid: renewalCost,
        billing_cycle: billingCycle,
        subscription_date: subscriptionDate,
        expiry_date: expiryDate,
        status: 'active',
        payment_source: 'wallet',
        wallet_transaction_id: walletTransaction.id,
        notes: `Auto-renewed from subscription ID ${subscription.id}`
    }, { transaction });
    
    // Update wallet transaction with subscription reference
    await walletTransaction.update({
        reference_id: newSubscription.id
    }, { transaction });
    
    console.log(`Team ${teamId}: Auto-renewed ${plan.name} plan. Deducted ${renewalCost}. New expiry: ${expiryDate}`);
    
    // Emit socket event to notify team about successful renewal
    if (io) {
        io.to(`team_${teamId}`).emit("subscription_renewed", {
            teamId: teamId,
            planId: plan.id,
            planName: plan.name,
            memberCount: memberCount,
            amountDeducted: renewalCost,
            newBalance: parseFloat(wallet.balance),
            expiryDate: expiryDate,
            message: `Your ${plan.name} subscription has been auto-renewed successfully.`
        });
    }
    
    return { 
        success: true, 
        isFree: false,
        newSubscriptionId: newSubscription.id,
        amountDeducted: renewalCost,
        newBalance: parseFloat(wallet.balance)
    };
}

/**
 * Downgrade a team to the basic plan.
 */
async function downgradeToBasicPlan(subscription, basicPlan, reason, transaction, io) {
    const teamId = subscription.team_id;
    const now = new Date();
    
    // Mark the current subscription as expired
    await subscription.update({
        status: 'expired'
    }, { transaction });
    
    // Check if team already has an active basic plan subscription
    const existingBasicSubscription = await TeamSubscription.findOne({
        where: {
            team_id: teamId,
            plan_id: basicPlan.id,
            status: 'active',
            expiry_date: { [Op.gt]: now }
        },
        transaction
    });
    
    if (existingBasicSubscription) {
        console.log(`Team ${teamId}: Already has active basic plan`);
        return existingBasicSubscription;
    }
    
    // Create a new subscription on the basic plan
    const subscriptionDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 100); // Set far future expiry for free plan
    
    const newSubscription = await TeamSubscription.create({
        team_id: teamId,
        plan_id: basicPlan.id,
        member_count: subscription.member_count, // Keep the same member count
        amount_paid: 0.00, // Free plan
        billing_cycle: 'monthly',
        subscription_date: subscriptionDate,
        expiry_date: expiryDate,
        status: 'active',
        payment_source: 'wallet',
        notes: `Auto-downgraded from plan ID ${subscription.plan_id}. Reason: ${reason}`
    }, { transaction });
    
    console.log(`Team ${teamId}: Downgraded to basic plan (subscription ${newSubscription.id}). Reason: ${reason}`);
    
    // Emit socket event to notify the team about the downgrade
    if (io) {
        io.to(`team_${teamId}`).emit("subscription_downgraded", {
            teamId: teamId,
            previousPlanId: subscription.plan_id,
            newPlanId: basicPlan.id,
            newPlanName: basicPlan.name,
            reason: reason,
            message: `Your subscription has expired and you have been downgraded to the Basic plan. Reason: ${reason}`
        });
    }
    
    return newSubscription;
}

/**
 * Expire subscriptions, attempt auto-renewal via wallet, and downgrade to basic if insufficient balance.
 * This runs periodically to:
 * 1. Find all active subscriptions that have expired
 * 2. Try to auto-renew using wallet balance
 * 3. If insufficient balance, downgrade to basic plan
 */
async function expireAndDowngradeSubscriptions(io) {
    const now = new Date();

    try {
        // Find all expired active subscriptions with their plan details
        const expiredSubscriptions = await TeamSubscription.findAll({
            where: {
                status: 'active',
                expiry_date: { [Op.lte]: now }
            },
            include: [{
                model: Plan,
                as: 'plan'
            }]
        });

        if (expiredSubscriptions.length === 0) {
            return;
        }

        console.log(`Found ${expiredSubscriptions.length} expired subscription(s) to process`);

        // Get the basic plan for potential downgrade
        const basicPlan = await getBasicPlan();

        if (!basicPlan) {
            console.error('Could not get or create basic plan for downgrade');
            return;
        }

        for (const subscription of expiredSubscriptions) {
            // Use separate transaction for each subscription to avoid one failure affecting others
            const transaction = await sequelize.transaction();
            
            try {
                const plan = subscription.plan;
                
                // Check if the subscription is already on basic plan - just renew indefinitely
                if (subscription.plan_id === basicPlan.id) {
                    const newExpiryDate = new Date();
                    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 100);

                    await subscription.update({
                        expiry_date: newExpiryDate
                    }, { transaction });

                    await transaction.commit();
                    console.log(`Renewed basic plan subscription for team ${subscription.team_id}`);
                    continue;
                }
                
                // Check if the plan is still active
                if (!plan || plan.status !== 'active') {
                    // Plan is inactive or deleted, downgrade to basic
                    await downgradeToBasicPlan(
                        subscription, 
                        basicPlan, 
                        'Previous plan is no longer available', 
                        transaction, 
                        io
                    );
                    await transaction.commit();
                    continue;
                }
                
                // Attempt auto-renewal via wallet
                const renewalResult = await attemptAutoRenewal(subscription, plan, transaction, io);
                
                if (renewalResult.success) {
                    await transaction.commit();
                    
                    if (renewalResult.isFree) {
                        console.log(`Team ${subscription.team_id}: Free plan renewed`);
                    } else {
                        console.log(`Team ${subscription.team_id}: Successfully auto-renewed`);
                    }
                    continue;
                }
                
                // Auto-renewal failed, downgrade to basic plan
                let downgradeReason;
                switch (renewalResult.reason) {
                    case 'no_wallet':
                        downgradeReason = 'No wallet found for auto-renewal';
                        break;
                    case 'wallet_inactive':
                        downgradeReason = 'Wallet is not active';
                        break;
                    case 'insufficient_balance':
                        downgradeReason = `Insufficient wallet balance. Required: $${renewalResult.required.toFixed(2)}, Available: $${renewalResult.available.toFixed(2)}`;
                        break;
                    default:
                        downgradeReason = 'Auto-renewal failed';
                }
                
                await downgradeToBasicPlan(subscription, basicPlan, downgradeReason, transaction, io);
                await transaction.commit();

            } catch (subError) {
                await transaction.rollback();
                console.error(`Error processing subscription ${subscription.id}:`, subError);
                // Continue with other subscriptions
            }
        }

        console.log(`Finished processing ${expiredSubscriptions.length} expired subscription(s)`);

    } catch (error) {
        console.error('Error in expireAndDowngradeSubscriptions:', error);
    }
}

module.exports = (io) => {
    // Subscription expiration cron - runs every hour
    cron.schedule('0 * * * *', async () => {
        console.log('Running subscription expiration check...');
        await expireAndDowngradeSubscriptions(io);
    });

    // Also run immediately on startup after a short delay
    setTimeout(async () => {
        console.log('Running initial subscription expiration check...');
        await expireAndDowngradeSubscriptions(io);
    }, 10000); // 10 seconds after startup
};
