'use strict';

const { formatTime, toDecimalHours } = require('./timezone');

const MAX_BREAK_SECONDS = 70 * 60; // 70 minutes max per break pair
const PROJECT_THRESHOLD_SECONDS = 32400; // 9 hours

/**
 * Calculate gross worked hours (first entry to last exit/current time)
 */
function calcularHorasBrutas(marcasDia) {
  const entradas = marcasDia.filter(m => m.TipoMarca === 1).sort((a, b) => new Date(a.Hora) - new Date(b.Hora));
  const salidas = marcasDia.filter(m => m.TipoMarca === 3).sort((a, b) => new Date(a.Hora) - new Date(b.Hora));

  if (entradas.length === 0) return 0;

  const primeraEntrada = new Date(entradas[0].Hora);
  let ultimaMarca;

  if (salidas.length > 0) {
    ultimaMarca = new Date(salidas[salidas.length - 1].Hora);
  } else {
    ultimaMarca = new Date();
  }

  return Math.max(0, Math.floor((ultimaMarca - primeraEntrada) / 1000));
}

/**
 * Calculate break time from paired break marks (TipoMarca=2)
 * Each pair is capped at 70 minutes
 */
function calcularTiempoDescanso(marcasDia) {
  const descansos = marcasDia
    .filter(m => m.TipoMarca === 2)
    .sort((a, b) => new Date(a.Hora) - new Date(b.Hora));

  let totalSeconds = 0;

  for (let i = 0; i < descansos.length - 1; i += 2) {
    const inicio = new Date(descansos[i].Hora);
    const fin = new Date(descansos[i + 1].Hora);
    const duracion = Math.floor((fin - inicio) / 1000);
    totalSeconds += Math.min(Math.max(0, duracion), MAX_BREAK_SECONDS);
  }

  // If odd number of breaks (currently on break), add time from last break start to now
  if (descansos.length % 2 !== 0) {
    const ultimoInicio = new Date(descansos[descansos.length - 1].Hora);
    const ahora = new Date();
    const duracion = Math.floor((ahora - ultimoInicio) / 1000);
    totalSeconds += Math.min(Math.max(0, duracion), MAX_BREAK_SECONDS);
  }

  return totalSeconds;
}

/**
 * Calculate net worked hours (gross - breaks)
 */
function calcularHorasNetas(marcasDia) {
  const brutas = calcularHorasBrutas(marcasDia);
  const descanso = calcularTiempoDescanso(marcasDia);
  return Math.max(0, brutas - descanso);
}

/**
 * Determine employee status from day's marks
 */
function determinarEstado(marcasDia) {
  if (!marcasDia || marcasDia.length === 0) return 'SIN_REGISTRO';

  const tieneEntrada = marcasDia.some(m => m.TipoMarca === 1);
  const tieneSalida = marcasDia.some(m => m.TipoMarca === 3);
  const cantidadDescansos = marcasDia.filter(m => m.TipoMarca === 2).length;

  if (tieneSalida) return 'TERMINADO';
  if (cantidadDescansos % 2 !== 0) return 'DESCANSANDO';
  if (tieneEntrada) return 'TRABAJANDO';
  return 'SIN_REGISTRO';
}

/**
 * Check if the 9-hour threshold for special projects is met
 */
function verificarUmbralProyectos(marcasDia) {
  const netasSegundos = calcularHorasNetas(marcasDia);
  return {
    alcanzoUmbral: netasSegundos >= PROJECT_THRESHOLD_SECONDS,
    segundosNetos: netasSegundos,
    horasNetas: formatTime(netasSegundos),
    umbralSegundos: PROJECT_THRESHOLD_SECONDS,
    umbralHoras: 9,
  };
}

/**
 * Calculate special project hours for a day
 */
function calcularHorasProyectos(marcasProyecto) {
  let totalSeconds = 0;
  for (const mp of marcasProyecto) {
    if (mp.horaEntrada && mp.horaSalida) {
      const entrada = new Date(mp.horaEntrada);
      const salida = new Date(mp.horaSalida);
      totalSeconds += Math.max(0, Math.floor((salida - entrada) / 1000));
    }
  }
  return totalSeconds;
}

/**
 * Full day calculation summary
 */
function resumenDia(marcasDia, marcasProyecto = []) {
  const brutasSegundos = calcularHorasBrutas(marcasDia);
  const descansoSegundos = calcularTiempoDescanso(marcasDia);
  const netasSegundos = Math.max(0, brutasSegundos - descansoSegundos);
  const proyectosSegundos = calcularHorasProyectos(marcasProyecto);

  return {
    horasBrutas: formatTime(brutasSegundos),
    tiempoDescanso: formatTime(descansoSegundos),
    horasNetas: formatTime(netasSegundos),
    horasProyectos: formatTime(proyectosSegundos),
    segundosBrutos: brutasSegundos,
    segundosDescanso: descansoSegundos,
    segundosNetos: netasSegundos,
    segundosProyectos: proyectosSegundos,
    horasNetasDecimal: toDecimalHours(netasSegundos),
    horasProyectosDecimal: toDecimalHours(proyectosSegundos),
    estado: determinarEstado(marcasDia),
  };
}

module.exports = {
  calcularHorasBrutas,
  calcularTiempoDescanso,
  calcularHorasNetas,
  determinarEstado,
  verificarUmbralProyectos,
  calcularHorasProyectos,
  resumenDia,
  MAX_BREAK_SECONDS,
  PROJECT_THRESHOLD_SECONDS,
};
