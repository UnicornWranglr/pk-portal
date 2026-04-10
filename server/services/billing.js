const pool = require('../db/pool');

function calcCharge(daysActive, dailyRate, monthlyRate) {
  const dailyTotal = daysActive * parseFloat(dailyRate);
  const monthly = parseFloat(monthlyRate);
  return dailyTotal >= monthly ? monthly : dailyTotal;
}

function daysInRange(addedDate, endDate, periodStart, periodEnd) {
  const start = new Date(Math.max(new Date(addedDate), new Date(periodStart)));
  const end = new Date(Math.min(
    endDate ? new Date(endDate) : new Date(periodEnd),
    new Date(periodEnd)
  ));
  if (start > end) return 0;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1; // inclusive
}

async function generateBilling(clientId, periodStart, periodEnd, adminUserId) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const { rows: [config] } = await dbClient.query(
      'SELECT * FROM billing_config ORDER BY id DESC LIMIT 1'
    );
    if (!config) throw new Error('No billing config found');

    // Active users during this period — exclude paused and removed
    const { rows: users } = await dbClient.query(
      `SELECT * FROM users WHERE client_id = $1
       AND added_date <= $3
       AND (end_date IS NULL OR end_date >= $2)
       AND status NOT IN ('paused', 'removed')`,
      [clientId, periodStart, periodEnd]
    );

    const lineItems = [];
    let total = 0;

    for (const user of users) {
      const days = daysInRange(user.added_date, user.end_date, periodStart, periodEnd);
      if (days === 0) continue;

      const item = {
        user_id: user.id,
        display_name: user.display_name,
        user_type: user.user_type,
        kingdom_license: user.kingdom_license,
        days_active: days,
        charges: {},
      };

      let userTotal = 0;

      // Seat charge — standard or gpu
      if (user.user_type === 'gpu') {
        const gpuCharge = calcCharge(days, config.gpu_daily, config.gpu_monthly);
        item.charges.gpu = gpuCharge;
        userTotal += gpuCharge;
      } else {
        const seatCharge = calcCharge(days, config.standard_daily, config.standard_monthly);
        item.charges.standard = seatCharge;
        userTotal += seatCharge;
      }

      // Kingdom charge — based on actual usage days from kingdom_usage table
      if (user.kingdom_license) {
        const { rows: [{ count: usageDaysStr }] } = await dbClient.query(
          `SELECT COUNT(DISTINCT usage_date) FROM kingdom_usage
           WHERE user_id = $1 AND usage_date >= $2 AND usage_date <= $3`,
          [user.id, periodStart, periodEnd]
        );
        const kingdomDays = parseInt(usageDaysStr);
        item.kingdom_usage_days = kingdomDays;

        if (kingdomDays > 0) {
          const kingdomCharge = calcCharge(kingdomDays, config.kingdom_addon_daily, config.kingdom_addon_monthly);
          item.charges.kingdom_addon = kingdomCharge;
          userTotal += kingdomCharge;
        }
      }

      // Setup fee
      if (!user.setup_fee_charged) {
        const fee = parseFloat(config.setup_fee);
        item.charges.setup_fee = fee;
        userTotal += fee;
        await dbClient.query(
          'UPDATE users SET setup_fee_charged = TRUE WHERE id = $1',
          [user.id]
        );
      }

      item.total = Math.round(userTotal * 100) / 100;
      total += item.total;
      lineItems.push(item);
    }

    total = Math.round(total * 100) / 100;

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

module.exports = { generateBilling };
