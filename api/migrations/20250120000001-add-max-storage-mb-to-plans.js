"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add max_storage_mb column to plans table (skip if already exists)
    try {
      await queryInterface.addColumn("plans", "max_storage_mb", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: "Maximum storage in MB. Null means unlimited storage",
      });
    } catch (error) {
      console.log("max_storage_mb column already exists, skipping...");
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn("plans", "max_storage_mb");
    } catch (error) {
      console.log("Error removing max_storage_mb column:", error);
    }
  },
};

