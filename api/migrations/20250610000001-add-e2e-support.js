"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add public_key column to users table (skip if already exists)
    try {
      await queryInterface.addColumn("users", "public_key", {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "User's public key for E2E encryption",
      });
    } catch (error) {
      console.log("public_key column already exists, skipping...");
    }

    // Add is_encrypted flag to messages table (skip if already exists)
    try {
      await queryInterface.addColumn("messages", "is_encrypted", {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
    } catch (error) {
      console.log("is_encrypted column already exists, skipping...");
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn("messages", "is_encrypted");
    } catch (error) {}
    try {
      await queryInterface.removeColumn("users", "public_key");
    } catch (error) {}
  },
};

