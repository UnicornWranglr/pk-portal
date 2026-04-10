const { Router } = require('express');
const pool = require('../../db/pool');
const { logAction, getIp } = require('../../services/audit');

const router = Router();

// List users for a client
router.get('/clients/:clientId/users', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE client_id = $1 ORDER BY display_name',
    [req.params.clientId]
  );
  res.json(rows);
});

// Add user directly (admin bypass — no request needed)
router.post('/clients/:clientId/users', async (req, res) => {
  const { display_name, email, user_type, added_date } = req.body;
  if (!display_name || !user_type) {
    return res.status(400).json({ error: 'display_name and user_type required' });
  }

  const { rows } = await pool.query(
    `INSERT INTO users (client_id, display_name, email, user_type, added_date)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.params.clientId, display_name, email || null, user_type, added_date || new Date().toISOString().slice(0, 10)]
  );

  logAction({ action: 'create_user', entityType: 'user', entityId: rows[0].id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, clientId: parseInt(req.params.clientId), details: { display_name, email, user_type }, ip: getIp(req) });
  res.status(201).json(rows[0]);
});

// Update user
router.put('/users/:id', async (req, res) => {
  const { display_name, email, user_type, status, end_date, removed_date } = req.body;

  // Capture old values for audit
  const { rows: [old] } = await pool.query('SELECT display_name, email, user_type, status, end_date, client_id FROM users WHERE id = $1', [req.params.id]);

  const { rows } = await pool.query(
    `UPDATE users SET
       display_name = COALESCE($1, display_name),
       email = COALESCE($2, email),
       user_type = COALESCE($3, user_type),
       status = COALESCE($4, status),
       end_date = COALESCE($5, end_date),
       removed_date = COALESCE($6, removed_date)
     WHERE id = $7 RETURNING *`,
    [display_name, email, user_type, status, end_date, removed_date, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

  logAction({ action: 'update_user', entityType: 'user', entityId: rows[0].id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, clientId: old?.client_id, details: { old: { display_name: old?.display_name, email: old?.email, user_type: old?.user_type, status: old?.status, end_date: old?.end_date }, new: { display_name: rows[0].display_name, email: rows[0].email, user_type: rows[0].user_type, status: rows[0].status, end_date: rows[0].end_date } }, ip: getIp(req) });
  res.json(rows[0]);
});

module.exports = router;
