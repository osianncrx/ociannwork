'use strict';

const bcrypt = require('bcryptjs');
const { User, TeamMember, CuentaBancaria, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/attendance/users - List users of a team
 */
exports.listUsers = async (req, res) => {
  try {
    const teamId = req.query.idEmpresa || req.attendanceTeamId;

    const members = await TeamMember.findAll({
      where: { team_id: teamId },
      include: [{
        model: User,
        attributes: [
          'id', 'name', 'apellidos', 'email', 'puesto', 'status',
          'tipo_permiso_marcas', 'id_persona', 'fecha_entrada', 'avatar',
          'firsttime', 'es_super_admin_marcas',
        ],
      }],
      order: [[User, 'name', 'ASC']],
    });

    const usuarios = members.map(m => ({
      idUsuario: m.User.id,
      idPersona: m.User.id_persona,
      Nombre: m.User.name,
      Apellidos: m.User.apellidos || '',
      correo: m.User.email,
      puesto: m.User.puesto || '',
      tipoPermiso: m.User.tipo_permiso_marcas,
      activo: m.User.status === 'active',
      FechaEntrada: m.User.fecha_entrada,
      avatar: m.User.avatar,
      firsttime: m.User.firsttime,
      rolTeam: m.role,
    }));

    return res.json({ ok: true, usuarios });
  } catch (error) {
    console.error('listUsers error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/users - Create user
 */
exports.createUser = async (req, res) => {
  try {
    const {
      idPersona, Nombre, Apellidos, puesto, FechaEntrada,
      correo, contrasena, tipoPermiso,
    } = req.body;
    const teamId = req.attendanceTeamId;

    if (!Nombre || !correo || !contrasena) {
      return res.status(400).json({ ok: false, error: 'Nombre, correo y contraseña son requeridos' });
    }

    // Check email uniqueness
    const existing = await User.findOne({ where: { email: correo } });
    if (existing) {
      return res.status(400).json({ ok: false, error: 'El correo ya está en uso' });
    }

    // Check id_persona uniqueness if provided
    if (idPersona) {
      const existingPersona = await User.findOne({ where: { id_persona: idPersona } });
      if (existingPersona) {
        return res.status(400).json({ ok: false, error: 'El ID de persona ya existe' });
      }
    }

    const t = await sequelize.transaction();
    try {
      const hashedPassword = await bcrypt.hash(contrasena, 10);

      const user = await User.create({
        name: Nombre,
        apellidos: Apellidos || null,
        email: correo,
        password: hashedPassword,
        puesto: puesto || null,
        fecha_entrada: FechaEntrada || null,
        id_persona: idPersona || null,
        tipo_permiso_marcas: tipoPermiso || 0,
        firsttime: true,
        status: 'active',
        role: 'user',
      }, { transaction: t });

      await TeamMember.create({
        team_id: teamId,
        user_id: user.id,
        role: tipoPermiso >= 1 ? 'admin' : 'member',
        status: 'active',
      }, { transaction: t });

      await t.commit();

      return res.json({ ok: true, idUsuario: user.id });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (error) {
    console.error('createUser error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * PUT /api/attendance/users/:id - Update user
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { Nombre, Apellidos, puesto, correo, contrasena, tipoPermiso, activo } = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    // Check email uniqueness
    if (correo && correo !== user.email) {
      const existing = await User.findOne({ where: { email: correo, id: { [Op.ne]: id } } });
      if (existing) {
        return res.status(400).json({ ok: false, error: 'El correo ya está en uso por otro usuario' });
      }
    }

    const updateData = {};
    if (Nombre !== undefined) updateData.name = Nombre;
    if (Apellidos !== undefined) updateData.apellidos = Apellidos;
    if (puesto !== undefined) updateData.puesto = puesto;
    if (correo !== undefined) updateData.email = correo;
    if (tipoPermiso !== undefined) updateData.tipo_permiso_marcas = tipoPermiso;
    if (activo !== undefined) updateData.status = activo ? 'active' : 'deactive';

    if (contrasena) {
      updateData.password = await bcrypt.hash(contrasena, 10);
    }

    await user.update(updateData);

    return res.json({ ok: true });
  } catch (error) {
    console.error('updateUser error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/attendance/users/:id - Get single user
 */
exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: [
        'id', 'name', 'apellidos', 'email', 'puesto', 'status',
        'tipo_permiso_marcas', 'id_persona', 'fecha_entrada', 'avatar',
        'firsttime', 'es_super_admin_marcas',
      ],
    });

    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    return res.json({ ok: true, usuario: user });
  } catch (error) {
    console.error('getUser error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/attendance/users/bank-accounts - Register bank account
 */
exports.registerBankAccount = async (req, res) => {
  try {
    const { cuenta, banca, tipoCuenta } = req.body;
    const userId = req.user.id;
    const teamId = req.attendanceTeamId;

    if (!cuenta || !banca || !tipoCuenta) {
      return res.status(400).json({ ok: false, error: 'cuenta, banca y tipoCuenta son requeridos' });
    }

    if (!/^[\d-]+$/.test(cuenta)) {
      return res.status(400).json({ ok: false, error: 'La cuenta solo puede contener dígitos y guiones' });
    }

    const cuentaBancaria = await CuentaBancaria.create({
      user_id: userId,
      team_id: teamId,
      cuenta,
      banca,
      tipoCuenta,
    });

    return res.json({ ok: true, idCuenta: cuentaBancaria.idCuenta });
  } catch (error) {
    console.error('registerBankAccount error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/attendance/users/bank-accounts - List bank accounts
 */
exports.listBankAccounts = async (req, res) => {
  try {
    const teamId = req.attendanceTeamId;

    const cuentas = await CuentaBancaria.findAll({
      where: { team_id: teamId },
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'name', 'apellidos', 'email'],
      }],
    });

    return res.json({ ok: true, cuentas });
  } catch (error) {
    console.error('listBankAccounts error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
