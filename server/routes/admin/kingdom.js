const { Router } = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../../db/pool');
const { logAction, getIp } = require('../../services/audit');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

  // Detect column names — look for common patterns
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

  // Fetch all users for matching
  const { rows: allUsers } = await pool.query(
    `SELECT id, display_name, email, client_id FROM users WHERE kingdom_license = TRUE`
  );

  const nameMap = new Map();
  for (const u of allUsers) {
    nameMap.set(u.display_name.toLowerCase(), u);
    if (u.email) nameMap.set(u.email.toLowerCase(), u);
    // Also index by dot-separated format (e.g. "cecilia.morales" for "Cecilia Morales")
    const dotForm = u.display_name.toLowerCase().replace(/\s+/g, '.');
    nameMap.set(dotForm, u);
  }

  const matched = [];
  const unmatched = [];

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

    // Try exact match first, then dot-to-space conversion
    let user = nameMap.get(rawName.toLowerCase());
    if (!user && rawName.includes('.')) {
      const converted = rawName.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
      user = nameMap.get(converted.toLowerCase());
    }
    if (user) {
      matched.push({ user_id: user.id, display_name: user.display_name, date: dateStr });
    } else {
      unmatched.push({ username: rawName, date: dateStr, reason: 'User not found' });
    }
  }

  // If confirm=true in body, actually insert
  if (req.query.confirm === 'true') {
    let inserted = 0;
    for (const m of matched) {
      try {
        await pool.query(
          `INSERT INTO kingdom_usage (user_id, usage_date, source) VALUES ($1, $2, 'imported')
           ON CONFLICT (user_id, usage_date) DO NOTHING`,
          [m.user_id, m.date]
        );
        inserted++;
      } catch { /* skip duplicates */ }
    }

    logAction({ action: 'import_kingdom_usage', entityType: 'kingdom_usage', actorType: 'admin', actorId: req.user.id, actorName: req.user.name, details: { filename: req.file.originalname, matched: matched.length, unmatched: unmatched.length, inserted }, ip: getIp(req) });

    return res.json({ message: 'Import complete', inserted, matched: matched.length, unmatched });
  }

  // Preview mode — return matched/unmatched for review
  res.json({ preview: true, matched, unmatched, total_rows: rows.length });
});

module.exports = router;
