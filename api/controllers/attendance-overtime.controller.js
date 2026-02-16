'use strict';

const { Extra, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { startOfDay, endOfDay } = require('../utils/timezone');

/**
 * POST /api/attendance/overtime - Request overtime
 */
exports.horasExtras = async (req, res) => {
  try {
    const { totalextras, motivo, fecha } = req.body;
    const userId = req.user.id;
    const teamId = req.attendanceTeamId;

    if (!totalextras || !motivo || !fecha) {
      return res.status(400).json({ ok: false, error: 'totalextras, motivo y fecha son requeridos' });
    }

    if (totalextras < 1 || totalextras > 24) {
      return res.status(400).json({ ok: false, error: 'totalextras debe estar entre 1 y 24' });
    }

    const extra = await Extra.create({
      totalextras,
      motivo,
      fecha,
      user_id: userId,
      team_id: teamId,
      aceptado: 3,
    });

    return res.json({ ok: true, id: extra.id });
  } catch (error) {
    console.error('horasExtras error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/overtime/mine - My overtime requests
 */
exports.extrasUsuario = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.body;
    const userId = req.user.id;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ ok: false, error: 'fechaInicio y fechaFin son requeridos' });
    }

    // Support both YYYYMMDD and YYYY-MM-DD formats
    const inicio = fechaInicio.includes('-') ? fechaInicio : `${fechaInicio.substr(0, 4)}-${fechaInicio.substr(4, 2)}-${fechaInicio.substr(6, 2)}`;
    const fin = fechaFin.includes('-') ? fechaFin : `${fechaFin.substr(0, 4)}-${fechaFin.substr(4, 2)}-${fechaFin.substr(6, 2)}`;

    const extras = await Extra.findAll({
      where: {
        user_id: userId,
        fecha: { [Op.between]: [inicio, fin] },
      },
      include: [{ model: User, as: 'usuario', attributes: ['id', 'name', 'apellidos'] }],
      order: [['fecha', 'DESC']],
    });

    const data = extras.map(e => ({
      id: e.id,
      totalextras: e.totalextras,
      motivo: e.motivo,
      nombreCompleto: e.usuario ? `${e.usuario.name} ${e.usuario.apellidos || ''}`.trim() : '',
      fecha: e.fecha,
      aceptado: e.aceptado,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('extrasUsuario error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/overtime/accepted - My accepted overtime
 */
exports.extrasRango = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.body;
    const userId = req.user.id;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ ok: false, error: 'fechaInicio y fechaFin son requeridos' });
    }

    const extras = await Extra.findAll({
      where: {
        user_id: userId,
        aceptado: 1,
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
      include: [{ model: User, as: 'usuario', attributes: ['id', 'name', 'apellidos'] }],
      order: [['fecha', 'DESC']],
    });

    const data = extras.map(e => ({
      id: e.id,
      totalextras: e.totalextras,
      motivo: e.motivo,
      nombreCompleto: e.usuario ? `${e.usuario.name} ${e.usuario.apellidos || ''}`.trim() : '',
      fecha: e.fecha,
      aceptado: e.aceptado,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('extrasRango error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/overtime/all - All overtime requests (admin view)
 */
exports.tablaExtras = async (req, res) => {
  try {
    const teamId = req.attendanceTeamId;
    const { fechaInicio, fechaFin } = req.body;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ ok: false, error: 'fechaInicio y fechaFin son requeridos' });
    }

    const inicio = fechaInicio.includes('-') ? fechaInicio : `${fechaInicio.substr(0, 4)}-${fechaInicio.substr(4, 2)}-${fechaInicio.substr(6, 2)}`;
    const fin = fechaFin.includes('-') ? fechaFin : `${fechaFin.substr(0, 4)}-${fechaFin.substr(4, 2)}-${fechaFin.substr(6, 2)}`;

    const extras = await Extra.findAll({
      where: {
        team_id: teamId,
        fecha: { [Op.between]: [inicio, fin] },
      },
      include: [{ model: User, as: 'usuario', attributes: ['id', 'name', 'apellidos'] }],
      order: [['fecha', 'DESC']],
    });

    const data = extras.map(e => ({
      id: e.id,
      totalextras: e.totalextras,
      motivo: e.motivo,
      nombreCompleto: e.usuario ? `${e.usuario.name} ${e.usuario.apellidos || ''}`.trim() : '',
      fecha: e.fecha,
      aceptado: e.aceptado,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('tablaExtras error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/overtime/approve - Approve/reject overtime
 */
exports.aceptarExtras = async (req, res) => {
  try {
    const { id, aceptado } = req.body;

    if (!id || (aceptado !== 0 && aceptado !== 1)) {
      return res.status(400).json({ ok: false, error: 'id y aceptado (0 o 1) son requeridos' });
    }

    const extra = await Extra.findByPk(id);
    if (!extra) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

    await extra.update({ aceptado });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${extra.user_id}`).emit('attendance:request-approved', {
        type: 'overtime',
        id: extra.id,
        aceptado,
      });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('aceptarExtras error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
