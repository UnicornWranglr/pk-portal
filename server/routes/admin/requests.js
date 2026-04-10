const { Router } = require('express');
const pool = require('../../db/pool');
const { logAction, getIp } = require('../../services/audit');

const router = Router();

router.get('/', async (req, res) => {
  const statusFilter = req.query.status || 'pending';
  const { rows } = await pool.query(
    `SELECT r.*, c.name AS client_name,
       cu.name AS requested_by_name,
       u.display_name AS target_user_name,
       p.name AS project_name
     FROM requests r
     JOIN clients c ON c.id = r.client_id
     LEFT JOIN client_users cu ON cu.id = r.requested_by
     LEFT JOIN users u ON u.id = r.user_id
     LEFT JOIN projects p ON p.id = r.requested_project_id
     WHERE r.status = $1
     ORDER BY r.submitted_at DESC`,
    [statusFilter]
  );
  res.json(rows);
});

router.put('/:id/action', async (req, res) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const { rows: [request] } = await dbClient.query(
      'SELECT * FROM requests WHERE id = $1 AND status = $2',
      [req.params.id, 'pending']
    );
    if (!request) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending request not found' });
    }

    if (request.type === 'add') {
      await dbClient.query(
        `INSERT INTO users (client_id, display_name, email, user_type, added_date, requires_office_license, project_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          request.client_id,
          request.requested_user_name,
          request.requested_user_email,
          request.requested_user_type,
          request.requested_start_date || new Date().toISOString().slice(0, 10),
          request.requested_office_license || false,
          request.requested_project_id || null,
        ]
      );
    } else if (request.type === 'remove') {
      await dbClient.query(
        `UPDATE users SET status = 'pending_removal', end_date = $1 WHERE id = $2`,
        [request.requested_end_date || new Date().toISOString().slice(0, 10), request.user_id]
      );
    } else if (request.type === 'change_type') {
      await dbClient.query(
        'UPDATE users SET user_type = $1 WHERE id = $2',
        [request.requested_user_type, request.user_id]
      );
    }

    await dbClient.query(
      `UPDATE requests SET status = 'actioned', actioned_at = NOW(), actioned_by = $1, admin_notes = $2 WHERE id = $3`,
      [req.user.id, req.body.admin_notes || null, req.params.id]
    );

    // Create notification for the requesting client user
    if (request.requested_by) {
      const actionLabel = request.type === 'add' ? 'add' : request.type === 'remove' ? 'removal' : 'type change';
      const userName = request.requested_user_name || request.target_user_name || 'a user';
      await dbClient.query(
        `INSERT INTO notifications (client_user_id, request_id, message) VALUES ($1, $2, $3)`,
        [request.requested_by, request.id, `Your ${actionLabel} request for ${userName} has been actioned.`]
      );
    }

    await dbClient.query('COMMIT');

    logAction({ action: 'action_request', entityType: 'request', entityId: request.id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, clientId: request.client_id, details: { type: request.type, requested_user_name: request.requested_user_name, admin_notes: req.body.admin_notes }, ip: getIp(req) });
    res.json({ message: 'Request actioned' });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
});

router.put('/:id/reject', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE requests SET status = 'rejected', actioned_at = NOW(), actioned_by = $1, admin_notes = $2
     WHERE id = $3 AND status = 'pending' RETURNING *`,
    [req.user.id, req.body.admin_notes || null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Pending request not found' });

  const request = rows[0];

  // Notify the requesting client user
  if (request.requested_by) {
    const userName = request.requested_user_name || 'a user';
    pool.query(
      `INSERT INTO notifications (client_user_id, request_id, message) VALUES ($1, $2, $3)`,
      [request.requested_by, request.id, `Your request for ${userName} has been rejected.${req.body.admin_notes ? ' Note: ' + req.body.admin_notes : ''}`]
    ).catch(err => console.error('Notification insert failed:', err.message));
  }

  logAction({ action: 'reject_request', entityType: 'request', entityId: request.id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, clientId: request.client_id, details: { type: request.type, requested_user_name: request.requested_user_name, admin_notes: req.body.admin_notes }, ip: getIp(req) });
  res.json({ message: 'Request rejected' });
});

module.exports = router;
