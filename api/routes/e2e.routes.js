const express = require("express");
const router = express.Router();
const { authenticate, authorizeTeamRole } = require("../middlewares/auth");
const e2eController = require("../controllers/e2e.controller");

// Get E2E status for team
router.get("/status", authenticate, authorizeTeamRole(["admin", "member"]), e2eController.getE2EStatus);

// Toggle E2E (Admin only)
router.post("/toggle", authenticate, authorizeTeamRole(["admin"]), e2eController.toggleE2E);

// Save my public key
router.post("/keys", authenticate, authorizeTeamRole(["admin", "member"]), e2eController.savePublicKey);

// Get my public key
router.get("/keys", authenticate, authorizeTeamRole(["admin", "member"]), e2eController.getMyPublicKey);

// Get a user's public key
router.get("/keys/:user_id", authenticate, authorizeTeamRole(["admin", "member"]), e2eController.getPublicKey);

// Delete my public key
router.delete("/keys", authenticate, authorizeTeamRole(["admin", "member"]), e2eController.deletePublicKey);

module.exports = router;

