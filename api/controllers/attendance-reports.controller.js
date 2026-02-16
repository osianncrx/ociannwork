'use strict';

const { Marca, User, Team, TeamMember, MarcaProyectoEspecial, Proyecto, Extra, Feriado, sequelize } = require('../models');
const { Op } = require('sequelize');
const { startOfDay, endOfDay, formatTime, toDecimalHours, formatDate } = require('../utils/timezone');
const { resumenDia } = require('../utils/attendance-calc');

/**
 * POST /api/attendance/reports/admin - Administrative report
 */
exports.reporte = async (req, res) => {
  try {
    const teamId = req.attendanceTeamId;
    const { fechaInicio, fechaFin, idUsuario } = req.body;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ ok: false, error: 'fechaInicio y fechaFin son requeridos' });
    }

    // Get users
    const userWhere = idUsuario ? { id: idUsuario, status: 'active' } : { status: 'active' };
    const members = await TeamMember.findAll({
      where: { team_id: teamId, status: 'active' },
      include: [{
        model: User,
        attributes: ['id', 'name', 'apellidos', 'puesto'],
        where: userWhere,
      }],
    });

    const registros = [];
    const reportesProyectos = {};

    // Generate date range
    const dates = [];
    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(formatDate(new Date(d)));
    }

    for (const member of members) {
      const user = member.User;

      for (const date of dates) {
        const marcas = await Marca.findAll({
          where: {
            user_id: user.id,
            Activo: 1,
            Hora: { [Op.between]: [startOfDay(date), endOfDay(date)] },
          },
          order: [['Hora', 'ASC']],
          raw: true,
        });

        if (marcas.length === 0) continue;

        const marcasProyecto = await MarcaProyectoEspecial.findAll({
          where: { user_id: user.id, fecha: date, activo: true },
          raw: true,
        });

        // Get accepted extras for the day
        const extras = await Extra.findAll({
          where: { user_id: user.id, fecha: date, aceptado: 1 },
          raw: true,
        });
        const totalExtras = extras.reduce((sum, e) => sum + e.totalextras, 0);

        const summary = resumenDia(marcas, marcasProyecto);

        registros.push({
          idUsuario: user.id,
          Nombre: user.name,
          Apellidos: user.apellidos || '',
          Fecha: date,
          HorasTrabajadasDia: summary.horasNetas,
          TiempoDescanso: summary.tiempoDescanso,
          TotalHorasUsuario: summary.horasNetasDecimal,
          HorasProyectosEspeciales: summary.horasProyectos,
          CantidadProyectos: marcasProyecto.length,
          HorasExtras: totalExtras,
        });

        // Detailed project reports
        if (idUsuario && marcasProyecto.length > 0) {
          const proyectoDetails = [];
          for (const mp of marcasProyecto) {
            const proyecto = await Proyecto.findByPk(mp.idProyecto);
            const diffSeg = mp.horaSalida
              ? Math.floor((new Date(mp.horaSalida) - new Date(mp.horaEntrada)) / 1000)
              : 0;
            proyectoDetails.push({
              nombreProyecto: proyecto ? proyecto.nombre : 'Desconocido',
              horaEntrada: new Date(mp.horaEntrada).toISOString().substr(11, 8),
              horaSalida: mp.horaSalida ? new Date(mp.horaSalida).toISOString().substr(11, 8) : null,
              reporte: mp.reporte,
              horasTrabajadas: formatTime(diffSeg),
            });
          }
          reportesProyectos[date] = proyectoDetails;
        }
      }
    }

    return res.json({
      ok: true,
      rango: { inicio: fechaInicio, fin: fechaFin },
      registros,
      reportesProyectos,
    });
  } catch (error) {
    console.error('reporte error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/reports/mine - Personal report
 */
exports.reporteMio = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fechaInicio, fechaFin } = req.body;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ ok: false, error: 'fechaInicio y fechaFin son requeridos' });
    }

    const tipoTextoMap = { 1: 'ENTRADA', 2: 'DESCANSO', 3: 'SALIDA' };

    // Generate date range
    const dates = [];
    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(formatDate(new Date(d)));
    }

    const reporte = [];
    let totalSegundosNetos = 0;
    let totalSegundosProyectos = 0;

    for (const date of dates) {
      const marcas = await Marca.findAll({
        where: {
          user_id: userId,
          Activo: 1,
          Hora: { [Op.between]: [startOfDay(date), endOfDay(date)] },
        },
        order: [['Hora', 'ASC']],
        raw: true,
      });

      if (marcas.length === 0) continue;

      const marcasProyecto = await MarcaProyectoEspecial.findAll({
        where: { user_id: userId, fecha: date, activo: true },
        raw: true,
      });

      const summary = resumenDia(marcas, marcasProyecto);
      totalSegundosNetos += summary.segundosNetos;
      totalSegundosProyectos += summary.segundosProyectos;

      reporte.push({
        idUsuario: userId,
        Nombre: req.user.name,
        Apellidos: req.user.apellidos || '',
        Fecha: date,
        HorasTrabajadasDia: summary.horasNetas,
        TiempoDescanso: summary.tiempoDescanso,
        HorasProyectosEspeciales: summary.horasProyectos,
        CantidadProyectos: marcasProyecto.length,
        marcas: marcas.map(m => ({
          tipo: tipoTextoMap[m.TipoMarca] || 'OTRO',
          tipoMarca: m.TipoMarca,
          hora: new Date(m.Hora).toISOString().substr(11, 8),
          horaCompleta: m.Hora,
        })),
      });
    }

    // Get holidays in range
    const feriados = await Feriado.findAll({ raw: true });
    const year = new Date(fechaInicio).getFullYear();
    const feriadosEnRango = feriados.filter(f => {
      const [dd, mm] = f.feriados.split('/');
      const fechaFeriado = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      return fechaFeriado >= fechaInicio && fechaFeriado <= fechaFin;
    });

    return res.json({
      ok: true,
      reporte,
      feriados: feriadosEnRango,
      totalHoras: formatTime(totalSegundosNetos),
      totalHorasProyectos: formatTime(totalSegundosProyectos),
    });
  } catch (error) {
    console.error('reporteMio error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
