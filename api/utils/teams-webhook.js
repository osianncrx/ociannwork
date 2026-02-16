'use strict';

const axios = require('axios');
const { TeamsNotificationLog } = require('../models');

const COLORS = {
  entrada: '#10b981',
  descanso_inicio: '#f59e0b',
  descanso_fin: '#f59e0b',
  salida: '#ef4444',
  proyecto_inicio: '#3b82f6',
  proyecto_fin: '#3b82f6',
  reporte_diario: '#6366f1',
};

const EMOJIS = {
  entrada: '🟢',
  descanso_inicio: '☕',
  descanso_fin: '☕',
  salida: '🔴',
  proyecto_inicio: '📂',
  proyecto_fin: '📂',
  reporte_diario: '📊',
};

/**
 * Send a notification to Microsoft Teams via webhook
 */
async function sendTeamsNotification(team, tipoEvento, data) {
  if (!team.teams_webhook_url || !team.teams_notificaciones) return null;

  const emoji = EMOJIS[tipoEvento] || '📌';
  const color = COLORS[tipoEvento] || '#3b82f6';
  const title = `${emoji} ${data.title || 'Notificación de Asistencia'}`;

  const card = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: color.replace('#', ''),
    summary: title,
    sections: [
      {
        activityTitle: title,
        activitySubtitle: data.subtitle || team.name,
        facts: data.facts || [],
        text: data.text || '',
        markdown: true,
      },
    ],
  };

  let exitoso = false;
  let respuestaTeams = '';

  try {
    const response = await axios.post(team.teams_webhook_url, card, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    exitoso = response.status >= 200 && response.status < 300;
    respuestaTeams = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  } catch (error) {
    respuestaTeams = error.message;
  }

  await logNotification({
    team_id: team.id,
    user_id: data.user_id || null,
    tipoEvento,
    mensaje: JSON.stringify(card),
    respuestaTeams,
    exitoso,
  });

  return exitoso;
}

/**
 * Send a daily employee status report to Teams
 */
async function sendTeamsDailyReport(team, empleados) {
  const activos = empleados.filter(e => e.estado !== 'SIN_REGISTRO');

  if (activos.length === 0) return null;

  const rows = activos.map(e => {
    return `| ${e.nombre} | ${e.estado} | ${e.horaEntrada || '-'} | ${e.ultimaMarca || '-'} | ${e.horasTrabajadas || '00:00:00'} |`;
  });

  const text = [
    '| Empleado | Estado | Entrada | Última Marca | Horas |',
    '|----------|--------|---------|-------------|-------|',
    ...rows,
  ].join('\n');

  return sendTeamsNotification(team, 'reporte_diario', {
    title: 'Reporte Diario de Asistencia',
    subtitle: `${team.name} - ${new Date().toLocaleDateString('es-CR')}`,
    text,
    facts: [
      { name: 'Trabajando', value: String(empleados.filter(e => e.estado === 'TRABAJANDO').length) },
      { name: 'Descansando', value: String(empleados.filter(e => e.estado === 'DESCANSANDO').length) },
      { name: 'Terminados', value: String(empleados.filter(e => e.estado === 'TERMINADO').length) },
    ],
  });
}

/**
 * Log a Teams notification to the database
 */
async function logNotification(data) {
  try {
    await TeamsNotificationLog.create(data);
  } catch (error) {
    console.error('Error logging Teams notification:', error.message);
  }
}

/**
 * Send mark notification to Teams
 */
async function sendMarkNotification(team, user, tipoMarca, hora, extraData = {}) {
  const nombreCompleto = `${user.name} ${user.apellidos || ''}`.trim();
  const horaStr = new Date(hora).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });

  const tipoEventoMap = {
    1: 'entrada',
    2: extraData.esInicio ? 'descanso_inicio' : 'descanso_fin',
    3: 'salida',
  };

  const tipoTextoMap = {
    1: 'ENTRADA',
    2: extraData.esInicio ? 'inicio de DESCANSO' : 'fin de DESCANSO',
    3: 'SALIDA',
  };

  const tipoEvento = tipoEventoMap[tipoMarca] || 'entrada';
  const tipoTexto = tipoTextoMap[tipoMarca] || 'marca';

  return sendTeamsNotification(team, tipoEvento, {
    title: `${nombreCompleto} ha registrado su ${tipoTexto}`,
    subtitle: `a las ${horaStr}`,
    user_id: user.id,
    facts: [
      { name: 'Empleado', value: nombreCompleto },
      { name: 'Tipo', value: tipoTexto },
      { name: 'Hora', value: horaStr },
    ],
  });
}

module.exports = {
  sendTeamsNotification,
  sendTeamsDailyReport,
  logNotification,
  sendMarkNotification,
};
