const { Router } = require('express');
const pool = require('../../db/pool');
const { logAction, getIp } = require('../../services/audit');

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, u.display_name AS target_user_name, p.name AS project_name
     FROM requests r
     LEFT JOIN users u ON u.id = r.user_id
     LEFT JOIN projects p ON p.id = r.requested_project_id
     WHERE r.client_id = $1
     ORDER BY r.submitted_at DESC`,
    [req.clientId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const {
    type, user_id, requested_user_name, requested_user_email,
    requested_user_type, requested_end_date, requested_start_date,
    requested_office_license, requested_kingdom_license, requested_project_id, notes,
  } = req.body;

  if (!type || !['add', 'remove', 'change_type', 'move_project'].includes(type)) {
    return res.status(400).json({ error: 'Valid type required: add, remove, change_type, move_project' });
  }

  if (type === 'add' && (!requested_user_name || !requested_user_type)) {
    return res.status(400).json({ error: 'requested_user_name and requested_user_type required for add requests' });
  }

  if ((type === 'remove' || type === 'change_type') && !user_id) {
    return res.status(400).json({ error: 'user_id required for remove/change_type requests' });
  }

  if (type === 'move_project' && (!user_id || !requested_project_id)) {
    return res.status(400).json({ error: 'user_id and requested_project_id required for move_project requests' });
  }

  // Verify user belongs to this client for remove/change_type/move_project
  if (user_id) {
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND client_id = $2',
      [user_id, req.clientId]
    );
    if (rows.length === 0) {
      return res.status(403).json({ error: 'User does not belong to your organisation' });
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO requests (client_id, type, requested_by, user_id, requested_user_name, requested_user_email,
       requested_user_type, requested_end_date, requested_start_date, requested_office_license, requested_project_id, notes, requested_kingdom_license)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      req.clientId, type, req.user.id, user_id || null,
      requested_user_name || null, requested_user_email || null,
      requested_user_type || null, requested_end_date || null,
      requested_start_date || null, requested_office_license || false,
      requested_project_id || null, notes || null,
      requested_kingdom_license || false,
    ]
  );

  logAction({ action: 'submit_request', entityType: 'request', entityId: rows[0].id, actorType: 'client', actorId: req.user.id, actorName: req.user.name, clientId: req.clientId, details: { type, requested_user_name, requested_user_type, requested_project_id }, ip: getIp(req) });
  res.status(201).json(rows[0]);
});

module.exports = router;
