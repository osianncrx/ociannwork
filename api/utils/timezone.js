'use strict';

const CR_OFFSET_MS = -6 * 60 * 60 * 1000; // UTC-6

/**
 * Get current date/time in Costa Rica timezone
 */
function getNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + CR_OFFSET_MS);
}

/**
 * Get today's date string in YYYY-MM-DD format (Costa Rica)
 */
function getToday() {
  return formatDate(getNow());
}

/**
 * Format a Date object to YYYY-MM-DD
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format seconds to HH:MM:SS
 */
function formatTime(totalSeconds) {
  const seconds = Math.abs(Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Convert seconds to decimal hours
 */
function toDecimalHours(seconds) {
  return Math.round((seconds / 3600) * 100) / 100;
}

/**
 * Get start of day (00:00:00) for a date in CR timezone
 */
function startOfDay(dateStr) {
  return new Date(`${dateStr}T00:00:00-06:00`);
}

/**
 * Get end of day (23:59:59) for a date in CR timezone
 */
function endOfDay(dateStr) {
  return new Date(`${dateStr}T23:59:59-06:00`);
}

/**
 * Parse a datetime string and return Date in CR context
 */
function parseCRDateTime(datetimeStr) {
  if (!datetimeStr) return null;
  if (datetimeStr instanceof Date) return datetimeStr;
  return new Date(datetimeStr);
}

/**
 * Get time portion HH:MM:SS from a Date
 */
function getTimeString(date) {
  if (!date) return null;
  if (typeof date === 'string') date = new Date(date);
  const crDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + CR_OFFSET_MS);
  const h = String(crDate.getHours()).padStart(2, '0');
  const m = String(crDate.getMinutes()).padStart(2, '0');
  const s = String(crDate.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

module.exports = {
  getNow,
  getToday,
  formatDate,
  formatTime,
  toDecimalHours,
  startOfDay,
  endOfDay,
  parseCRDateTime,
  getTimeString,
  CR_OFFSET_MS,
};
