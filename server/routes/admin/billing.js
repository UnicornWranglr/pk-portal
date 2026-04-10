const { Router } = require('express');
const pool = require('../../db/pool');
const { previewBilling, saveBilling } = require('../../services/billing');
const { logAction, getIp } = require('../../services/audit');

const router = Router();

router.get('/config', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM billing_config ORDER BY id DESC LIMIT 1');
  if (rows.length === 0) return res.status(404).json({ error: 'No billing config found' });
  res.json(rows[0]);
});

router.put('/config', async (req, res) => {
  const {
    standard_daily, standard_monthly,
    kingdom_addon_daily, kingdom_addon_monthly,
    gpu_daily, gpu_monthly,
    setup_fee, fair_use_threshold_days,
  } = req.body;

  const { rows: [old] } = await pool.query('SELECT standard_daily, standard_monthly, kingdom_addon_daily, kingdom_addon_monthly, gpu_daily, gpu_monthly, setup_fee, fair_use_threshold_days FROM billing_config ORDER BY id DESC LIMIT 1');

  const { rows } = await pool.query(
    `UPDATE billing_config SET
       standard_daily = COALESCE($1, standard_daily),
       standard_monthly = COALESCE($2, standard_monthly),
       kingdom_addon_daily = COALESCE($3, kingdom_addon_daily),
       kingdom_addon_monthly = COALESCE($4, kingdom_addon_monthly),
       gpu_daily = COALESCE($5, gpu_daily),
       gpu_monthly = COALESCE($6, gpu_monthly),
       setup_fee = COALESCE($7, setup_fee),
       fair_use_threshold_days = COALESCE($8, fair_use_threshold_days),
       updated_at = NOW()
     WHERE id = (SELECT id FROM billing_config ORDER BY id DESC LIMIT 1)
     RETURNING *`,
    [standard_daily, standard_monthly, kingdom_addon_daily, kingdom_addon_monthly,
     gpu_daily, gpu_monthly, setup_fee, fair_use_threshold_days]
  );

  logAction({ action: 'update_billing_config', entityType: 'billing_config', entityId: rows[0].id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, details: { old, new: { standard_daily: rows[0].standard_daily, standard_monthly: rows[0].standard_monthly, kingdom_addon_daily: rows[0].kingdom_addon_daily, kingdom_addon_monthly: rows[0].kingdom_addon_monthly, gpu_daily: rows[0].gpu_daily, gpu_monthly: rows[0].gpu_monthly, setup_fee: rows[0].setup_fee, fair_use_threshold_days: rows[0].fair_use_threshold_days } }, ip: getIp(req) });
  res.json(rows[0]);
});

// Preview billing — read-only, no side effects
router.post('/generate/:clientId', async (req, res) => {
  const { period_start, period_end } = req.body;
  if (!period_start || !period_end) {
    return res.status(400).json({ error: 'period_start and period_end required' });
  }
  const result = await previewBilling(parseInt(req.params.clientId), period_start, period_end);
  res.json(result);
});

// Save billing — transactional, marks setup fees
router.post('/save/:clientId', async (req, res) => {
  const { period_start, period_end, line_items, total } = req.body;
  if (!period_start || !period_end || !line_items) {
    return res.status(400).json({ error: 'period_start, period_end, and line_items required' });
  }
  const result = await saveBilling(
    parseInt(req.params.clientId), period_start, period_end, line_items, total, req.user.id
  );
  logAction({ action: 'save_billing', entityType: 'billing_period', entityId: result.id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, clientId: parseInt(req.params.clientId), details: { period_start, period_end, total }, ip: getIp(req) });
  res.json(result);
});

// Mark bill as sent
router.put('/periods/:id/send', async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE billing_periods SET sent_at = NOW() WHERE id = $1 RETURNING *',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Billing period not found' });
  logAction({ action: 'mark_bill_sent', entityType: 'billing_period', entityId: rows[0].id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, clientId: rows[0].client_id, ip: getIp(req) });
  res.json(rows[0]);
});

// Unbilled clients count (no bill for previous month)
router.get('/unbilled-count', async (req, res) => {
  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*) FROM clients c
     WHERE NOT EXISTS (
       SELECT 1 FROM billing_periods bp
       WHERE bp.client_id = c.id
       AND bp.period_start = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::date
     )`
  );
  res.json({ count: parseInt(count) });
});

router.get('/periods/:clientId', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM billing_periods WHERE client_id = $1 ORDER BY period_start DESC',
    [req.params.clientId]
  );
  res.json(rows);
});

module.exports = router;
