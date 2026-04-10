const { Router } = require('express');
const pool = require('../../db/pool');
const { logAction, getIp } = require('../../services/audit');

const router = Router();

// List billing periods for this client
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM billing_periods WHERE client_id = $1 ORDER BY period_start DESC',
    [req.clientId]
  );
  res.json(rows);
});

// Client approves a bill
router.put('/:id/approve', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE billing_periods SET client_approved = TRUE, client_approved_at = NOW()
     WHERE id = $1 AND client_id = $2 AND client_approved = FALSE RETURNING *`,
    [req.params.id, req.clientId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Bill not found or already approved' });

  logAction({ action: 'approve_bill', entityType: 'billing_period', entityId: rows[0].id, actorType: 'client', actorId: req.user.id, actorName: req.user.name, clientId: req.clientId, ip: getIp(req) });
  res.json(rows[0]);
});

module.exports = router;
