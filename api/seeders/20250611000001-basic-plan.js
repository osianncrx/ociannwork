'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if basic plan already exists
    const existingPlan = await queryInterface.sequelize.query(
      `SELECT id FROM plans WHERE slug = 'basic' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingPlan.length > 0) {
      console.log('Basic plan already exists, skipping seeder');
      return;
    }

    // Unset any existing default plan
    await queryInterface.sequelize.query(
      `UPDATE plans SET is_default = false WHERE is_default = true`
    );

    // Create the basic plan
    await queryInterface.bulkInsert('plans', [{
      name: 'Basic',
      slug: 'basic',
      description: 'Free basic plan with essential features for small teams. This is the default plan for all teams.',
      
      // Pricing - Free plan
      price_per_user_per_month: 0.00,
      price_per_user_per_year: 0.00,
      billing_cycle: 'both',
      
      // Usage Limits - Basic tier
      max_storage_mb: 1000, // 1GB per user
      max_message_search_limit: 5000, // Last 5k messages searchable
      max_channels: 10,
      
      // Feature Flags - Basic features only
      allows_private_channels: true,
      allows_file_sharing: true,
      allows_video_calls: false,
      
      // Metadata
      features: JSON.stringify({
        message_history: 'limited',
        support: 'community',
        integrations: false,
        custom_branding: false
      }),
      display_order: 0, // First in display order
      is_default: true, // This is the default plan
      status: 'active',
      
      // Timestamps
      created_at: new Date(),
      updated_at: new Date()
    }], {});

    console.log('Basic plan seeded successfully');
  },

  async down(queryInterface, Sequelize) {
    // Only delete the basic plan if it exists
    await queryInterface.bulkDelete('plans', { slug: 'basic' }, {});
  }
};
