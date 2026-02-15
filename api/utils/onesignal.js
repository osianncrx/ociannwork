// utils/onesignal.js
require('dotenv').config();
const axios = require('axios');

// OneSignal Configuration from environment variables
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

/**
 * Send notification to all subscribers
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} additionalData - Optional custom data
 * @returns {Promise<object>} OneSignal API response
 */
async function sendToAll(title, message, additionalData = {}) {
    try {
        const payload = {
            app_id: ONESIGNAL_APP_ID,
            included_segments: ['All'],
            headings: { en: title },
            contents: { en: message },
        };

        // Add custom data if provided
        if (Object.keys(additionalData).length > 0) {
            payload.data = additionalData;
        }

        const response = await axios.post(ONESIGNAL_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
            }
        });

        console.log('✓ Notification sent to all users');
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('✗ Error sending notification to all:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

/**
 * Send notification to specific users by Player IDs
 * @param {array} playerIds - Array of OneSignal player IDs
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} additionalData - Optional custom data
 * @returns {Promise<object>} OneSignal API response
 */
async function sendToUsers(playerIds, title, message, additionalData = {}) {
    try {
        if (!Array.isArray(playerIds) || playerIds.length === 0) {
            throw new Error('playerIds must be a non-empty array');
        }

        const payload = {
            app_id: ONESIGNAL_APP_ID,
            include_player_ids: playerIds,
            headings: { en: title },
            contents: { en: message },
        };

        // Add custom data if provided
        if (Object.keys(additionalData).length > 0) {
            payload.data = additionalData;
        }

        const response = await axios.post(ONESIGNAL_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
            }
        });

        console.log(`✓ Notification sent to ${playerIds.length} user(s)`);
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('✗ Error sending notification to users:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

/**
 * Send notification to users by segment
 * @param {array} segments - Array of segment names
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} additionalData - Optional custom data
 * @returns {Promise<object>} OneSignal API response
 */
async function sendToSegment(segments, title, message, additionalData = {}) {
    try {
        const payload = {
            app_id: ONESIGNAL_APP_ID,
            included_segments: segments,
            headings: { en: title },
            contents: { en: message },
        };

        // Add custom data if provided
        if (Object.keys(additionalData).length > 0) {
            payload.data = additionalData;
        }

        const response = await axios.post(ONESIGNAL_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
            }
        });

        console.log(`✓ Notification sent to segment: ${segments.join(', ')}`);
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('✗ Error sending notification to segment:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

/**
 * Send notification with image
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} imageUrl - Image URL
 * @param {array|string} target - 'All' or array of player IDs
 * @param {object} additionalData - Optional custom data
 * @returns {Promise<object>} OneSignal API response
 */
async function sendWithImage(title, message, imageUrl, target = 'All', additionalData = {}) {
    try {
        const payload = {
            app_id: ONESIGNAL_APP_ID,
            headings: { en: title },
            contents: { en: message },
            big_picture: imageUrl,
            ios_attachments: { id: imageUrl },
        };

        // Set target
        if (target === 'All') {
            payload.included_segments = ['All'];
        } else if (Array.isArray(target)) {
            payload.include_player_ids = target;
        }

        // Add custom data if provided
        if (Object.keys(additionalData).length > 0) {
            payload.data = additionalData;
        }

        const response = await axios.post(ONESIGNAL_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
            }
        });

        console.log('✓ Notification with image sent successfully');
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('✗ Error sending notification with image:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

/**
 * Send scheduled notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Date|string} scheduleTime - ISO 8601 format date/time
 * @param {array|string} target - 'All' or array of player IDs
 * @returns {Promise<object>} OneSignal API response
 */
async function sendScheduled(title, message, scheduleTime, target = 'All') {
    try {
        const payload = {
            app_id: ONESIGNAL_APP_ID,
            headings: { en: title },
            contents: { en: message },
            send_after: scheduleTime instanceof Date ? scheduleTime.toISOString() : scheduleTime,
        };

        // Set target
        if (target === 'All') {
            payload.included_segments = ['All'];
        } else if (Array.isArray(target)) {
            payload.include_player_ids = target;
        }

        const response = await axios.post(ONESIGNAL_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
            }
        });

        console.log('✓ Scheduled notification created');
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('✗ Error creating scheduled notification:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}

module.exports = {
    sendToAll,
    sendToUsers,
    sendToSegment,
    sendWithImage,
    sendScheduled
};