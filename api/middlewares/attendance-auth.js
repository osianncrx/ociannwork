'use strict';

const jwt = require('jsonwebtoken');
const { User, Team, TeamMember } = require('../models');

/**
 * Authenticate for attendance module - verifies JWT and loads attendance data
 * Sets req.user and req.attendanceTeamId
 */
exports.requireAttendanceAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token de autorización requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Usuario no encontrado' });
    }

    req.user = user;
    req.token = token;

    // Determine attendance team from header or user's first team
    const teamId = req.header('X-Team-ID');
    if (teamId) {
      req.attendanceTeamId = parseInt(teamId, 10);
    } else {
      const membership = await TeamMember.findOne({
        where: { user_id: user.id, status: 'active' },
      });
      req.attendanceTeamId = membership ? membership.team_id : null;
    }

    next();
  } catch (err) {
    return res.status(403).json({ ok: false, error: 'Token inválido o expirado' });
  }
};

/**
 * Require attendance admin role (tipo_permiso_marcas >= 1)
 */
exports.requireAttendanceAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'No autenticado' });
  }
  if (req.user.es_super_admin_marcas) return next();
  if (req.user.tipo_permiso_marcas >= 1) return next();
  return res.status(403).json({ ok: false, error: 'Permisos insuficientes: se requiere rol de administrador' });
};

/**
 * Require super admin for attendance (multi-tenant management)
 */
exports.requireSuperAdminMarcas = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'No autenticado' });
  }
  if (req.user.es_super_admin_marcas || req.user.role === 'super_admin') return next();
  return res.status(403).json({ ok: false, error: 'Permisos insuficientes: se requiere SuperAdmin' });
};

/**
 * Require specific attendance roles
 * @param {number[]} roles - Array of allowed tipo_permiso_marcas values
 */
exports.requireAttendanceRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'No autenticado' });
    }
    if (req.user.es_super_admin_marcas || req.user.role === 'super_admin') return next();
    if (roles.includes(req.user.tipo_permiso_marcas)) return next();
    return res.status(403).json({ ok: false, error: 'Permisos insuficientes para esta acción' });
  };
};

/**
 * Require admin or superuser for approval actions
 */
exports.requireApprovalRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'No autenticado' });
  }
  if (req.user.es_super_admin_marcas || req.user.role === 'super_admin') return next();
  if (req.user.tipo_permiso_marcas === 1 || req.user.tipo_permiso_marcas === 3) return next();
  return res.status(403).json({ ok: false, error: 'Permisos insuficientes para aprobar/rechazar' });
};
