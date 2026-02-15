const express = require("express");
const router = express.Router();
const { authenticate, authorizeTeamRole, authorizeRoles } = require("../middlewares/auth");
const teamController = require("../controllers/team.controller");
const { uploadSingle } = require("../utils/upload");

// On Boarding (Team admin or Member)
router.post("/create", teamController.createTeam);
router.get("/find", teamController.findTeam);
router.post("/join", teamController.joinTeamPreUser);
router.put("/setup/profile", teamController.setupUserProfile);
router.get("/", authenticate, authorizeRoles(["user"]), teamController.getTeams);

// Team Admin
router.get('/dashboard', authenticate, authorizeTeamRole(['admin']), teamController.dashboard);
router.get('/current-team', authenticate, authorizeTeamRole(['admin','member']), teamController.getTeamById);
router.post('/add', authenticate, authorizeRoles(['user']), teamController.addNewTeam);
router.post('/invite/member', authenticate, authorizeTeamRole(['admin', 'member']), teamController.inviteTeamMember);
router.put('/update/role-status', authenticate, authorizeTeamRole(['admin']), teamController.updateTeamMemberStatus);
router.put('/update/profile', authenticate, authorizeTeamRole(['admin']), uploadSingle('team_avatars', 'team_avatar'), teamController.updateTeam);
router.put('/update/do-not-disturb', authenticate, authorizeTeamRole(['admin', 'member']), teamController.updateDoNotDisturb);
router.get('/members', authenticate, authorizeTeamRole(['admin', 'member']), teamController.getTeamMembers);
router.delete('/users', authenticate, authorizeTeamRole(['admin']), teamController.removeUserFromTeam);
router.post('/leave', authenticate, authorizeTeamRole(['admin', 'member']), teamController.leaveTeam);

// Admin
router.get("/admin/dashboard", authenticate, authorizeRoles(["super_admin"]), teamController.adminDashboard);
router.get("/all", authenticate, authorizeRoles(["super_admin"]), teamController.getAllTeams);
router.delete("/delete", authenticate, authorizeRoles(["super_admin"]), teamController.deleteTeam);
router.delete('/users', authenticate, authorizeRoles(['super_admin']), teamController.deleteUsersFromTeam);
router.put('/update/status', authenticate, authorizeTeamRole(['super_admin']), teamController.updateSuperTeamMemberStatus);

module.exports = router;
