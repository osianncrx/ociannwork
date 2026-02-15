const cron = require('node-cron');
const { TeamMember } = require('../models');
const { Op } = require('sequelize');

async function expireDNDStatus(io) {
    const now = new Date();

    try {
        // Find all team members where do_not_disturb_until is in the past and do_not_disturb is true
        const expiredDNDMembers = await TeamMember.findAll({
            where: {
                do_not_disturb: true,
                do_not_disturb_until: {
                    [Op.ne]: null,
                    [Op.lte]: now
                }
            }
        });

        if (expiredDNDMembers.length > 0) {
            // Update DND status - turn off DND and clear the until time
            await TeamMember.update({
                do_not_disturb: false,
                do_not_disturb_until: null
            }, {
                where: {
                    user_id: {
                        [Op.in]: expiredDNDMembers.map(member => member.user_id)
                    },
                    team_id: {
                        [Op.in]: expiredDNDMembers.map(member => member.team_id)
                    }
                }
            });

            console.log(`Expired DND status for ${expiredDNDMembers.length} team members`);

            // Emit socket events using your exact event name and data structure
            for (const member of expiredDNDMembers) {
                io.to(`user_${member.user_id}`).emit("dnd_status_updated", {
                    userId: member.user_id,
                    teamId: member.team_id,
                    do_not_disturb: false,
                    do_not_disturb_until: null
                });

                // Also notify the team that the user is no longer in DND
                io.to(`team_${member.team_id}`).emit("user_dnd_status_updated", {
                    userId: member.user_id,
                    teamId: member.team_id,
                    do_not_disturb: false,
                    do_not_disturb_until: null
                });
            }
        }
    } catch (error) {
        console.error('Error expiring DND status:', error);
    }
}

module.exports = (io) => {
    // DND expiration cron - runs every minute
    cron.schedule('* * * * *', async () => {
        await expireDNDStatus(io);
    });
};