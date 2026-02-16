'use strict';

const { Team, TeamsNotificationLog, TeamMember, Marca, User } = require('../models');
const { Op } = require('sequelize');
const { getToday, startOfDay, endOfDay, formatTime } = require('../utils/timezone');
const { determinarEstado, calcularHorasBrutas, calcularTiempoDescanso } = require('../utils/attendance-calc');
const { sendTeamsNotification, sendTeamsDailyReport } = require('../utils/teams-webhook');

/**
 * POST /api/attendance/teams-integration/test - Test webhook
 */
exports.testWebhook = async (req, res) => {
  try {
    const teamId = req.attendanceTeamId;
    const team = await Team.findByPk(teamId);

    if (!team) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });
    if (!team.teams_webhook_url) {
      return res.status(400).json({ ok: false, error: 'No hay webhook configurado' });
    }

    const result = await sendTeamsNotification(team, 'entrada', {
      title: 'Mensaje de prueba - OCIANN Marcas',
      subtitle: `Webhook de ${team.name}`,
      text: 'Este es un mensaje de prueba del sistema de asistencia.',
      facts: [
        { name: 'Sistema', value: 'OCIANN Marcas' },
        { name: 'Estado', value: 'Conectado' },
      ],
    });

    return res.json({ ok: true, exitoso: result });
  } catch (error) {
    console.error('testWebhook error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/teams-integration/report - Send status report
 */
exports.sendReport = async (req, res) => {
  try {
    const teamId = req.query.idEmpresa || req.attendanceTeamId;
    const team = await Team.findByPk(teamId);

    if (!team) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });
    if (!team.teams_webhook_url || !team.teams_notificaciones) {
      return res.status(400).json({ ok: false, error: 'Notificaciones Teams no configuradas' });
    }

    const today = getToday();
    const members = await TeamMember.findAll({
      where: { team_id: teamId, status: 'active' },
      include: [{ model: User, attributes: ['id', 'name', 'apellidos', 'puesto', 'status'], where: { status: 'active' } }],
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

    const result = await sendTeamsDailyReport(team, empleados);
    return res.json({ ok: true, exitoso: result });
  } catch (error) {
    console.error('sendReport error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/attendance/teams-integration/logs - Get notification logs
 */
exports.getLogs = async (req, res) => {
  try {
    const teamId = req.query.idEmpresa || req.attendanceTeamId;

    const logs = await TeamsNotificationLog.findAll({
      where: { team_id: teamId },
      order: [['created_at', 'DESC']],
      limit: 50,
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'name', 'apellidos'],
      }],
    });

    return res.json({ ok: true, logs });
  } catch (error) {
    console.error('getLogs error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
