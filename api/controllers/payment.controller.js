const { Op } = require("sequelize");
const { Payment, Wallet, WalletTransaction, Team } = require("../models");
const { sequelize } = require("../models");
const crypto = require('crypto');

// Conditionally initialize payment gateways only if API keys are present
let stripe = null;
let paypalClient = null;
let razorpayInstance = null;

// Initialize Stripe if keys are available
if (process.env.STRIPE_SECRET_KEY) {
    try {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    } catch (error) {
        console.warn('Stripe initialization failed:', error.message);
    }
}

// Initialize PayPal if keys are available
if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    try {
        const paypal = require('@paypal/checkout-server-sdk');
        const paypalEnvironment = process.env.PAYPAL_MODE === 'live'
            ? new paypal.core.LiveEnvironment(
                process.env.PAYPAL_CLIENT_ID,
                process.env.PAYPAL_CLIENT_SECRET
            )
            : new paypal.core.SandboxEnvironment(
                process.env.PAYPAL_CLIENT_ID,
                process.env.PAYPAL_CLIENT_SECRET
            );
        paypalClient = new paypal.core.PayPalHttpClient(paypalEnvironment);
    } catch (error) {
        console.warn('PayPal initialization failed:', error.message);
    }
}

// Initialize Razorpay if keys are available
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
        const Razorpay = require('razorpay');
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    } catch (error) {
        console.warn('Razorpay initialization failed:', error.message);
    }
}

// Helper function to check if a payment gateway is configured
function isGatewayConfigured(gateway) {
    switch (gateway.toLowerCase()) {
        case 'stripe':
            return stripe !== null && process.env.STRIPE_SECRET_KEY;
        case 'paypal':
            return paypalClient !== null && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;
        case 'razorpay':
            return razorpayInstance !== null && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
        default:
            return false;
    }
}

// Get available payment gateways
function getAvailableGateways() {
    const gateways = [];
    if (isGatewayConfigured('stripe')) gateways.push('stripe');
    if (isGatewayConfigured('paypal')) gateways.push('paypal');
    if (isGatewayConfigured('razorpay')) gateways.push('razorpay');
    return gateways;
}

// ==================== INITIATE PAYMENT ====================
exports.initiatePayment = async (req, res) => {
    try {
        const { amount, payment_gateway, payment_method, currency = 'USD' } = req.body;

        // Validate input
        if (!amount || !payment_gateway) {
            return res.status(400).json({
                success: false,
                message: "Amount and payment gateway are required"
            });
        }

        const parsedAmount = parseFloat(amount);
        if (parsedAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0"
            });
        }

        // Validate payment gateway
        const validGateways = ['stripe', 'paypal', 'razorpay'];
        if (!validGateways.includes(payment_gateway.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment gateway. Must be one of: stripe, paypal, razorpay"
            });
        }

        // Check if the requested gateway is configured
        if (!isGatewayConfigured(payment_gateway)) {
            const availableGateways = getAvailableGateways();
            return res.status(400).json({
                success: false,
                message: `${payment_gateway} is not configured. Available gateways: ${availableGateways.length > 0 ? availableGateways.join(', ') : 'none'}`,
                available_gateways: availableGateways
            });
        }

        // Verify team exists
        const team = await Team.findByPk(req.team_id);
        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Team not found"
            });
        }

        // Get or create wallet
        let wallet = await Wallet.findOne({ where: { team_id: req.team_id } });
        if (!wallet) {
            wallet = await Wallet.create({
                team_id: req.team_id,
                balance: 0.00,
                currency: currency,
                status: 'active'
            });
        }

        if (wallet.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: "Wallet is not active"
            });
        }

        // Create payment record
        const payment = await Payment.create({
            team_id: req.team_id,
            wallet_id: wallet.id,
            amount: parsedAmount,
            currency: currency,
            payment_gateway: payment_gateway.toLowerCase(),
            payment_method,
            status: 'pending'
        });

        let paymentData = {
            payment_id: payment.id,
            amount: parsedAmount,
            currency: currency,
            payment_gateway: payment_gateway.toLowerCase()
        };

        // Gateway-specific initialization
        try {
            switch (payment_gateway.toLowerCase()) {
                case 'stripe':
                    paymentData = await initializeStripePayment(payment, parsedAmount, currency);
                    break;

                case 'paypal':
                    paymentData = await initializePayPalPayment(payment, parsedAmount, currency);
                    break;

                case 'razorpay':
                    paymentData = await initializeRazorpayPayment(payment, parsedAmount, currency, team);
                    break;

                default:
                    throw new Error("Unsupported payment gateway");
            }

            // Update payment with gateway details
            await payment.update({
                gateway_order_id: paymentData.gateway_order_id || paymentData.order_id
            });

            return res.status(201).json({
                success: true,
                message: "Payment initiated successfully",
                data: paymentData
            });

        } catch (gatewayError) {
            // Update payment status to failed
            await payment.update({
                status: 'failed',
                failure_reason: gatewayError.message
            });

            console.error(`${payment_gateway} initialization error:`, gatewayError);
            return res.status(500).json({
                success: false,
                message: `Failed to initialize payment with ${payment_gateway}`,
                error: gatewayError.message
            });
        }

    } catch (err) {
        console.error("Error in initiatePayment:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// ==================== STRIPE INITIALIZATION ====================
async function initializeStripePayment(payment, amount, currency) {
    if (!stripe) {
        throw new Error("Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.");
    }

    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses smallest currency unit
        currency: currency.toLowerCase(),
        metadata: {
            payment_id: payment.id.toString(),
            team_id: payment.team_id.toString()
        },
        automatic_payment_methods: {
            enabled: true,
        }
    });

    return {
        payment_id: payment.id,
        amount: amount,
        currency: currency,
        payment_gateway: 'stripe',
        client_secret: paymentIntent.client_secret,
        publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
        gateway_order_id: paymentIntent.id
    };
}

// ==================== PAYPAL INITIALIZATION ====================
async function initializePayPalPayment(payment, amount, currency) {
    if (!paypalClient) {
        throw new Error("PayPal is not configured. Please add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to environment variables.");
    }

    const paypal = require('@paypal/checkout-server-sdk');
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
            amount: {
                currency_code: currency,
                value: amount.toFixed(2)
            },
            reference_id: payment.id.toString(),
            description: `Wallet Recharge - Payment ID: ${payment.id}`
        }],
        application_context: {
            brand_name: process.env.APP_NAME || 'Your App Name',
            landing_page: 'BILLING',
            user_action: 'PAY_NOW',
            return_url: `${process.env.FRONTEND_URL}/admin/payment/success`,
            cancel_url: `${process.env.FRONTEND_URL}/admin/payment/cancel`
        }
    });

    const order = await paypalClient.execute(request);
    const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;

    return {
        payment_id: payment.id,
        amount: amount,
        currency: currency,
        payment_gateway: 'paypal',
        order_id: order.result.id,
        approval_url: approvalUrl,
        gateway_order_id: order.result.id
    };
}

// ==================== RAZORPAY INITIALIZATION ====================
async function initializeRazorpayPayment(payment, amount, currency, team) {
    if (!razorpayInstance) {
        throw new Error("Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment variables.");
    }

    const options = {
        amount: Math.round(amount * 100), // Razorpay uses smallest currency unit
        currency: currency,
        receipt: `payment_${payment.id}`,
        notes: {
            payment_id: payment.id.toString(),
            team_id: payment.team_id.toString(),
            team_name: team.name || ''
        }
    };

    const order = await razorpayInstance.orders.create(options);

    return {
        payment_id: payment.id,
        amount: amount,
        currency: currency,
        payment_gateway: 'razorpay',
        order_id: order.id,
        key_id: process.env.RAZORPAY_KEY_ID,
        gateway_order_id: order.id
    };
}

// ==================== VERIFY PAYMENT ====================
exports.verifyPayment = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { payment_id, gateway_payment_id, gateway_response, payment_gateway } = req.body;

        if (!payment_id) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: "Payment ID is required"
            });
        }

        const payment = await Payment.findByPk(payment_id, {
            include: [{
                model: Wallet,
                as: 'wallet'
            }],
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!payment) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        if (payment.status !== 'pending') {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Payment already processed with status: ${payment.status}`
            });
        }

        // Check if the gateway is configured
        if (!isGatewayConfigured(payment.payment_gateway)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `${payment.payment_gateway} is not configured`
            });
        }

        // Verify payment with respective gateway
        let verificationResult;
        try {
            switch (payment.payment_gateway) {
                case 'stripe':
                    verificationResult = await verifyStripePayment(gateway_payment_id, gateway_response);
                    break;

                case 'paypal':
                    verificationResult = await verifyPayPalPayment(gateway_payment_id, gateway_response);
                    break;

                case 'razorpay':
                    verificationResult = await verifyRazorpayPayment(payment, gateway_response);
                    break;

                default:
                    throw new Error("Unsupported payment gateway");
            }

            if (!verificationResult.success) {
                await payment.update({
                    status: 'failed',
                    failure_reason: verificationResult.message,
                    gateway_response: JSON.stringify(gateway_response)
                }, { transaction });

                await transaction.commit();

                return res.status(400).json({
                    success: false,
                    message: verificationResult.message
                });
            }

            // Update payment status
            await payment.update({
                status: 'completed',
                gateway_payment_id: verificationResult.transaction_id,
                gateway_response: JSON.stringify(gateway_response),
                completed_at: new Date()
            }, { transaction });

            // Get wallet with lock
            const wallet = await Wallet.findByPk(payment.wallet_id, {
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            if (!wallet) {
                throw new Error("Wallet not found");
            }

            const balanceBefore = parseFloat(wallet.balance);
            const newBalance = balanceBefore + parseFloat(payment.amount);

            // Update wallet balance
            await wallet.update({
                balance: newBalance,
                updated_at: new Date()
            }, { transaction });

            // Create wallet transaction
            const walletTransaction = await WalletTransaction.create({
                wallet_id: wallet.id,
                transaction_type: 'credit',
                amount: payment.amount,
                balance_before: balanceBefore,
                balance_after: newBalance,
                description: `Wallet recharge via ${payment.payment_gateway}`,
                reference_type: 'payment',
                reference_id: payment.id,
                payment_gateway: payment.payment_gateway,
                gateway_transaction_id: verificationResult.transaction_id,
                status: 'completed'
            }, { transaction });

            // Link wallet transaction to payment
            await payment.update({
                wallet_transaction_id: walletTransaction.id
            }, { transaction });

            await transaction.commit();

            return res.status(200).json({
                success: true,
                message: "Payment verified and wallet credited successfully",
                data: {
                    payment: {
                        id: payment.id,
                        amount: payment.amount,
                        currency: payment.currency,
                        status: payment.status,
                        payment_gateway: payment.payment_gateway
                    },
                    wallet_balance: newBalance,
                    transaction: walletTransaction
                }
            });

        } catch (verificationError) {
            await payment.update({
                status: 'failed',
                failure_reason: verificationError.message,
                gateway_response: JSON.stringify(gateway_response)
            }, { transaction });

            await transaction.commit();

            return res.status(400).json({
                success: false,
                message: "Payment verification failed",
                error: verificationError.message
            });
        }

    } catch (err) {
        await transaction.rollback();
        console.error("Error in verifyPayment:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// ==================== STRIPE VERIFICATION ====================
async function verifyStripePayment(paymentIntentId, gatewayResponse) {
    if (!stripe) {
        return {
            success: false,
            message: "Stripe is not configured"
        };
    }

    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            return {
                success: true,
                transaction_id: paymentIntent.id,
                amount: paymentIntent.amount / 100
            };
        }

        return {
            success: false,
            message: `Payment failed with status: ${paymentIntent.status}`
        };
    } catch (error) {
        console.error("Stripe verification error:", error);
        return {
            success: false,
            message: error.message
        };
    }
}

// ==================== PAYPAL VERIFICATION ====================
async function verifyPayPalPayment(orderId, gatewayResponse) {
    if (!paypalClient) {
        return {
            success: false,
            message: "PayPal is not configured"
        };
    }

    try {
        const paypal = require('@paypal/checkout-server-sdk');
        const request = new paypal.orders.OrdersCaptureRequest(orderId);
        request.requestBody({});

        const capture = await paypalClient.execute(request);

        if (capture.result.status === 'COMPLETED') {
            const captureId = capture.result.purchase_units[0].payments.captures[0].id;
            return {
                success: true,
                transaction_id: captureId,
                amount: parseFloat(capture.result.purchase_units[0].payments.captures[0].amount.value)
            };
        }

        return {
            success: false,
            message: `Payment failed with status: ${capture.result.status}`
        };
    } catch (error) {
        console.error("PayPal verification error:", error);
        return {
            success: false,
            message: error.message
        };
    }
}

// ==================== RAZORPAY VERIFICATION ====================
async function verifyRazorpayPayment(payment, gatewayResponse) {
    if (!razorpayInstance) {
        return {
            success: false,
            message: "Razorpay is not configured"
        };
    }

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = gatewayResponse;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return {
                success: false,
                message: "Missing required Razorpay parameters"
            };
        }

        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return {
                success: false,
                message: "Invalid payment signature"
            };
        }

        // Fetch payment details from Razorpay
        const razorpayPayment = await razorpayInstance.payments.fetch(razorpay_payment_id);

        if (razorpayPayment.status === 'captured') {
            return {
                success: true,
                transaction_id: razorpay_payment_id,
                amount: razorpayPayment.amount / 100
            };
        }

        return {
            success: false,
            message: `Payment failed with status: ${razorpayPayment.status}`
        };
    } catch (error) {
        console.error("Razorpay verification error:", error);
        return {
            success: false,
            message: error.message
        };
    }
}

// ==================== WEBHOOK HANDLERS ====================

// Stripe Webhook
exports.stripeWebhook = async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(400).json({
            error: 'Stripe webhook is not configured'
        });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            await handleStripePaymentSuccess(paymentIntent);
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            await handleStripePaymentFailure(failedPayment);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
};

// PayPal Webhook
exports.paypalWebhook = async (req, res) => {
    if (!paypalClient) {
        return res.status(400).json({
            error: 'PayPal webhook is not configured'
        });
    }

    try {
        // Verify webhook signature
        const webhookEvent = req.body;

        if (webhookEvent.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
            await handlePayPalPaymentSuccess(webhookEvent);
        } else if (webhookEvent.event_type === 'PAYMENT.CAPTURE.DENIED') {
            await handlePayPalPaymentFailure(webhookEvent);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('PayPal webhook error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Razorpay Webhook
exports.razorpayWebhook = async (req, res) => {
    if (!razorpayInstance || !process.env.RAZORPAY_WEBHOOK_SECRET) {
        return res.status(400).json({
            error: 'Razorpay webhook is not configured'
        });
    }

    try {
        const webhookSignature = req.headers['x-razorpay-signature'];
        const webhookBody = JSON.stringify(req.body);

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(webhookBody)
            .digest('hex');

        if (webhookSignature !== expectedSignature) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = req.body.event;
        const payload = req.body.payload.payment.entity;

        if (event === 'payment.captured') {
            await handleRazorpayPaymentSuccess(payload);
        } else if (event === 'payment.failed') {
            await handleRazorpayPaymentFailure(payload);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Razorpay webhook error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ==================== WEBHOOK HANDLERS ====================

// Stripe Success Handler
async function handleStripePaymentSuccess(paymentIntent) {
    const transaction = await sequelize.transaction();

    try {
        const paymentId = paymentIntent.metadata.payment_id;

        if (!paymentId) {
            console.error('Payment ID not found in Stripe webhook metadata');
            await transaction.rollback();
            return;
        }

        const payment = await Payment.findByPk(paymentId, {
            include: [{
                model: Wallet,
                as: 'wallet'
            }],
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!payment) {
            console.error(`Payment ${paymentId} not found for Stripe webhook`);
            await transaction.rollback();
            return;
        }

        // If already processed, skip
        if (payment.status === 'completed') {
            console.log(`Payment ${paymentId} already completed, skipping webhook`);
            await transaction.commit();
            return;
        }

        // Update payment status
        await payment.update({
            status: 'completed',
            gateway_payment_id: paymentIntent.id,
            gateway_response: JSON.stringify(paymentIntent),
            completed_at: new Date()
        }, { transaction });

        // Get wallet with lock
        const wallet = await Wallet.findByPk(payment.wallet_id, {
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!wallet) {
            throw new Error("Wallet not found");
        }

        const balanceBefore = parseFloat(wallet.balance);
        const newBalance = balanceBefore + parseFloat(payment.amount);

        // Update wallet balance
        await wallet.update({
            balance: newBalance,
            updated_at: new Date()
        }, { transaction });

        // Create wallet transaction
        const walletTransaction = await WalletTransaction.create({
            wallet_id: wallet.id,
            transaction_type: 'credit',
            amount: payment.amount,
            balance_before: balanceBefore,
            balance_after: newBalance,
            description: `Wallet recharge via stripe (webhook)`,
            reference_type: 'payment',
            reference_id: payment.id,
            payment_gateway: 'stripe',
            gateway_transaction_id: paymentIntent.id,
            status: 'completed'
        }, { transaction });

        // Link wallet transaction to payment
        await payment.update({
            wallet_transaction_id: walletTransaction.id
        }, { transaction });

        await transaction.commit();
        console.log(`Stripe payment ${paymentId} processed successfully via webhook`);

    } catch (error) {
        await transaction.rollback();
        console.error('Error handling Stripe payment success webhook:', error);
    }
}

// Stripe Failure Handler
async function handleStripePaymentFailure(paymentIntent) {
    try {
        const paymentId = paymentIntent.metadata.payment_id;

        if (!paymentId) {
            console.error('Payment ID not found in Stripe failure webhook metadata');
            return;
        }

        const payment = await Payment.findByPk(paymentId);

        if (!payment) {
            console.error(`Payment ${paymentId} not found for Stripe failure webhook`);
            return;
        }

        // Only update if still pending
        if (payment.status === 'pending') {
            const errorMessage = paymentIntent.last_payment_error?.message ||
                paymentIntent.cancellation_reason ||
                'Payment failed';

            await payment.update({
                status: 'failed',
                failure_reason: errorMessage,
                gateway_response: JSON.stringify(paymentIntent),
                gateway_payment_id: paymentIntent.id
            });

            console.log(`Stripe payment ${paymentId} marked as failed: ${errorMessage}`);
        } else {
            console.log(`Payment ${paymentId} status is ${payment.status}, skipping failure webhook`);
        }

    } catch (error) {
        console.error('Error handling Stripe payment failure webhook:', error);
    }
}

// PayPal Success Handler
async function handlePayPalPaymentSuccess(webhookEvent) {
    const transaction = await sequelize.transaction();

    try {
        const resource = webhookEvent.resource;
        const customId = resource.custom_id || resource.invoice_id;

        // Try to find payment by gateway order ID
        const orderId = resource.supplementary_data?.related_ids?.order_id;

        let payment;
        if (orderId) {
            payment = await Payment.findOne({
                where: { gateway_order_id: orderId },
                include: [{
                    model: Wallet,
                    as: 'wallet'
                }],
                lock: transaction.LOCK.UPDATE,
                transaction
            });
        }

        if (!payment) {
            console.error('Payment not found for PayPal success webhook');
            await transaction.rollback();
            return;
        }

        // If already processed, skip
        if (payment.status === 'completed') {
            console.log(`Payment ${payment.id} already completed, skipping PayPal webhook`);
            await transaction.commit();
            return;
        }

        const captureId = resource.id;
        const amount = parseFloat(resource.amount.value);

        // Update payment status
        await payment.update({
            status: 'completed',
            gateway_payment_id: captureId,
            gateway_response: JSON.stringify(webhookEvent),
            completed_at: new Date()
        }, { transaction });

        // Get wallet with lock
        const wallet = await Wallet.findByPk(payment.wallet_id, {
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!wallet) {
            throw new Error("Wallet not found");
        }

        const balanceBefore = parseFloat(wallet.balance);
        const newBalance = balanceBefore + parseFloat(payment.amount);

        // Update wallet balance
        await wallet.update({
            balance: newBalance,
            updated_at: new Date()
        }, { transaction });

        // Create wallet transaction
        const walletTransaction = await WalletTransaction.create({
            wallet_id: wallet.id,
            transaction_type: 'credit',
            amount: payment.amount,
            balance_before: balanceBefore,
            balance_after: newBalance,
            description: `Wallet recharge via paypal (webhook)`,
            reference_type: 'payment',
            reference_id: payment.id,
            payment_gateway: 'paypal',
            gateway_transaction_id: captureId,
            status: 'completed'
        }, { transaction });

        // Link wallet transaction to payment
        await payment.update({
            wallet_transaction_id: walletTransaction.id
        }, { transaction });

        await transaction.commit();
        console.log(`PayPal payment ${payment.id} processed successfully via webhook`);

    } catch (error) {
        await transaction.rollback();
        console.error('Error handling PayPal payment success webhook:', error);
    }
}

// PayPal Failure Handler
async function handlePayPalPaymentFailure(webhookEvent) {
    try {
        const resource = webhookEvent.resource;
        const orderId = resource.supplementary_data?.related_ids?.order_id;

        if (!orderId) {
            console.error('Order ID not found in PayPal failure webhook');
            return;
        }

        const payment = await Payment.findOne({
            where: { gateway_order_id: orderId }
        });

        if (!payment) {
            console.error(`Payment not found for PayPal order ${orderId}`);
            return;
        }

        // Only update if still pending
        if (payment.status === 'pending') {
            const errorMessage = resource.status_details?.reason ||
                webhookEvent.summary ||
                'Payment denied';

            await payment.update({
                status: 'failed',
                failure_reason: errorMessage,
                gateway_response: JSON.stringify(webhookEvent),
                gateway_payment_id: resource.id
            });

            console.log(`PayPal payment ${payment.id} marked as failed: ${errorMessage}`);
        } else {
            console.log(`Payment ${payment.id} status is ${payment.status}, skipping PayPal failure webhook`);
        }

    } catch (error) {
        console.error('Error handling PayPal payment failure webhook:', error);
    }
}

// Razorpay Success Handler
async function handleRazorpayPaymentSuccess(payload) {
    const transaction = await sequelize.transaction();

    try {
        const orderId = payload.order_id;
        const paymentId = payload.id;

        if (!orderId) {
            console.error('Order ID not found in Razorpay success webhook');
            await transaction.rollback();
            return;
        }

        const payment = await Payment.findOne({
            where: { gateway_order_id: orderId },
            include: [{
                model: Wallet,
                as: 'wallet'
            }],
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!payment) {
            console.error(`Payment not found for Razorpay order ${orderId}`);
            await transaction.rollback();
            return;
        }

        // If already processed, skip
        if (payment.status === 'completed') {
            console.log(`Payment ${payment.id} already completed, skipping Razorpay webhook`);
            await transaction.commit();
            return;
        }

        const amount = payload.amount / 100; // Razorpay amount is in smallest currency unit

        // Update payment status
        await payment.update({
            status: 'completed',
            gateway_payment_id: paymentId,
            gateway_response: JSON.stringify(payload),
            completed_at: new Date()
        }, { transaction });

        // Get wallet with lock
        const wallet = await Wallet.findByPk(payment.wallet_id, {
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!wallet) {
            throw new Error("Wallet not found");
        }

        const balanceBefore = parseFloat(wallet.balance);
        const newBalance = balanceBefore + parseFloat(payment.amount);

        // Update wallet balance
        await wallet.update({
            balance: newBalance,
            updated_at: new Date()
        }, { transaction });

        // Create wallet transaction
        const walletTransaction = await WalletTransaction.create({
            wallet_id: wallet.id,
            transaction_type: 'credit',
            amount: payment.amount,
            balance_before: balanceBefore,
            balance_after: newBalance,
            description: `Wallet recharge via razorpay (webhook)`,
            reference_type: 'payment',
            reference_id: payment.id,
            payment_gateway: 'razorpay',
            gateway_transaction_id: paymentId,
            status: 'completed'
        }, { transaction });

        // Link wallet transaction to payment
        await payment.update({
            wallet_transaction_id: walletTransaction.id
        }, { transaction });

        await transaction.commit();
        console.log(`Razorpay payment ${payment.id} processed successfully via webhook`);

    } catch (error) {
        await transaction.rollback();
        console.error('Error handling Razorpay payment success webhook:', error);
    }
}

// Razorpay Failure Handler
async function handleRazorpayPaymentFailure(payload) {
    try {
        const orderId = payload.order_id;
        const paymentId = payload.id;

        if (!orderId) {
            console.error('Order ID not found in Razorpay failure webhook');
            return;
        }

        const payment = await Payment.findOne({
            where: { gateway_order_id: orderId }
        });

        if (!payment) {
            console.error(`Payment not found for Razorpay order ${orderId}`);
            return;
        }

        // Only update if still pending
        if (payment.status === 'pending') {
            const errorMessage = payload.error_description ||
                payload.error_reason ||
                payload.error_code ||
                'Payment failed';

            await payment.update({
                status: 'failed',
                failure_reason: errorMessage,
                gateway_response: JSON.stringify(payload),
                gateway_payment_id: paymentId
            });

            console.log(`Razorpay payment ${payment.id} marked as failed: ${errorMessage}`);
        } else {
            console.log(`Payment ${payment.id} status is ${payment.status}, skipping Razorpay failure webhook`);
        }

    } catch (error) {
        console.error('Error handling Razorpay payment failure webhook:', error);
    }
}

// ==================== PAYMENT HISTORY ====================
exports.getPaymentHistory = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            payment_gateway,
            start_date,
            end_date
        } = req.query;

        const whereClause = { team_id: req.team_id };

        if (status) {
            whereClause.status = status;
        }

        if (payment_gateway) {
            whereClause.payment_gateway = payment_gateway.toLowerCase();
        }

        if (start_date || end_date) {
            whereClause.created_at = {};
            if (start_date) {
                whereClause.created_at[Op.gte] = new Date(start_date);
            }
            if (end_date) {
                whereClause.created_at[Op.lte] = new Date(end_date);
            }
        }

        const offset = (page - 1) * limit;
        const total = await Payment.count({ where: whereClause });

        const payments = await Payment.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: {
                exclude: ['gateway_response']
            },
            include: [{
                model: WalletTransaction,
                as: 'walletTransaction',
                attributes: ['id', 'amount', 'balance_after', 'status']
            }]
        });

        return res.status(200).json({
            success: true,
            message: "Payment history retrieved successfully",
            data: {
                payments,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (err) {
        console.error("Error in getPaymentHistory:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// ==================== GET PAYMENT BY ID ====================
exports.getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;

        const payment = await Payment.findByPk(id, {
            include: [
                {
                    model: Wallet,
                    as: 'wallet',
                    attributes: ['id', 'balance', 'currency', 'status']
                },
                {
                    model: WalletTransaction,
                    as: 'walletTransaction',
                    attributes: ['id', 'amount', 'balance_after', 'status', 'created_at']
                },
                {
                    model: Team,
                    as: 'team',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment retrieved successfully",
            data: payment
        });

    } catch (err) {
        console.error("Error in getPaymentById:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// ==================== GET AVAILABLE PAYMENT GATEWAYS ====================
exports.getAvailableGateways = async (req, res) => {
    try {
        const gateways = getAvailableGateways();

        return res.status(200).json({
            success: true,
            message: "Available payment gateways retrieved successfully",
            data: {
                gateways: gateways,
                count: gateways.length
            }
        });
    } catch (err) {
        console.error("Error in getAvailableGateways:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};