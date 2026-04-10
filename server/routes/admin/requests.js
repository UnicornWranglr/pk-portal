const { Router } = require('express');
const pool = require('../../db/pool');
const { logAction, getIp } = require('../../services/audit');

const router = Router();

router.get('/', async (req, res) => {
  const statusFilter = req.query.status || 'pending';
  const { rows } = await pool.query(
    `SELECT r.*, c.name AS client_name,
       cu.name AS requested_by_name,
       u.display_name AS target_user_name
     FROM requests r
     JOIN clients c ON c.id = r.client_id
     LEFT JOIN client_users cu ON cu.id = r.requested_by
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.status = $1
     ORDER BY r.submitted_at DESC`,
    [statusFilter]
  );
  res.json(rows);
});

router.put('/:id/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [request] } = await client.query(
      'SELECT * FROM requests WHERE id = $1 AND status = $2',
      [req.params.id, 'pending']
    );
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending request not found' });
    }

    if (request.type === 'add') {
      await client.query(
        `INSERT INTO users (client_id, display_name, email, user_type, added_date)
         VALUES ($1,$2,$3,$4, CURRENT_DATE)`,
        [request.client_id, request.requested_user_name, request.requested_user_email, request.requested_user_type]
      );
    } else if (request.type === 'remove') {
      await client.query(
        `UPDATE users SET status = 'pending_removal', end_date = $1 WHERE id = $2`,
        [request.requested_end_date || new Date().toISOString().slice(0, 10), request.user_id]
      );
    } else if (request.type === 'change_type') {
      await client.query(
        'UPDATE users SET user_type = $1 WHERE id = $2',
        [request.requested_user_type, request.user_id]
      );
    }

    await client.query(
      `UPDATE requests SET status = 'approved', actioned_at = NOW(), actioned_by = $1 WHERE id = $2`,
      [req.user.id, req.params.id]
    );

    await client.query('COMMIT');

    logAction({ action: 'approve_request', entityType: 'request', entityId: request.id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, clientId: request.client_id, details: { type: request.type, requested_user_name: request.requested_user_name, requested_user_type: request.requested_user_type, user_id: request.user_id }, ip: getIp(req) });
    res.json({ message: 'Request approved' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.put('/:id/reject', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE requests SET status = 'rejected', actioned_at = NOW(), actioned_by = $1, notes = COALESCE($2, notes)
     WHERE id = $3 AND status = 'pending' RETURNING *`,
    [req.user.id, req.body.notes || null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Pending request not found' });

  const request = rows[0];
  logAction({ action: 'reject_request', entityType: 'request', entityId: request.id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, clientId: request.client_id, details: { type: request.type, requested_user_name: request.requested_user_name, notes: req.body.notes }, ip: getIp(req) });
  res.json({ message: 'Request rejected' });
});

module.exports = router;
