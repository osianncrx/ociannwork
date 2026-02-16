'use strict';

const { Feriado } = require('../models');

/**
 * POST /api/attendance/holidays - Query holidays
 */
exports.feriados = async (req, res) => {
  try {
    let { fechaInicio, fechaFin } = req.body;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ ok: false, error: 'fechaInicio y fechaFin son requeridos' });
    }

    // Auto-correct if reversed
    if (fechaInicio > fechaFin) {
      [fechaInicio, fechaFin] = [fechaFin, fechaInicio];
    }

    const year = new Date(fechaInicio).getFullYear();
    const allFeriados = await Feriado.findAll({ raw: true });

    const filtered = allFeriados.filter(f => {
      const [dd, mm] = f.feriados.split('/');
      const fechaFeriado = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      return fechaFeriado >= fechaInicio && fechaFeriado <= fechaFin;
    });

    return res.json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    console.error('feriados error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
};
