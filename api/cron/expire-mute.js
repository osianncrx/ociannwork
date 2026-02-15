const cron = require('node-cron');
const { MutedChat } = require('../models');
const { Op } = require('sequelize');

async function expireMutedChats(io) {
    const now = new Date();

    try {
        // Find all muted chats where muted_until is in the past and not null
        const expiredMutes = await MutedChat.findAll({
            where: {
                muted_until: {
                    [Op.ne]: null,
                    [Op.lte]: now
                }
            }
        });

        if (expiredMutes.length > 0) {
            // Delete the expired mute records
            await MutedChat.destroy({
                where: {
                    id: {
                        [Op.in]: expiredMutes.map(mute => mute.id)
                    }
                }
            });

            console.log(`Expired ${expiredMutes.length} muted chat records`);

            // Emit socket events to notify clients about unmute using your event name pattern
            for (const mute of expiredMutes) {
                io.to(`user_${mute.user_id}`).emit("chat_unmuted", {
                    userId: mute.user_id,
                    targetId: mute.target_id,
                    targetType: mute.target_type
                });
            }
        }
    } catch (error) {
        console.error('Error expiring muted chats:', error);
    }
}

module.exports = (io) => {
    // Mute expiration cron - runs every minute
    cron.schedule('* * * * *', async () => {
        await expireMutedChats(io);
    });
};