'use strict';

const { Marca, User, Team, TipoMarca, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getNow, getToday, startOfDay, endOfDay, formatTime } = require('../utils/timezone');
const { calcularHorasBrutas, calcularTiempoDescanso, calcularHorasNetas, determinarEstado } = require('../utils/attendance-calc');
const { sendMarkNotification } = require('../utils/teams-webhook');

/**
 * POST /api/attendance/marks - Register a new mark
 */
exports.insertMarca = async (req, res) => {
  try {
    const { tipoMarca, hora } = req.body;
    const userId = req.user.id;
    const teamId = req.attendanceTeamId;

    if (!tipoMarca || !hora) {
      return res.status(400).json({ ok: false, error: 'tipoMarca y hora son requeridos' });
    }

    if (![1, 2, 3].includes(tipoMarca)) {
      return res.status(400).json({ ok: false, error: 'tipoMarca debe ser 1, 2 o 3' });
    }

    const team = await Team.findByPk(teamId);
    if (!team) {
      return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });
    }

    const marca = await Marca.create({
      TipoMarca: tipoMarca,
      Hora: new Date(hora),
      user_id: userId,
      team_id: teamId,
      Activo: 1,
    });

    // Send Teams notification
    if (team.teams_webhook_url && team.teams_notificaciones) {
      let esInicio = false;
      if (tipoMarca === 2) {
        const today = getToday();
        const descansosHoy = await Marca.count({
          where: {
            user_id: userId,
            TipoMarca: 2,
            Activo: 1,
            Hora: { [Op.between]: [startOfDay(today), endOfDay(today)] },
          },
        });
        esInicio = descansosHoy % 2 !== 0;
      }
      sendMarkNotification(team, req.user, tipoMarca, hora, { esInicio }).catch(console.error);
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`team-${teamId}`).emit('attendance:mark-registered', {
        user_id: userId,
        tipoMarca,
        hora,
        idMarca: marca.idMarca,
      });
    }

    return res.json({ ok: true, idMarca: marca.idMarca, hora });
  } catch (error) {
    console.error('insertMarca error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/marks/list - Get marks by date/range
 */
exports.getMarcas = async (req, res) => {
  try {
    const { fecha, fechaInicio, fechaFin } = req.body;
    const userId = req.user.id;

    const where = { user_id: userId, Activo: 1 };

    if (fecha) {
      where.Hora = { [Op.between]: [startOfDay(fecha), endOfDay(fecha)] };
    } else if (fechaInicio && fechaFin) {
      where.Hora = { [Op.between]: [startOfDay(fechaInicio), endOfDay(fechaFin)] };
    }

    const marcas = await Marca.findAll({
      where,
      order: [['Hora', 'ASC']],
      attributes: ['idMarca', 'TipoMarca', 'Hora'],
    });

    const result = marcas.map(m => ({
      idMarca: m.idMarca,
      TipoMarca: m.TipoMarca,
      Fecha: m.Hora.toISOString().split('T')[0],
      Hora: m.Hora.toISOString().substr(11, 8),
    }));

    return res.json({ ok: true, marcas: result });
  } catch (error) {
    console.error('getMarcas error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/marks/today - Get today's marks
 */
exports.getMarcasHoy = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getToday();

    const marcas = await Marca.findAll({
      where: {
        user_id: userId,
        Activo: 1,
        Hora: { [Op.between]: [startOfDay(today), endOfDay(today)] },
      },
      order: [['Hora', 'ASC']],
    });

    return res.json({ ok: true, marcas });
  } catch (error) {
    console.error('getMarcasHoy error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/marks/workday - Calculate workday for a date
 */
exports.jornada = async (req, res) => {
  try {
    const { fecha } = req.body;
    const userId = req.user.id;
    const day = fecha || getToday();

    const marcas = await Marca.findAll({
      where: {
        user_id: userId,
        Activo: 1,
        Hora: { [Op.between]: [startOfDay(day), endOfDay(day)] },
      },
      order: [['Hora', 'ASC']],
      raw: true,
    });

    const brutasSeg = calcularHorasBrutas(marcas);
    const descansoSeg = calcularTiempoDescanso(marcas);
    const netasSeg = Math.max(0, brutasSeg - descansoSeg);

    return res.json({
      ok: true,
      fecha: day,
      horasBrutas: formatTime(brutasSeg),
      tiempoDescanso: formatTime(descansoSeg),
      horasNetas: formatTime(netasSeg),
      segundosBrutos: brutasSeg,
      segundosDescanso: descansoSeg,
      segundosNetos: netasSeg,
      estado: determinarEstado(marcas),
    });
  } catch (error) {
    console.error('jornada error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/marks/break - Get break detail for today
 */
exports.descanso = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getToday();

    const descansos = await Marca.findAll({
      where: {
        user_id: userId,
        TipoMarca: 2,
        Activo: 1,
        Hora: { [Op.between]: [startOfDay(today), endOfDay(today)] },
      },
      order: [['Hora', 'ASC']],
      raw: true,
    });

    const tiempoDescanso = calcularTiempoDescanso(descansos.map(d => ({ ...d, TipoMarca: 2 })));
    const descansoRestante = Math.max(0, 70 * 60 - tiempoDescanso);

    return res.json({
      ok: true,
      descansos: descansos.length,
      enDescanso: descansos.length % 2 !== 0,
      tiempoDescanso: formatTime(tiempoDescanso),
      descansoRestante: formatTime(descansoRestante),
      segundosDescanso: tiempoDescanso,
      segundosRestante: descansoRestante,
    });
  } catch (error) {
    console.error('descanso error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/marks/exit - Register retroactive exit
 */
exports.salida = async (req, res) => {
  try {
    const { fecha, hora } = req.body;
    const userId = req.user.id;
    const teamId = req.attendanceTeamId;

    if (!fecha || !hora) {
      return res.status(400).json({ ok: false, error: 'fecha y hora son requeridos' });
    }

    const datetime = `${fecha} ${hora}`;
    const marca = await Marca.create({
      TipoMarca: 3,
      Hora: new Date(datetime),
      user_id: userId,
      team_id: teamId,
      Activo: 1,
    });

    return res.json({ ok: true, idMarca: marca.idMarca });
  } catch (error) {
    console.error('salida error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
