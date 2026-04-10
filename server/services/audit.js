const pool = require('../db/pool');

/**
 * Log an action to the audit trail. Fire-and-forget — never blocks the caller.
 */
function logAction({ action, entityType, entityId, actorType, actorId, actorName, clientId, details, ip }) {
  pool.query(
    `INSERT INTO audit_logs (action, entity_type, entity_id, actor_type, actor_id, actor_name, client_id, details, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      action,
      entityType || null,
      entityId || null,
      actorType || null,
      actorId || null,
      actorName || null,
      clientId || null,
      details ? JSON.stringify(details) : null,
      ip || null,
    ]
  ).catch(err => console.error('Audit log write failed:', err.message));
}

/**
 * Extract client IP from request (handles proxies).
 */
function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

module.exports = { logAction, getIp };
