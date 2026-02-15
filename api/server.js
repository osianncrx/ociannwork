"use strict";

require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
require('./utils/system-settings');
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    // Load app FIRST (it handles DB connection gracefully)
    const app = await require("./app");

    // Try to load models, but don't fail if not available
    let sequelize = null;
    try {
      const models = require("./models");
      sequelize = models.sequelize;
    } catch (error) {
      console.warn("⚠️ Models not loaded - will be available after installation");
    }

    // Create HTTP server
    const server = http.createServer(app);

    // Setup Socket.IO
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    app.set("io", io);

    // Only setup socket handlers and cron if database is connected
    if (sequelize) {
      try {
        await sequelize.authenticate();
        console.log("✅ DB connected");

        // Initialize socket handlers
        require("./socket")(io);

        // Start cron jobs with socket instance
        const reminderCron = require("./cron/send-reminders");
        const expireMute = require("./cron/expire-mute");
        const expireDND = require("./cron/expire-dnd");
        const expireSubscription = require('./cron/expire-subscription');

        reminderCron(io);
        expireMute(io);
        expireDND(io);
        expireSubscription(io);

        console.log("✅ Cron jobs started");
      } catch (err) {
        console.warn("⚠️ Running without database features - visit /install to configure");
      }
    } else {
      console.warn("⚠️ Database not configured - visit /install to set up");
    }

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      if (!sequelize) {
        console.log(`📋 Please visit http://localhost:${PORT}/install to complete setup`);
      }
    });
  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
})();