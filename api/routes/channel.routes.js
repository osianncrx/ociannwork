const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channel.controller');
const { authenticate, authorizeTeamRole, authorizeRoles } = require("../middlewares/auth");
const { uploadSingle } = require('../utils/upload');

const authorizeDeleteChannel = async (req, res, next) => {
  if (req.user && req.user.role === "super_admin") {
    return next();
  }
  return authorizeTeamRole(["admin", "member"])(req, res, next);
};

router.get('/info/:id', authenticate, authorizeTeamRole(['admin', 'member']), channelController.getChannelInfo);
router.post('/create', authenticate, authorizeTeamRole(['admin', 'member']), channelController.createChannel);
router.get('/team', authenticate, authorizeTeamRole(['admin', 'member']), channelController.getChannelsByTeam);
router.get('/members', authenticate, authorizeTeamRole(['admin', 'member']), channelController.getChannelMembers);
router.post('/members/add', authenticate, authorizeTeamRole(['admin', 'member']), channelController.addMembersToChannel);
router.delete('/members/remove', authenticate, authorizeTeamRole(['admin', 'member']), channelController.removeMemberFromChannel);
router.post('/members/update/role', authenticate, authorizeTeamRole(['admin', 'member']), channelController.changeMemberRole);
router.post('/leave', authenticate, authorizeTeamRole(['admin', 'member']), channelController.leaveChannel);
router.delete("/delete", authenticate, authorizeDeleteChannel, channelController.deleteChannel);
// Admin
router.get('/all', authenticate, authorizeRoles(['super_admin']), channelController.getAllChannels);
router.put('/:id', authenticate, authorizeRoles(['super_admin']), uploadSingle('channel-avatars', 'avatar'), channelController.updateChannel);

module.exports = router;