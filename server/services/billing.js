const pool = require('../db/pool');

/**
 * Parse a date value (string or Date object) to a UTC-noon Date,
 * avoiding timezone-shift bugs with date-only ISO strings.
 */
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate(), 12));
  }
  const str = String(val).slice(0, 10);
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatPeriodDate(d) {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/**
 * Calculate charge with fair-use logic.
 * Returns { amount, rate_applied } so the UI can show which rate was used.
 */
function calcCharge(daysActive, dailyRate, monthlyRate) {
  const daily = parseFloat(dailyRate);
  const monthly = parseFloat(monthlyRate);
  const dailyTotal = daysActive * daily;
  if (dailyTotal >= monthly) {
    return { amount: monthly, rate_applied: 'monthly' };
  }
  return { amount: Math.round(dailyTotal * 100) / 100, rate_applied: 'daily' };
}

/**
 * Calculate days active within billing period.
 * start = MAX(added_date, period_start)
 * end = MIN(COALESCE(removed_date, period_end), period_end)
 * Returns { days, start, end } or null if no overlap.
 */
function calcActivePeriod(addedDate, removedDate, periodStart, periodEnd) {
  const userStart = parseDate(addedDate);
  const pStart = parseDate(periodStart);
  const pEnd = parseDate(periodEnd);

  const start = userStart > pStart ? userStart : pStart;

  let end = pEnd;
  if (removedDate) {
    const userEnd = parseDate(removedDate);
    if (userEnd < end) end = userEnd;
  }

  if (start > end) return null;

  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.round((end - start) / msPerDay) + 1; // inclusive
  return { days, start, end };
}

/**
 * Preview billing — read-only, no side effects.
 */
async function previewBilling(clientId, periodStart, periodEnd) {
  const { rows: [config] } = await pool.query(
    'SELECT * FROM billing_config ORDER BY id DESC LIMIT 1'
  );
  if (!config) throw new Error('No billing config found');

  // Users active during this period (including removed users whose removal falls within/after period)
  // Exclude paused users entirely
  const { rows: users } = await pool.query(
    `SELECT * FROM users WHERE client_id = $1
     AND added_date <= $2
     AND (removed_date IS NULL OR removed_date >= $3)
     AND status != 'paused'
     ORDER BY display_name`,
    [clientId, periodEnd, periodStart]
  );

  const lineItems = [];
  let total = 0;

  for (const user of users) {
    const period = calcActivePeriod(user.added_date, user.removed_date, periodStart, periodEnd);
    if (!period) continue;

    const activePeriod = `${formatPeriodDate(period.start)} – ${formatPeriodDate(period.end)}`;

    // Seat charge
    const seatRate = user.user_type === 'gpu'
      ? calcCharge(period.days, config.gpu_daily, config.gpu_monthly)
      : calcCharge(period.days, config.standard_daily, config.standard_monthly);

    const item = {
      user_id: user.id,
      display_name: user.display_name,
      user_type: user.user_type,
      kingdom_license: user.kingdom_license,
      days_active: period.days,
      active_period: activePeriod,
      charges: {
        seat: {
          amount: seatRate.amount,
          rate_applied: seatRate.rate_applied,
        },
      },
      total: seatRate.amount,
    };

    // Kingdom charge — from actual usage days in period
    if (user.kingdom_license) {
      const { rows: [{ count: kDaysStr }] } = await pool.query(
        `SELECT COUNT(DISTINCT usage_date) FROM kingdom_usage
         WHERE user_id = $1 AND usage_date >= $2 AND usage_date <= $3`,
        [user.id, periodStart, periodEnd]
      );
      const kDays = parseInt(kDaysStr);
      if (kDays > 0) {
        const kRate = calcCharge(kDays, config.kingdom_addon_daily, config.kingdom_addon_monthly);
        item.charges.kingdom = { amount: kRate.amount, rate_applied: kRate.rate_applied, days: kDays };
        item.total += kRate.amount;
      }
    }

    // Setup fee — check flag but do NOT update it (preview only)
    if (!user.setup_fee_charged) {
      const fee = parseFloat(config.setup_fee);
      item.charges.setup_fee = fee;
      item.total += fee;
    }

    item.total = Math.round(item.total * 100) / 100;
    total += item.total;
    lineItems.push(item);
  }

  return { line_items: lineItems, total: Math.round(total * 100) / 100 };
}

/**
 * Save billing — transactional. Inserts billing period and marks setup fees.
 */
async function saveBilling(clientId, periodStart, periodEnd, lineItems, total, adminUserId) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // Mark setup fees atomically
    for (const item of lineItems) {
      if (item.charges.setup_fee) {
        const { rows: [fresh] } = await dbClient.query(
          'SELECT setup_fee_charged FROM users WHERE id = $1 FOR UPDATE',
          [item.user_id]
        );
        if (fresh && !fresh.setup_fee_charged) {
          await dbClient.query(
            'UPDATE users SET setup_fee_charged = TRUE WHERE id = $1',
            [item.user_id]
          );
        }
      }
    }

    const { rows: [period] } = await dbClient.query(
      `INSERT INTO billing_periods (client_id, period_start, period_end, line_items, total, generated_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [clientId, periodStart, periodEnd, JSON.stringify(lineItems), total, adminUserId]
    );

    await dbClient.query('COMMIT');
    return period;
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
}

module.exports = { previewBilling, saveBilling };
