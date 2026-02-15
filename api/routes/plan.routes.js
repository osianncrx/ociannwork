const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middlewares/auth");
const planController = require("../controllers/plan.controller");

router.get('/', authenticate, authorizeRoles(["super_admin", "user"]), planController.getAllPlans);
router.get('/:id', authenticate, authorizeRoles(["super_admin", "user"]), planController.getPlanById);
router.get('/active', authenticate, authorizeRoles(["super_admin", "user"]), planController.getActivePlans);
router.get('/slug/:slug', authenticate, authorizeRoles(["super_admin", "user"]), planController.getPlanBySlug);
router.post('/', authenticate, authorizeRoles(["super_admin", "user"]), planController.createPlan);
router.put('/:id', authenticate, authorizeRoles(["super_admin", "user"]), planController.updatePlan);
router.put('/:id/status', authenticate, authorizeRoles(["super_admin", "user"]), planController.updatePlanStatus);
router.put('/:id/set-default', authenticate, authorizeRoles(["super_admin", "user"]), planController.setDefaultPlan);
router.delete('/bulk-delete', authenticate, authorizeRoles(["super_admin", "user"]), planController.deletePlan);

module.exports = router;