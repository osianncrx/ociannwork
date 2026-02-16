'use strict';

const { EditarMarca, Marca, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getToday, startOfDay, endOfDay } = require('../utils/timezone');

/**
 * POST /api/attendance/marks/edit - Request mark edit
 */
exports.editarMarca = async (req, res) => {
  try {
    const { idMarca, fecha } = req.body;
    const userId = req.user.id;
    const teamId = req.attendanceTeamId;

    if (!idMarca || !fecha) {
      return res.status(400).json({ ok: false, error: 'idMarca y fecha son requeridos' });
    }

    // Verify mark belongs to user
    if (idMarca > 0) {
      const marca = await Marca.findOne({ where: { idMarca, user_id: userId } });
      if (!marca) {
        return res.status(404).json({ ok: false, error: 'Marca no encontrada' });
      }
    }

    const solicitud = await EditarMarca.create({
      idMarca,
      user_id: userId,
      team_id: teamId,
      Hora: new Date(fecha),
      tipoSolicitud: 0,
      aprobado: 0,
      eliminado: 0,
    });

    return res.json({ ok: true, id: solicitud.id });
  } catch (error) {
    console.error('editarMarca error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/marks/edit/approve - Approve edit request
 */
exports.aprobarEditarMarca = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ ok: false, error: 'id es requerido' });

    const solicitud = await EditarMarca.findByPk(id);
    if (!solicitud) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

    const t = await sequelize.transaction();
    try {
      await solicitud.update({ aprobado: 1, eliminado: 0 }, { transaction: t });

      let tipo = 'edicion';
      let idMarcaResult = solicitud.idMarca;

      if (solicitud.idMarca > 0) {
        // Edit existing mark
        await Marca.update(
          { Hora: solicitud.Hora },
          { where: { idMarca: solicitud.idMarca }, transaction: t }
        );
      } else {
        // Create new mark
        const tipoMarcaMap = { 1: 1, 2: 2, 3: 3 };
        const tipoMarca = tipoMarcaMap[solicitud.tipoSolicitud] || 3;

        const nuevaMarca = await Marca.create(
          {
            TipoMarca: tipoMarca,
            Hora: solicitud.Hora,
            user_id: solicitud.user_id,
            team_id: solicitud.team_id,
            Activo: 1,
          },
          { transaction: t }
        );

        await solicitud.update({ idMarca: nuevaMarca.idMarca }, { transaction: t });
        tipo = 'nueva_marca';
        idMarcaResult = nuevaMarca.idMarca;
      }

      await t.commit();

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`user-${solicitud.user_id}`).emit('attendance:request-approved', {
          id: solicitud.id,
          aprobado: true,
        });
      }

      return res.json({ success: true, tipo, idMarca: idMarcaResult });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (error) {
    console.error('aprobarEditarMarca error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/marks/edit/reject - Reject edit request
 */
exports.eliminarEditarMarca = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ ok: false, error: 'id es requerido' });

    const solicitud = await EditarMarca.findByPk(id);
    if (!solicitud) return res.status(404).json({ ok: false, error: 'Solicitud no encontrada' });

    await solicitud.update({ aprobado: 0, eliminado: 1 });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${solicitud.user_id}`).emit('attendance:request-approved', {
        id: solicitud.id,
        aprobado: false,
      });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('eliminarEditarMarca error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/marks/edit/mine - My edit requests
 */
exports.marcasEditadas = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getToday();
    const { fechaInicio, fechaFin } = req.body;

    const inicio = fechaInicio || `${today.substring(0, 7)}-01`;
    const fin = fechaFin || today;

    const solicitudes = await EditarMarca.findAll({
      where: {
        user_id: userId,
        Hora: { [Op.between]: [startOfDay(inicio), endOfDay(fin)] },
      },
      order: [['Hora', 'DESC']],
      limit: 50,
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'name', 'apellidos'],
        },
      ],
    });

    const result = solicitudes.map(s => ({
      id: s.id,
      idMarca: s.idMarca,
      Hora: s.Hora,
      tipoSolicitud: s.tipoSolicitud,
      aprobado: s.aprobado,
      eliminado: s.eliminado,
      esSolicitudNueva: s.idMarca === 0,
      tipoTexto: ['Edición', 'Entrada', 'Descanso', 'Salida'][s.tipoSolicitud] || 'Edición',
    }));

    return res.json({ ok: true, solicitudes: result });
  } catch (error) {
    console.error('marcasEditadas error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/marks/edit/all - All edit requests (admin)
 */
exports.marcasEditadasTodas = async (req, res) => {
  try {
    const teamId = req.attendanceTeamId;
    const { fechaInicio, fechaFin, soloPendientes } = req.body;
    const today = getToday();

    const inicio = fechaInicio || `${today.substring(0, 7)}-01`;
    const fin = fechaFin || today;
    const pendientes = soloPendientes !== false;

    const where = {
      team_id: teamId,
      Hora: { [Op.between]: [startOfDay(inicio), endOfDay(fin)] },
    };

    if (pendientes) {
      where.aprobado = 0;
      where.eliminado = 0;
    }

    const solicitudes = await EditarMarca.findAll({
      where,
      order: [['Hora', 'DESC']],
      limit: 100,
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'name', 'apellidos', 'email'],
        },
      ],
    });

    const result = solicitudes.map(s => ({
      id: s.id,
      idMarca: s.idMarca,
      Hora: s.Hora,
      tipoSolicitud: s.tipoSolicitud,
      aprobado: s.aprobado,
      eliminado: s.eliminado,
      esSolicitudNueva: s.idMarca === 0,
      tipoTexto: ['Edición', 'Entrada', 'Descanso', 'Salida'][s.tipoSolicitud] || 'Edición',
      nombreCompleto: s.usuario ? `${s.usuario.name} ${s.usuario.apellidos || ''}`.trim() : 'Desconocido',
      correo: s.usuario ? s.usuario.email : '',
    }));

    return res.json({ ok: true, solicitudes: result });
  } catch (error) {
    console.error('marcasEditadasTodas error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/marks/edit/missing-exit - Days without exit
 */
exports.diasSinSalida = async (req, res) => {
  try {
    const userId = req.user.id;
    const { diasAtras } = req.body;
    const dias = diasAtras || 30;
    const today = getToday();

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];

    // Get all marks in the range
    const marcas = await Marca.findAll({
      where: {
        user_id: userId,
        Activo: 1,
        Hora: { [Op.between]: [startOfDay(fechaLimiteStr), endOfDay(today)] },
      },
      order: [['Hora', 'ASC']],
      raw: true,
    });

    // Group by date
    const porDia = {};
    for (const m of marcas) {
      const fecha = new Date(m.Hora).toISOString().split('T')[0];
      if (fecha === today) continue; // Exclude today
      if (!porDia[fecha]) porDia[fecha] = { entradas: 0, salidas: 0, horaEntrada: null };
      if (m.TipoMarca === 1) {
        porDia[fecha].entradas++;
        if (!porDia[fecha].horaEntrada) porDia[fecha].horaEntrada = m.Hora;
      }
      if (m.TipoMarca === 3) porDia[fecha].salidas++;
    }

    // Get pending exit requests
    const pendientes = await EditarMarca.findAll({
      where: {
        user_id: userId,
        tipoSolicitud: 3,
        aprobado: 0,
        eliminado: 0,
      },
      raw: true,
    });
    const fechasPendientes = new Set(pendientes.map(p => new Date(p.Hora).toISOString().split('T')[0]));

    // Filter days with missing exits
    const result = [];
    for (const [fecha, data] of Object.entries(porDia)) {
      if (data.entradas > data.salidas) {
        result.push({
          fecha,
          horaEntrada: data.horaEntrada ? new Date(data.horaEntrada).toISOString().substr(11, 8) : null,
          totalEntradas: data.entradas,
          totalSalidas: data.salidas,
          faltantes: data.entradas - data.salidas,
          tieneSolicitudPendiente: fechasPendientes.has(fecha),
        });
      }
    }

    result.sort((a, b) => b.fecha.localeCompare(a.fecha));

    return res.json({ ok: true, dias: result.slice(0, 30) });
  } catch (error) {
    console.error('diasSinSalida error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/marks/edit/request-exit - Request missing exit
 */
exports.solicitarSalidaFaltante = async (req, res) => {
  try {
    const { fecha, hora } = req.body;
    const userId = req.user.id;
    const teamId = req.attendanceTeamId;

    if (!fecha || !hora) {
      return res.status(400).json({ ok: false, error: 'fecha y hora son requeridos' });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ ok: false, error: 'Formato de fecha inválido (YYYY-MM-DD)' });
    }
    if (!/^\d{2}:\d{2}$/.test(hora)) {
      return res.status(400).json({ ok: false, error: 'Formato de hora inválido (HH:MM)' });
    }

    // Verify entry exists for that day
    const entradas = await Marca.count({
      where: {
        user_id: userId,
        TipoMarca: 1,
        Activo: 1,
        Hora: { [Op.between]: [startOfDay(fecha), endOfDay(fecha)] },
      },
    });
    if (entradas === 0) {
      return res.status(400).json({ ok: false, error: 'No hay entrada registrada para ese día' });
    }

    // Verify missing exit
    const salidas = await Marca.count({
      where: {
        user_id: userId,
        TipoMarca: 3,
        Activo: 1,
        Hora: { [Op.between]: [startOfDay(fecha), endOfDay(fecha)] },
      },
    });
    if (salidas >= entradas) {
      return res.status(400).json({ ok: false, error: 'No faltan salidas para ese día' });
    }

    // Check no pending request
    const pendiente = await EditarMarca.findOne({
      where: {
        user_id: userId,
        tipoSolicitud: 3,
        aprobado: 0,
        eliminado: 0,
        Hora: { [Op.between]: [startOfDay(fecha), endOfDay(fecha)] },
      },
    });
    if (pendiente) {
      return res.status(400).json({ ok: false, error: 'Ya existe una solicitud pendiente para ese día' });
    }

    const datetime = `${fecha}T${hora}:00-06:00`;
    const solicitud = await EditarMarca.create({
      idMarca: 0,
      user_id: userId,
      team_id: teamId,
      Hora: new Date(datetime),
      tipoSolicitud: 3,
      aprobado: 0,
      eliminado: 0,
    });

    return res.json({ ok: true, id: solicitud.id });
  } catch (error) {
    console.error('solicitarSalidaFaltante error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
