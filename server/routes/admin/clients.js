const { Router } = require('express');
const pool = require('../../db/pool');
const { logAction, getIp } = require('../../services/audit');

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, COUNT(u.id) FILTER (WHERE u.status = 'active') AS active_users
    FROM clients c
    LEFT JOIN users u ON u.client_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, contact_email, billing_contact } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const { rows } = await pool.query(
    'INSERT INTO clients (name, contact_email, billing_contact) VALUES ($1,$2,$3) RETURNING *',
    [name, contact_email || null, billing_contact || null]
  );

  logAction({ action: 'create_client', entityType: 'client', entityId: rows[0].id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, details: { name, contact_email, billing_contact }, ip: getIp(req) });
  res.status(201).json(rows[0]);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Client not found' });
  res.json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, contact_email, billing_contact } = req.body;

  // Capture old values for audit
  const { rows: [old] } = await pool.query('SELECT name, contact_email, billing_contact FROM clients WHERE id = $1', [req.params.id]);

  const { rows } = await pool.query(
    `UPDATE clients SET name = COALESCE($1, name), contact_email = COALESCE($2, contact_email),
     billing_contact = COALESCE($3, billing_contact) WHERE id = $4 RETURNING *`,
    [name, contact_email, billing_contact, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Client not found' });

  logAction({ action: 'update_client', entityType: 'client', entityId: rows[0].id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, details: { old, new: { name: rows[0].name, contact_email: rows[0].contact_email, billing_contact: rows[0].billing_contact } }, ip: getIp(req) });
  res.json(rows[0]);
});

module.exports = router;
