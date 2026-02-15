const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middlewares/auth");
const faqController = require("../controllers/faq.controller");

router.get("/", authenticate, authorizeRoles(["super_admin", "user"]), faqController.getAllFaqs);
router.post("/create", authenticate, authorizeRoles(["super_admin"]), faqController.createFaq);
router.put("/update/:id", authenticate, authorizeRoles(["super_admin"]), faqController.updateFaq);
router.delete("/delete", authenticate, authorizeRoles(["super_admin"]), faqController.deleteFaq);
router.put("/status/:id", authenticate, authorizeRoles(["super_admin"]), faqController.updateFaqStatus);

module.exports = router;
