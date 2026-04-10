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
  const { display_name, email, user_type, status, end_date, removed_date, requires_office_license, project_id } = req.body;

  // Capture old values for audit
  const { rows: [old] } = await pool.query(
    'SELECT display_name, email, user_type, status, end_date, client_id, requires_office_license, project_id FROM users WHERE id = $1',
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
       project_id = $8
     WHERE id = $9 RETURNING *`,
    [display_name, email, user_type, status, end_date, removed_date,
     requires_office_license !== undefined ? requires_office_license : null,
     project_id !== undefined ? project_id : (old ? old.project_id : null),
     req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

  logAction({ action: 'update_user', entityType: 'user', entityId: rows[0].id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, clientId: old?.client_id, details: { old: { display_name: old?.display_name, user_type: old?.user_type, status: old?.status, requires_office_license: old?.requires_office_license, project_id: old?.project_id }, new: { display_name: rows[0].display_name, user_type: rows[0].user_type, status: rows[0].status, requires_office_license: rows[0].requires_office_license, project_id: rows[0].project_id } }, ip: getIp(req) });
  res.json(rows[0]);
});

module.exports = router;
