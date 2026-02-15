'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');

dotenv.config();

const app = express();
let installWizard = null;

module.exports = (async () => {
    // Load models (may be empty if no DB)
    let sequelize = null;
    let User = null;
    let dbConnected = false; // Track actual DB connection status

    try {
        const models = require('./models');
        sequelize = models.sequelize;
        User = models.User;
    } catch (error) {
        console.warn('⚠️ Models not loaded:', error.message);
    }

    // Try to connect to database if available
    if (sequelize) {
        try {
            await sequelize.authenticate();
            await sequelize.sync();
            dbConnected = true;
            console.log('✅ Database connected successfully');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            console.warn('⚠️ Running without database - you can configure database via /install');
            dbConnected = false;
            sequelize = null; // Set to null so installation check works
        }
    } else {
        console.warn('⚠️ No database configuration - please visit /install to set up');
    }

    // CORS configuration
    const corsOptions = { origin: '*' };
    app.use(cors(corsOptions));

    // Body parser configuration
    app.use(express.json({ limit: '20mb' }));
    app.use(express.urlencoded({ extended: true, limit: '20mb' }));

    // Session middleware configuration
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    }));

    // Static file serving
    app.use(express.static(path.join(__dirname, 'public')));
    app.locals.routeIs = (name) => app.locals.currentRouteName === name;

    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Session handling middleware
    app.use((req, res, next) => {
        const oldSnapshot = Object.assign({}, req.session._old || {});
        const errorsSnapshot = Object.assign({}, req.session._errors || {});
        res.locals.session = req.session;
        res.locals.errors = errorsSnapshot;
        res.locals.old = (key, fallback = '') => {
            if (!key) return fallback;
            const parts = key.split('.');
            let cur = oldSnapshot;
            for (const p of parts) {
                if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
                    cur = cur[p];
                } else {
                    return fallback;
                }
            }
            return cur ?? fallback;
        };
        req.session._old = {};
        req.session._errors = {};
        next();
    });

    // ----------------- Install Wizard Setup -----------------
    try {
        const { InstallWizard, checkUserModelCompatibility } = require('./index.js');

        installWizard = new InstallWizard({ mountPath: '/install' });

        // Only check user model compatibility if we have database and User model
        if (User && dbConnected) {
            try {
                const userModelCompatibility = await checkUserModelCompatibility(User);

                if (userModelCompatibility.compatible) {
                    installWizard.setExistingUserModel(User);
                    console.log('✅ Will sync with existing User model during installation');
                } else {
                    console.log('⚠️ User model compatibility issues:', userModelCompatibility.reason);
                }
            } catch (error) {
                console.warn('⚠️ Could not check user model compatibility:', error.message);
            }
        }

        installWizard.mount(app);
        console.log('✅ Installation wizard mounted at /install');
    } catch (error) {
        console.error('❌ Could not initialize install wizard:', error.message);
        console.error(error.stack);
    }

    // View engine setup - MOVE BEFORE ROUTES
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // ----------------- Check Installation Status -----------------
    app.use(async (req, res, next) => {

        // Always allow these paths
        if (
            req.path.startsWith('/install') ||
            req.path.startsWith('/uploads') ||
            req.path === '/favicon.ico' ||
            req.path === '/health'
        ) {
            return next();
        }

        // Check if database is connected
        if (!dbConnected || !sequelize) {
            console.log('⚠️ No database connection - redirecting to /install');
            return res.redirect('/install');
        }

        // Check if installation is complete
        if (installWizard) {
            try {
                const isInstalled = await installWizard.isInstalled();
                if (!isInstalled) {
                    console.log('⚠️ Installation not complete - redirecting to /install');
                    return res.redirect('/install');
                }
            } catch (error) {
                console.warn('⚠️ Could not check installation status:', error.message);
                return res.redirect('/install');
            }
        }

        next();
    });

    app.get('/', (req, res) => {
        res.render('welcome');
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            database: dbConnected ? 'connected' : 'not configured',
            timestamp: new Date().toISOString()
        });
    });

    // Route imports
    const authRoutes = require('./routes/auth.routes');
    const accountRoutes = require('./routes/account.routes');
    const userRoutes = require('./routes/user.routes');
    const teamRoutes = require('./routes/team.routes');
    const channelRoutes = require('./routes/channel.routes');
    const teamSettingRoutes = require('./routes/team-setting.routes');
    const customFieldRoutes = require('./routes/custom-field.routes');
    const settingRoutes = require('./routes/setting.routes');
    const messageRoutes = require('./routes/message.routes');
    const remiderRoutes = require('./routes/reminder.routes');
    const faqRoutes = require('./routes/faq.routes');
    const pagesRoutes = require('./routes/page.routes');
    const planRoutes = require('./routes/plan.routes');
    const walletRoutes = require('./routes/wallet.routes');
    const paymentRoutes = require('./routes/payment.routes');
    const subscriptionRoutes = require('./routes/subscription.routes');
    const e2eRoutes = require('./routes/e2e.routes');
    const impersonationRoutes = require("./routes/impersonation.routes");
    const recordingRoutes = require('./routes/recording.routes');

    // Mount routes
    app.use('/api/auth', authRoutes);
    app.use('/api/account', accountRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/team', teamRoutes);
    app.use('/api/channel', channelRoutes);
    app.use('/api/team-setting', teamSettingRoutes);
    app.use('/api/custom-field', customFieldRoutes);
    app.use('/api/setting', settingRoutes);
    app.use('/api/message', messageRoutes);
    app.use('/api/reminder', remiderRoutes);
    app.use('/api/faq', faqRoutes);
    app.use('/api/page', pagesRoutes);
    app.use('/api/plan', planRoutes);
    app.use('/api/wallet', walletRoutes);
    app.use('/api/payment', paymentRoutes);
    app.use('/api/subscription', subscriptionRoutes);
    app.use('/api/e2e', e2eRoutes);
    app.use("/api/impersonation", impersonationRoutes);
    app.use('/api/recordings', recordingRoutes);

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            error: 'Not Found',
            message: 'The requested resource was not found',
            path: req.path
        });
    });

    // Error handler
    app.use((err, req, res, next) => {
        console.error('Error:', err);
        res.status(err.status || 500).json({
            error: err.message || 'Internal Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    });

    return app;
})();