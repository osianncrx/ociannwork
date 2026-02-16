'use strict';

const cron = require('node-cron');

module.exports = (io) => {
  // Run every hour from 8am to 6pm Costa Rica time (14:00-00:00 UTC)
  cron.schedule('0 14-23,0 * * *', async () => {
    console.log('[CRON] Running Teams attendance report...');
    try {
      const { Team, TeamMember, Marca, User } = require('../models');
      const { Op } = require('sequelize');
      const { getToday, startOfDay, endOfDay, formatTime } = require('../utils/timezone');
      const { determinarEstado, calcularHorasBrutas, calcularTiempoDescanso } = require('../utils/attendance-calc');
      const { sendTeamsDailyReport } = require('../utils/teams-webhook');

      const today = getToday();

      // Get all teams with Teams enabled
      const teams = await Team.findAll({
        where: {
          teams_webhook_url: { [Op.ne]: null },
          teams_notificaciones: true,
          activo_marcas: true,
        },
      });

      for (const team of teams) {
        try {
          const members = await TeamMember.findAll({
            where: { team_id: team.id, status: 'active' },
            include: [{
              model: User,
              attributes: ['id', 'name', 'apellidos', 'status'],
              where: { status: 'active' },
            }],
          });

          const empleados = [];
          for (const member of members) {
            const user = member.User;
            const marcas = await Marca.findAll({
              where: {
                user_id: user.id,
                Activo: 1,
                Hora: { [Op.between]: [startOfDay(today), endOfDay(today)] },
              },
              order: [['Hora', 'ASC']],
              raw: true,
            });

            const estado = determinarEstado(marcas);
            const brutasSeg = calcularHorasBrutas(marcas);
            const descansoSeg = calcularTiempoDescanso(marcas);
            const netasSeg = Math.max(0, brutasSeg - descansoSeg);
            const entrada = marcas.find(m => m.TipoMarca === 1);
            const ultima = marcas.length > 0 ? marcas[marcas.length - 1] : null;

            empleados.push({
              nombre: `${user.name} ${user.apellidos || ''}`.trim(),
              estado,
              horaEntrada: entrada ? new Date(entrada.Hora).toISOString().substr(11, 8) : '-',
              ultimaMarca: ultima ? new Date(ultima.Hora).toISOString().substr(11, 8) : '-',
              horasTrabajadas: formatTime(netasSeg),
            });
          }

          await sendTeamsDailyReport(team, empleados);
          console.log(`[CRON] Teams report sent for ${team.name}`);
        } catch (teamError) {
          console.error(`[CRON] Teams report error for ${team.name}:`, teamError.message);
        }
      }
    } catch (error) {
      console.error('[CRON] Teams report error:', error);
    }
  });
};
