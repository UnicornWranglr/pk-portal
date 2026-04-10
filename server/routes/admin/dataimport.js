const { Router } = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../../db/pool');
const { logAction, getIp } = require('../../services/audit');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', upload.single('file'), async (req, res) => {
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

  const keys = Object.keys(rows[0]);
  const findCol = (patterns) => keys.find(k => patterns.some(p => p.test(k)));

  const clientCol = findCol([/client/i, /company/i, /organisation/i, /organization/i]);
  const nameCol = findCol([/user.*name/i, /display.*name/i, /^name$/i, /username/i]);
  const typeCol = findCol([/user.*type/i, /seat.*type/i, /^type$/i]);
  const kingdomCol = findCol([/kingdom/i]);
  const dateCol = findCol([/added.*date/i, /start.*date/i, /^date$/i, /joined/i]);
  const statusCol = findCol([/status/i]);

  if (!clientCol || !nameCol) {
    return res.status(400).json({
      error: `Could not detect required columns. Found: [${keys.join(', ')}]. Need at least a client column and a user name column.`,
      columns: keys,
    });
  }

  // Parse all rows
  const parsed = [];
  const issues = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header
    const clientName = String(row[clientCol] || '').trim();
    const userName = String(row[nameCol] || '').trim();

    if (!clientName) { issues.push({ row: rowNum, issue: 'Missing client name', data: row }); continue; }
    if (!userName) { issues.push({ row: rowNum, issue: 'Missing user name', data: row }); continue; }

    let userType = typeCol ? String(row[typeCol] || 'standard').trim().toLowerCase() : 'standard';
    if (!['standard', 'gpu'].includes(userType)) {
      // If they typed 'kingdom', treat as standard + kingdom flag
      if (userType === 'kingdom') {
        userType = 'standard';
      } else {
        issues.push({ row: rowNum, issue: `Invalid user type: ${userType}`, data: row });
        continue;
      }
    }

    let kingdomLicense = false;
    if (kingdomCol) {
      const kVal = String(row[kingdomCol] || '').trim().toLowerCase();
      kingdomLicense = ['true', 'yes', '1', 'y'].includes(kVal);
    }
    // If original type was 'kingdom', set flag
    if (typeCol && String(row[typeCol] || '').trim().toLowerCase() === 'kingdom') {
      kingdomLicense = true;
    }

    let addedDate = null;
    if (dateCol && row[dateCol]) {
      if (row[dateCol] instanceof Date) {
        addedDate = row[dateCol].toISOString().slice(0, 10);
      } else {
        const d = new Date(row[dateCol]);
        addedDate = isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      }
    }
    if (!addedDate) addedDate = new Date().toISOString().slice(0, 10);

    let status = statusCol ? String(row[statusCol] || 'active').trim().toLowerCase() : 'active';
    if (!['active', 'paused', 'pending_removal', 'removed'].includes(status)) {
      status = 'active';
    }

    parsed.push({ clientName, userName, userType, kingdomLicense, addedDate, status });
  }

  // Preview mode
  if (req.query.confirm !== 'true') {
    // Group by client for preview
    const clientGroups = {};
    for (const p of parsed) {
      if (!clientGroups[p.clientName]) clientGroups[p.clientName] = [];
      clientGroups[p.clientName].push(p);
    }
    return res.json({ preview: true, clients: clientGroups, issues, total_rows: rows.length, valid: parsed.length });
  }

  // Confirm mode — actually insert
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // Get or create clients
    const clientIdMap = new Map();
    const uniqueClients = [...new Set(parsed.map(p => p.clientName))];

    for (const name of uniqueClients) {
      const { rows: existing } = await dbClient.query(
        'SELECT id FROM clients WHERE LOWER(name) = LOWER($1)', [name]
      );
      if (existing.length > 0) {
        clientIdMap.set(name, existing[0].id);
      } else {
        const { rows: [created] } = await dbClient.query(
          'INSERT INTO clients (name) VALUES ($1) RETURNING id', [name]
        );
        clientIdMap.set(name, created.id);
      }
    }

    let usersCreated = 0;
    let clientsCreated = uniqueClients.length - (await dbClient.query(
      `SELECT COUNT(DISTINCT id) FROM clients WHERE LOWER(name) = ANY($1)`,
      [uniqueClients.map(n => n.toLowerCase())]
    )).rows[0].count;

    for (const p of parsed) {
      const clientId = clientIdMap.get(p.clientName);
      // Check for duplicate by name + client
      const { rows: dup } = await dbClient.query(
        'SELECT id FROM users WHERE LOWER(display_name) = LOWER($1) AND client_id = $2',
        [p.userName, clientId]
      );
      if (dup.length > 0) {
        issues.push({ row: null, issue: `Duplicate skipped: ${p.userName} already exists under ${p.clientName}`, data: p });
        continue;
      }

      await dbClient.query(
        `INSERT INTO users (client_id, display_name, user_type, kingdom_license, added_date, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, p.userName, p.userType, p.kingdomLicense, p.addedDate, p.status]
      );
      usersCreated++;
    }

    await dbClient.query('COMMIT');

    logAction({ action: 'data_import', entityType: 'import', actorType: 'admin', actorId: req.user.id, actorName: req.user.name, details: { filename: req.file.originalname, users_created: usersCreated, clients: uniqueClients.length, issues: issues.length }, ip: getIp(req) });

    res.json({ message: 'Import complete', users_created: usersCreated, clients: uniqueClients.length, issues });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }
});

module.exports = router;
