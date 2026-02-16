'use strict';

const { Proyecto, MarcaProyectoEspecial, Marca, Team, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getToday, startOfDay, endOfDay, formatTime } = require('../utils/timezone');
const { calcularHorasNetas, verificarUmbralProyectos, calcularTiempoDescanso, calcularHorasBrutas } = require('../utils/attendance-calc');
const { sendTeamsNotification } = require('../utils/teams-webhook');

/**
 * GET /api/attendance/projects - List projects
 */
exports.listProyectos = async (req, res) => {
  try {
    const teamId = req.attendanceTeamId;
    const proyectos = await Proyecto.findAll({
      where: { team_id: teamId, activo: true },
      order: [['nombre', 'ASC']],
    });
    return res.json({ ok: true, proyectos });
  } catch (error) {
    console.error('listProyectos error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/projects - Create project
 */
exports.createProyecto = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const teamId = req.attendanceTeamId;

    if (!nombre) return res.status(400).json({ ok: false, error: 'nombre es requerido' });

    const proyecto = await Proyecto.create({
      nombre,
      descripcion: descripcion || null,
      team_id: teamId,
      activo: true,
    });

    return res.json({ ok: true, proyecto });
  } catch (error) {
    console.error('createProyecto error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * PUT /api/attendance/projects/:id - Update project
 */
exports.updateProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;

    const proyecto = await Proyecto.findByPk(id);
    if (!proyecto) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });

    await proyecto.update({
      nombre: nombre !== undefined ? nombre : proyecto.nombre,
      descripcion: descripcion !== undefined ? descripcion : proyecto.descripcion,
      activo: activo !== undefined ? activo : proyecto.activo,
    });

    return res.json({ ok: true, proyecto });
  } catch (error) {
    console.error('updateProyecto error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * DELETE /api/attendance/projects/:id - Delete project
 */
exports.deleteProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const proyecto = await Proyecto.findByPk(id);
    if (!proyecto) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });

    const hasMarcas = await MarcaProyectoEspecial.count({ where: { idProyecto: id } });
    if (hasMarcas > 0) {
      await proyecto.update({ activo: false });
    } else {
      await proyecto.destroy();
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('deleteProyecto error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/projects/marks - Mark entry/exit for special project
 */
exports.insertMarcaProyecto = async (req, res) => {
  try {
    const { tipo, idProyecto, reporte, fecha, hora } = req.body;
    const userId = req.user.id;
    const teamId = req.attendanceTeamId;

    if (!tipo || !idProyecto) {
      return res.status(400).json({ ok: false, error: 'tipo e idProyecto son requeridos' });
    }

    const proyecto = await Proyecto.findOne({
      where: { idProyecto, team_id: teamId, activo: true },
    });
    if (!proyecto) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado o inactivo' });

    if (tipo === 'entrada') {
      // Check no open entry
      const abierta = await MarcaProyectoEspecial.findOne({
        where: { user_id: userId, horaSalida: null, activo: true },
      });
      if (abierta) {
        return res.status(400).json({ ok: false, error: 'Ya tiene una entrada de proyecto abierta' });
      }

      const now = hora ? new Date(hora) : new Date();
      const fechaHoy = fecha || getToday();

      const marca = await MarcaProyectoEspecial.create({
        user_id: userId,
        idProyecto,
        team_id: teamId,
        fecha: fechaHoy,
        horaEntrada: now,
        horaSalida: null,
        reporte: null,
        activo: true,
      });

      // Teams notification
      const team = await Team.findByPk(teamId);
      if (team && team.teams_webhook_url && team.teams_notificaciones) {
        const nombreCompleto = `${req.user.name} ${req.user.apellidos || ''}`.trim();
        sendTeamsNotification(team, 'proyecto_inicio', {
          title: `${nombreCompleto} ha iniciado proyecto "${proyecto.nombre}"`,
          user_id: userId,
          facts: [
            { name: 'Empleado', value: nombreCompleto },
            { name: 'Proyecto', value: proyecto.nombre },
          ],
        }).catch(console.error);
      }

      return res.json({ ok: true, mensaje: 'Entrada de proyecto registrada', idMarcaProyecto: marca.idMarcaProyecto });
    }

    if (tipo === 'salida') {
      if (!reporte) {
        return res.status(400).json({ ok: false, error: 'El reporte es obligatorio para registrar salida' });
      }

      const abierta = await MarcaProyectoEspecial.findOne({
        where: { user_id: userId, horaSalida: null, activo: true },
        order: [['horaEntrada', 'DESC']],
      });
      if (!abierta) {
        return res.status(400).json({ ok: false, error: 'No tiene entrada de proyecto abierta' });
      }

      const now = hora ? new Date(hora) : new Date();
      await abierta.update({ horaSalida: now, reporte });

      const diffMs = now - new Date(abierta.horaEntrada);
      const horasTrabajadas = formatTime(Math.floor(diffMs / 1000));

      // Teams notification
      const team = await Team.findByPk(teamId);
      if (team && team.teams_webhook_url && team.teams_notificaciones) {
        const nombreCompleto = `${req.user.name} ${req.user.apellidos || ''}`.trim();
        sendTeamsNotification(team, 'proyecto_fin', {
          title: `${nombreCompleto} ha terminado proyecto "${proyecto.nombre}"`,
          user_id: userId,
          facts: [
            { name: 'Empleado', value: nombreCompleto },
            { name: 'Proyecto', value: proyecto.nombre },
            { name: 'Horas', value: horasTrabajadas },
          ],
          text: `**Reporte:** ${reporte}`,
        }).catch(console.error);
      }

      return res.json({
        ok: true,
        mensaje: 'Salida de proyecto registrada',
        idMarcaProyecto: abierta.idMarcaProyecto,
        horasTrabajadas,
      });
    }

    return res.status(400).json({ ok: false, error: 'tipo debe ser "entrada" o "salida"' });
  } catch (error) {
    console.error('insertMarcaProyecto error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/projects/threshold - Check 9h threshold
 */
exports.verificarHorasProyectos = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fecha } = req.body;
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

    const umbral = verificarUmbralProyectos(marcas);
    const brutasSeg = calcularHorasBrutas(marcas);
    const descansoSeg = calcularTiempoDescanso(marcas);

    // Check open project
    const proyectoAbierto = await MarcaProyectoEspecial.findOne({
      where: { user_id: userId, horaSalida: null, activo: true },
      include: [{ model: Proyecto, as: 'proyecto', attributes: ['idProyecto', 'nombre'] }],
    });

    return res.json({
      ok: true,
      ...umbral,
      horasTrabajadas: formatTime(brutasSeg),
      horasDescansadas: formatTime(descansoSeg),
      proyectoAbierto: proyectoAbierto
        ? {
            idMarcaProyecto: proyectoAbierto.idMarcaProyecto,
            idProyecto: proyectoAbierto.idProyecto,
            nombreProyecto: proyectoAbierto.proyecto?.nombre,
            horaEntrada: proyectoAbierto.horaEntrada,
          }
        : null,
    });
  } catch (error) {
    console.error('verificarHorasProyectos error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
