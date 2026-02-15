"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn("team_settings", "e2e_encryption_enabled", {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: "Enable/disable E2E encryption for this team",
      });
    } catch (error) {
      console.log("e2e_encryption_enabled column might already exist, skipping...");
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn("team_settings", "e2e_encryption_enabled");
    } catch (error) {}
  },
};


