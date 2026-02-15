const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth');
const settingController = require('../controllers/setting.controller');
const { createUploader } = require('../utils/upload');

// Create upload middleware for multiple specific logo fields
const uploadLogos = createUploader('logos').fields([
    { name: 'favicon', maxCount: 1 },
    { name: 'logo_light', maxCount: 1 },
    { name: 'logo_dark', maxCount: 1 },
    { name: 'sidebar_logo', maxCount: 1 },
    { name: 'mobile_logo', maxCount: 1 },
    { name: 'landing_logo', maxCount: 1 },
    { name: 'favicon_notification_logo', maxCount: 1 },
    { name: 'onboarding_logo', maxCount: 1 },
    { name: 'maintenance_image', maxCount: 1 },
    { name: 'page_404_image', maxCount: 1 },
    { name: 'no_internet_image', maxCount: 1 }
]);

router.get('/', authenticate, authorizeRoles(['super_admin', 'user']), settingController.getSettings);
router.put('/',
    authenticate,
    authorizeRoles(['super_admin']),
    uploadLogos, // Use the specific fields upload
    settingController.updateSettings
);
router.get('/public', settingController.getPublicSettings);
router.get('/country-codes', authenticate, authorizeRoles(['super_admin', 'user']), settingController.getCountryCode);

module.exports = router;