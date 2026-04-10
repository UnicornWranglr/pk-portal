const { Router } = require('express');
const pool = require('../../db/pool');

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
  res.status(201).json(rows[0]);
});

// Update user
router.put('/users/:id', async (req, res) => {
  const { display_name, email, user_type, status, end_date, removed_date } = req.body;
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
  res.json(rows[0]);
});

module.exports = router;
