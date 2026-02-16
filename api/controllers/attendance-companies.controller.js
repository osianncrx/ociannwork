'use strict';

const { Team, TeamMember, Marca, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getToday, startOfDay, endOfDay } = require('../utils/timezone');

/**
 * GET /api/attendance/companies - List companies
 */
exports.listCompanies = async (req, res) => {
  try {
    const isSuperAdmin = req.user.es_super_admin_marcas || req.user.role === 'super_admin';
    let teams;

    if (isSuperAdmin) {
      teams = await Team.findAll({ order: [['name', 'ASC']] });
    } else {
      const membership = await TeamMember.findAll({
        where: { user_id: req.user.id, status: 'active' },
      });
      const teamIds = membership.map(m => m.team_id);
      teams = await Team.findAll({ where: { id: teamIds } });
    }

    const result = teams.map(t => ({
      idEmpresa: t.id,
      nombre: t.name,
      slug: t.slug || t.domain,
      logo: t.avatar,
      teamsWebhookUrl: t.teams_webhook_url
        ? t.teams_webhook_url.substring(0, 50) + '...'
        : null,
      teamsNotificaciones: t.teams_notificaciones,
      activo: t.activo_marcas,
    }));

    return res.json({ ok: true, empresas: result });
  } catch (error) {
    console.error('listCompanies error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/companies - Create company
 */
exports.createCompany = async (req, res) => {
  try {
    const { nombre, slug, teamsWebhookUrl, teamsNotificaciones } = req.body;

    if (!nombre || !slug) {
      return res.status(400).json({ ok: false, error: 'nombre y slug son requeridos' });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ ok: false, error: 'slug solo admite minúsculas, números y guiones' });
    }

    const existing = await Team.findOne({ where: { slug } });
    if (existing) {
      return res.status(400).json({ ok: false, error: 'El slug ya existe' });
    }

    const team = await Team.create({
      name: nombre,
      slug,
      domain: slug,
      teams_webhook_url: teamsWebhookUrl || null,
      teams_notificaciones: teamsNotificaciones !== false,
      activo_marcas: true,
      created_by: req.user.id,
    });

    return res.json({ ok: true, empresa: { idEmpresa: team.id, nombre: team.name, slug: team.slug } });
  } catch (error) {
    console.error('createCompany error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * PUT /api/attendance/companies/:id - Update company
 */
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, teamsWebhookUrl, teamsNotificaciones, activo } = req.body;

    const team = await Team.findByPk(id);
    if (!team) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });

    // Non-superadmin can only edit their own team
    const isSuperAdmin = req.user.es_super_admin_marcas || req.user.role === 'super_admin';
    if (!isSuperAdmin && req.attendanceTeamId !== team.id) {
      return res.status(403).json({ ok: false, error: 'No tiene permisos para editar esta empresa' });
    }

    await team.update({
      name: nombre !== undefined ? nombre : team.name,
      teams_webhook_url: teamsWebhookUrl !== undefined ? teamsWebhookUrl : team.teams_webhook_url,
      teams_notificaciones: teamsNotificaciones !== undefined ? teamsNotificaciones : team.teams_notificaciones,
      activo_marcas: activo !== undefined ? activo : team.activo_marcas,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('updateCompany error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/attendance/companies/:id/stats - Company stats
 */
exports.companyStats = async (req, res) => {
  try {
    const { id } = req.params;
    const today = getToday();

    const totalUsuarios = await TeamMember.count({
      where: { team_id: id, status: 'active' },
    });

    const marcasHoy = await Marca.count({
      where: {
        team_id: id,
        Activo: 1,
        Hora: { [Op.between]: [startOfDay(today), endOfDay(today)] },
      },
    });

    return res.json({ ok: true, totalUsuarios, marcasHoy });
  } catch (error) {
    console.error('companyStats error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
