const { Router } = require('express');
const pool = require('../../db/pool');
const { generateBilling } = require('../../services/billing');

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
  res.json(rows[0]);
});

router.post('/generate/:clientId', async (req, res) => {
  const { period_start, period_end } = req.body;
  if (!period_start || !period_end) {
    return res.status(400).json({ error: 'period_start and period_end required' });
  }
  const result = await generateBilling(
    parseInt(req.params.clientId), period_start, period_end, req.user.id
  );
  res.json(result);
});

router.get('/periods/:clientId', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM billing_periods WHERE client_id = $1 ORDER BY period_start DESC',
    [req.params.clientId]
  );
  res.json(rows);
});

module.exports = router;
