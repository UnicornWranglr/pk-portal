const { Router } = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { logAction, getIp } = require('../services/audit');

const router = Router();

router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { rows } = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
  if (rows.length === 0) {
    logAction({ action: 'login_failed', actorType: 'system', details: { email, portal: 'admin' }, ip: getIp(req) });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    logAction({ action: 'login_failed', actorType: 'system', details: { email, portal: 'admin' }, ip: getIp(req) });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, role: 'admin', name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  logAction({ action: 'login', actorType: 'admin', actorId: user.id, actorName: user.name, details: { portal: 'admin' }, ip: getIp(req) });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: 'admin' } });
});

router.post('/client/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { rows } = await pool.query('SELECT * FROM client_users WHERE email = $1', [email]);
  if (rows.length === 0) {
    logAction({ action: 'login_failed', actorType: 'system', details: { email, portal: 'client' }, ip: getIp(req) });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    logAction({ action: 'login_failed', actorType: 'system', details: { email, portal: 'client' }, ip: getIp(req) });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, role: 'client', client_id: user.client_id, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  logAction({ action: 'login', actorType: 'client', actorId: user.id, actorName: user.name, clientId: user.client_id, details: { portal: 'client' }, ip: getIp(req) });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: 'client', client_id: user.client_id } });
});

module.exports = router;
