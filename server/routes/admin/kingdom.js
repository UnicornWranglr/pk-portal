const { Router } = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../../db/pool');
const { logAction, getIp } = require('../../services/audit');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function getCurrentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end, label: `${now.toLocaleString('en-GB', { month: 'long' })} ${y}` };
}

router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });

  let rows;
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet);
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse file: ' + err.message });
  }

  if (rows.length === 0) return res.status(400).json({ error: 'File contains no data rows' });

  const firstRow = rows[0];
  const keys = Object.keys(firstRow);
  const userCol = keys.find(k => /user|name|username|display/i.test(k));
  const dateCol = keys.find(k => /date|day|usage/i.test(k));

  if (!userCol || !dateCol) {
    return res.status(400).json({
      error: `Could not detect columns. Found: [${keys.join(', ')}]. Need a user/name column and a date column.`,
      columns: keys,
    });
  }

  // Fetch all kingdom-licensed users
  const { rows: allUsers } = await pool.query(
    `SELECT id, display_name, email, client_id FROM users WHERE kingdom_license = TRUE`
  );

  const nameMap = new Map();
  for (const u of allUsers) {
    nameMap.set(u.display_name.toLowerCase(), u);
    if (u.email) nameMap.set(u.email.toLowerCase(), u);
    const dotForm = u.display_name.toLowerCase().replace(/\s+/g, '.');
    nameMap.set(dotForm, u);
  }

  const { start: monthStart, end: monthEnd, label: monthLabel } = getCurrentMonthRange();

  const matched = [];
  const unmatched = [];
  let skipped = 0;

  for (const row of rows) {
    const rawName = String(row[userCol] || '').trim();
    const rawDate = row[dateCol];
    if (!rawName || !rawDate) continue;

    // Parse date
    let dateStr;
    if (rawDate instanceof Date) {
      dateStr = rawDate.toISOString().slice(0, 10);
    } else {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) {
        unmatched.push({ username: rawName, date: String(rawDate), reason: 'Invalid date' });
        continue;
      }
      dateStr = d.toISOString().slice(0, 10);
    }

    // Filter to current month only
    if (dateStr < monthStart || dateStr > monthEnd) {
      skipped++;
      continue;
    }

    // Match username
    const normalised = rawName.toLowerCase();
    let user = nameMap.get(normalised);
    if (!user && normalised.includes('.')) {
      const converted = normalised.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      user = nameMap.get(converted.toLowerCase());
    }
    if (user) {
      matched.push({ user_id: user.id, display_name: user.display_name, date: dateStr });
    } else {
      unmatched.push({ username: rawName, date: dateStr, reason: 'User not found' });
    }
  }

  // Confirm mode — replace existing imported entries for this month, then insert
  if (req.query.confirm === 'true') {
    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');

      // Delete existing imported entries for current month (replace, not duplicate)
      const matchedUserIds = [...new Set(matched.map(m => m.user_id))];
      if (matchedUserIds.length > 0) {
        await dbClient.query(
          `DELETE FROM kingdom_usage WHERE source = 'imported'
           AND usage_date >= $1 AND usage_date <= $2
           AND user_id = ANY($3)`,
          [monthStart, monthEnd, matchedUserIds]
        );
      }

      let inserted = 0;
      for (const m of matched) {
        await dbClient.query(
          `INSERT INTO kingdom_usage (user_id, usage_date, source) VALUES ($1, $2, 'imported')
           ON CONFLICT (user_id, usage_date) DO NOTHING`,
          [m.user_id, m.date]
        );
        inserted++;
      }

      await dbClient.query('COMMIT');

      // Build verification summary — per-user breakdown with calculated charges
      const { rows: [config] } = await pool.query('SELECT kingdom_addon_daily, kingdom_addon_monthly FROM billing_config ORDER BY id DESC LIMIT 1');

      const userDays = {};
      for (const m of matched) {
        if (!userDays[m.user_id]) userDays[m.user_id] = { display_name: m.display_name, days: new Set() };
        userDays[m.user_id].days.add(m.date);
      }

      const verification = Object.values(userDays).map(u => {
        const days = u.days.size;
        const dailyTotal = days * parseFloat(config.kingdom_addon_daily);
        const monthly = parseFloat(config.kingdom_addon_monthly);
        const charge = dailyTotal >= monthly ? monthly : dailyTotal;
        const rate_applied = dailyTotal >= monthly ? 'monthly' : 'daily';
        return { display_name: u.display_name, days, charge: Math.round(charge * 100) / 100, rate_applied };
      }).sort((a, b) => a.display_name.localeCompare(b.display_name));

      const totalDays = verification.reduce((s, v) => s + v.days, 0);
      const totalCharge = verification.reduce((s, v) => s + v.charge, 0);

      logAction({ action: 'import_kingdom_usage', entityType: 'kingdom_usage', actorType: 'admin', actorId: req.user.id, actorName: req.user.name, details: { filename: req.file.originalname, month: monthLabel, matched: matched.length, unmatched: unmatched.length, skipped, inserted }, ip: getIp(req) });

      return res.json({
        message: 'Import complete',
        inserted, month: monthLabel, skipped, unmatched,
        verification: { users: verification, total_users: verification.length, total_days: totalDays, total_charge: Math.round(totalCharge * 100) / 100 },
      });
    } catch (err) {
      await dbClient.query('ROLLBACK');
      throw err;
    } finally {
      dbClient.release();
    }
  }

  // Preview mode
  res.json({ preview: true, matched, unmatched, skipped, month: monthLabel, total_rows: rows.length });
});

module.exports = router;
