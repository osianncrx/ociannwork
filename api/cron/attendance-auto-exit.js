'use strict';

const cron = require('node-cron');

module.exports = (io) => {
  // Run daily at 18:05 Costa Rica time (UTC-6 = 00:05 UTC next day)
  cron.schedule('5 0 * * *', async () => {
    console.log('[CRON] Running attendance auto-exit...');
    try {
      const { Marca, User, TeamMember, Team, sequelize } = require('../models');
      const { Op } = require('sequelize');
      const { getToday, startOfDay, endOfDay } = require('../utils/timezone');

      const today = getToday();
      const exitHour = `${today} 18:00:00`;

      // Find users with entry but no exit today
      const usersWithEntry = await Marca.findAll({
        where: {
          TipoMarca: 1,
          Activo: 1,
          Hora: { [Op.between]: [startOfDay(today), endOfDay(today)] },
        },
        attributes: ['user_id', 'team_id'],
        group: ['user_id', 'team_id'],
        raw: true,
      });

      let count = 0;
      for (const entry of usersWithEntry) {
        const hasExit = await Marca.findOne({
          where: {
            user_id: entry.user_id,
            TipoMarca: 3,
            Activo: 1,
            Hora: { [Op.between]: [startOfDay(today), endOfDay(today)] },
          },
        });

        if (!hasExit) {
          await Marca.create({
            TipoMarca: 3,
            Hora: new Date(exitHour + '-06:00'),
            user_id: entry.user_id,
            team_id: entry.team_id,
            Activo: 1,
          });
          count++;

          if (io) {
            io.to(`team-${entry.team_id}`).emit('attendance:status-update', {
              user_id: entry.user_id,
              estado: 'TERMINADO',
              auto: true,
            });
          }
        }
      }

      console.log(`[CRON] Auto-exit: ${count} marks inserted for ${today}`);
    } catch (error) {
      console.error('[CRON] Auto-exit error:', error);
    }
  });
};
