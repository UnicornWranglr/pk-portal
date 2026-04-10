const { Router } = require('express');
const pool = require('../../db/pool');

const router = Router();

router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (req.query.action) {
    conditions.push(`a.action = $${paramIdx++}`);
    params.push(req.query.action);
  }
  if (req.query.entity_type) {
    conditions.push(`a.entity_type = $${paramIdx++}`);
    params.push(req.query.entity_type);
  }
  if (req.query.client_id) {
    conditions.push(`a.client_id = $${paramIdx++}`);
    params.push(parseInt(req.query.client_id));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) FROM audit_logs a ${where}`;
  const { rows: [{ count }] } = await pool.query(countQuery, params);

  const dataQuery = `
    SELECT a.*, c.name AS client_name
    FROM audit_logs a
    LEFT JOIN clients c ON c.id = a.client_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  const { rows } = await pool.query(dataQuery, [...params, limit, offset]);

  res.json({
    logs: rows,
    pagination: {
      page,
      limit,
      total: parseInt(count),
      pages: Math.ceil(parseInt(count) / limit),
    },
  });
});

// Distinct values for filter dropdowns
router.get('/filters', async (req, res) => {
  const [actions, entities, clients] = await Promise.all([
    pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action'),
    pool.query("SELECT DISTINCT entity_type FROM audit_logs WHERE entity_type IS NOT NULL ORDER BY entity_type"),
    pool.query('SELECT id, name FROM clients ORDER BY name'),
  ]);
  res.json({
    actions: actions.rows.map(r => r.action),
    entity_types: entities.rows.map(r => r.entity_type),
    clients: clients.rows,
  });
});

module.exports = router;
