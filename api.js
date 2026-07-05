/**
 * Aegis Attendance — API client
 *
 * All fetch() calls live here. app.js imports nothing from this file
 * directly (it's loaded as a plain script tag before app.js), so every
 * function is added to the global AegisAPI namespace.
 *
 * BASE_URL is read from window.AEGIS_API_URL (set in index.html) so the
 * same frontend bundle works in dev (localhost:4000) and production (Render/Railway URL).
 */

const AegisAPI = (() => {
  'use strict';

  function base() {
    // Configurable via window.AEGIS_API_URL; falls back to same-origin /api
    return (window.AEGIS_API_URL || '').replace(/\/$/, '');
  }

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(`${base()}${path}`, opts);
    const json = await res.json();

    if (!res.ok || !json.success) {
      const msg = json?.error?.message ?? `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json.data;
  }

  // ── Students ──────────────────────────────────────────────────────────

  /** Fetch all students with subjects */
  async function getStudents() {
    return request('GET', '/api/students');
  }

  /** Fetch a single student by ID */
  async function getStudent(id) {
    return request('GET', `/api/students/${encodeURIComponent(id)}`);
  }

  /** Create a new student */
  async function createStudent(payload) {
    return request('POST', '/api/students', payload);
  }

  /** Replace a student (PUT) */
  async function updateStudent(id, payload) {
    return request('PUT', `/api/students/${encodeURIComponent(id)}`, payload);
  }

  /**
   * Record one class check-in.
   * @param {string}  studentId
   * @param {number}  subjectId  — Prisma auto-increment id from the subjects table
   * @param {boolean} present
   */
  async function checkIn(studentId, subjectId, present) {
    return request('PATCH', `/api/students/${encodeURIComponent(studentId)}/checkin`, {
      subjectId,
      present,
    });
  }

  /** Delete a student */
  async function deleteStudent(id) {
    return request('DELETE', `/api/students/${encodeURIComponent(id)}`);
  }

  /**
   * Bulk upsert from spreadsheet import.
   * @param {object[]} studentList  — normalised student objects
   */
  async function bulkUpsert(studentList) {
    return request('POST', '/api/students/bulk', { students: studentList });
  }

  // ── AI ────────────────────────────────────────────────────────────────

  function aiConfig() {
    // Pull current threshold values from app-level globals if available
    const cfg = {};
    if (typeof threshold      !== 'undefined') cfg.threshold      = threshold;
    if (typeof borderlineLimit !== 'undefined') cfg.borderlineLimit = borderlineLimit;
    if (typeof criticalLimit   !== 'undefined') cfg.criticalLimit   = criticalLimit;
    return cfg;
  }

  /** Deep analysis narrative */
  async function analyzeStudent(studentId) {
    return request('POST', '/api/ai/analyze', { studentId, config: aiConfig() });
  }

  /** Step-by-step recovery plan */
  async function getRecoveryPlan(studentId) {
    return request('POST', '/api/ai/recovery', { studentId, config: aiConfig() });
  }

  /** 4 actionable recommendations (returns string[]) */
  async function getRecommendations(studentId) {
    return request('POST', '/api/ai/recommendations', { studentId, config: aiConfig() });
  }

  /**
   * Multi-turn agent chat.
   * @param {string}   studentId
   * @param {string}   message
   * @param {object[]} history  — [{role, content}] prior turns
   */
  async function chat(studentId, message, history = []) {
    return request('POST', '/api/ai/chat', {
      studentId,
      message,
      history,
      config: aiConfig(),
    });
  }

  // ── Health ────────────────────────────────────────────────────────────

  async function health() {
    return request('GET', '/api/health');
  }

  return {
    getStudents,
    getStudent,
    createStudent,
    updateStudent,
    checkIn,
    deleteStudent,
    bulkUpsert,
    analyzeStudent,
    getRecoveryPlan,
    getRecommendations,
    chat,
    health,
  };
})();
