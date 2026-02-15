const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middlewares/auth");
const pageController = require("../controllers/page.controller");

router.get("/", authenticate, authorizeRoles(["super_admin", "user"]), pageController.getAllPages);
router.get("/slug/:slug", authenticate, authorizeRoles(["super_admin"]), pageController.getPageBySlug);
router.post("/create", authenticate, authorizeRoles(["super_admin"]), pageController.createPage);
router.put("/update/:id", authenticate, authorizeRoles(["super_admin"]), pageController.updatePage);
router.delete("/delete", authenticate, authorizeRoles(["super_admin"]), pageController.deletePage);
router.put("/status/:id", authenticate, authorizeRoles(["super_admin"]), pageController.updatePageStatus);

module.exports = router;
