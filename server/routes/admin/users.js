const { Router } = require('express');
const pool = require('../../db/pool');
const { logAction, getIp } = require('../../services/audit');

const router = Router();

// List users for a client (with project name)
router.get('/clients/:clientId/users', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.*, p.name AS project_name
     FROM users u
     LEFT JOIN projects p ON p.id = u.project_id
     WHERE u.client_id = $1
     ORDER BY u.display_name`,
    [req.params.clientId]
  );
  res.json(rows);
});

// Update user
router.put('/users/:id', async (req, res) => {
  const { display_name, email, user_type, status, end_date, removed_date, requires_office_license, project_id, kingdom_license } = req.body;

  const { rows: [old] } = await pool.query(
    'SELECT display_name, email, user_type, status, end_date, client_id, requires_office_license, project_id, kingdom_license FROM users WHERE id = $1',
    [req.params.id]
  );

  const { rows } = await pool.query(
    `UPDATE users SET
       display_name = COALESCE($1, display_name),
       email = COALESCE($2, email),
       user_type = COALESCE($3, user_type),
       status = COALESCE($4, status),
       end_date = COALESCE($5, end_date),
       removed_date = COALESCE($6, removed_date),
       requires_office_license = COALESCE($7, requires_office_license),
       project_id = $8,
       kingdom_license = COALESCE($9, kingdom_license)
     WHERE id = $10 RETURNING *`,
    [display_name, email, user_type, status, end_date, removed_date,
     requires_office_license !== undefined ? requires_office_license : null,
     project_id !== undefined ? project_id : (old ? old.project_id : null),
     kingdom_license !== undefined ? kingdom_license : null,
     req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

  logAction({ action: 'update_user', entityType: 'user', entityId: rows[0].id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, clientId: old?.client_id, details: { old: { display_name: old?.display_name, user_type: old?.user_type, status: old?.status, kingdom_license: old?.kingdom_license }, new: { display_name: rows[0].display_name, user_type: rows[0].user_type, status: rows[0].status, kingdom_license: rows[0].kingdom_license } }, ip: getIp(req) });
  res.json(rows[0]);
});

// Kingdom usage — get usage days for a user in a given month
router.get('/users/:id/kingdom-usage', async (req, res) => {
  const { month } = req.query; // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month query param required in YYYY-MM format' });
  }
  const startDate = `${month}-01`;
  const endDate = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0).toISOString().slice(0, 10);

  const { rows } = await pool.query(
    `SELECT usage_date, source FROM kingdom_usage
     WHERE user_id = $1 AND usage_date >= $2 AND usage_date <= $3
     ORDER BY usage_date`,
    [req.params.id, startDate, endDate]
  );
  res.json(rows);
});

// Kingdom usage — toggle a day on/off
router.put('/users/:id/kingdom-usage', async (req, res) => {
  const { date, active } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });

  if (active) {
    await pool.query(
      `INSERT INTO kingdom_usage (user_id, usage_date, source) VALUES ($1, $2, 'manual')
       ON CONFLICT (user_id, usage_date) DO NOTHING`,
      [req.params.id, date]
    );
  } else {
    await pool.query(
      'DELETE FROM kingdom_usage WHERE user_id = $1 AND usage_date = $2',
      [req.params.id, date]
    );
  }

  logAction({ action: active ? 'add_kingdom_usage' : 'remove_kingdom_usage', entityType: 'user', entityId: parseInt(req.params.id), actorType: 'admin', actorId: req.user.id, actorName: req.user.name, details: { date, source: 'manual' }, ip: getIp(req) });
  res.json({ message: active ? 'Usage day added' : 'Usage day removed' });
});

module.exports = router;
