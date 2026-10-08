const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * Audit logging utility.
 * Can be used as middleware for automatic route logging,
 * or called directly for specific events.
 */
function logAudit(applicationId, action, entityType, entityId, metadata = {}, userId = 'system') {
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, application_id, user_id, action, entity_type, entity_id, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      applicationId || null,
      userId,
      action,
      entityType || null,
      entityId || null,
      JSON.stringify(metadata),
      new Date().toISOString()
    );
  } catch (err) {
    // Audit logging should never crash the request
    console.error('[AUDIT] Failed to log:', err.message);
  }
}

/**
 * Express middleware that logs API requests automatically.
 * Skips GET requests to reduce noise.
 */
function auditMiddleware(req, res, next) {
  // Only audit state-changing operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      // Log after response is sent
      if (body && body.success) {
        const appId = req.params.id || req.body?.application_id || null;
        logAudit(
          appId,
          `${req.method} ${req.originalUrl}`,
          'api_request',
          null,
          { method: req.method, path: req.originalUrl, statusCode: res.statusCode }
        );
      }
      return originalJson(body);
    };
  }
  next();
}

module.exports = auditMiddleware;
module.exports.logAudit = logAudit;