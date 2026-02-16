'use strict';

const { Marca, User, Team, TeamMember, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getToday, startOfDay, endOfDay, formatTime } = require('../utils/timezone');
const { calcularHorasBrutas, calcularTiempoDescanso, determinarEstado } = require('../utils/attendance-calc');

/**
 * GET /api/attendance/status/dashboard - Real-time employee status
 */
exports.estadoEmpleados = async (req, res) => {
  try {
    const teamId = req.query.idEmpresa || req.attendanceTeamId;
    const today = getToday();

    // Get all active users in the team
    const members = await TeamMember.findAll({
      where: { team_id: teamId, status: 'active' },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'apellidos', 'puesto', 'status'],
          where: { status: 'active' },
        },
      ],
    });

    const empleados = [];
    const resumen = { trabajando: 0, descansando: 0, terminados: 0, sinRegistro: 0 };

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
      const ultimaMarca = marcas.length > 0 ? marcas[marcas.length - 1] : null;

      empleados.push({
        idUsuario: user.id,
        Nombre: user.name,
        Apellidos: user.apellidos || '',
        puesto: user.puesto || '',
        estado,
        horaEntrada: entrada ? new Date(entrada.Hora).toISOString().substr(11, 8) : null,
        ultimaMarca: ultimaMarca ? new Date(ultimaMarca.Hora).toISOString().substr(11, 8) : null,
        horasTrabajadas: formatTime(netasSeg),
        tiempoDescanso: formatTime(descansoSeg),
      });

      switch (estado) {
        case 'TRABAJANDO': resumen.trabajando++; break;
        case 'DESCANSANDO': resumen.descansando++; break;
        case 'TERMINADO': resumen.terminados++; break;
        default: resumen.sinRegistro++; break;
      }
    }

    return res.json({ ok: true, fecha: today, empleados, resumen });
  } catch (error) {
    console.error('estadoEmpleados error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/attendance/status/by-date - Employee status by date
 */
exports.estadoActual = async (req, res) => {
  try {
    const teamId = req.query.idEmpresa || req.attendanceTeamId;
    const fecha = req.query.fecha || getToday();

    const members = await TeamMember.findAll({
      where: { team_id: teamId, status: 'active' },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'apellidos', 'puesto'],
          where: { status: 'active' },
        },
      ],
    });

    const data = [];
    const tipoTextoMap = { 1: 'ENTRADA', 2: 'DESCANSO', 3: 'SALIDA' };

    for (const member of members) {
      const user = member.User;
      const marcas = await Marca.findAll({
        where: {
          user_id: user.id,
          Activo: 1,
          Hora: { [Op.between]: [startOfDay(fecha), endOfDay(fecha)] },
        },
        order: [['Hora', 'ASC']],
        raw: true,
      });

      if (marcas.length === 0) continue;

      const ultimaMarca = marcas[marcas.length - 1];

      data.push({
        idUsuario: user.id,
        nombre: user.name,
        apellidos: user.apellidos || '',
        estado: determinarEstado(marcas),
        ultimaHora: new Date(ultimaMarca.Hora).toISOString().substr(11, 8),
        marcas: marcas.map(m => ({
          hora: new Date(m.Hora).toISOString().substr(11, 8),
          tipo: m.TipoMarca,
          tipoTexto: tipoTextoMap[m.TipoMarca] || 'OTRO',
        })),
      });
    }

    return res.json({ success: true, fecha, data });
  } catch (error) {
    console.error('estadoActual error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
