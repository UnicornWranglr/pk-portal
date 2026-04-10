const { Router } = require('express');
const pool = require('../../db/pool');
const { logAction, getIp } = require('../../services/audit');

const router = Router();

router.get('/clients/:clientId/projects', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM projects WHERE client_id = $1 ORDER BY name',
    [req.params.clientId]
  );
  res.json(rows);
});

router.post('/clients/:clientId/projects', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });

  const { rows } = await pool.query(
    'INSERT INTO projects (client_id, name) VALUES ($1, $2) RETURNING *',
    [req.params.clientId, name]
  );

  logAction({ action: 'create_project', entityType: 'project', entityId: rows[0].id, actorType: 'admin', actorId: req.user.id, actorName: req.user.name, clientId: parseInt(req.params.clientId), details: { name }, ip: getIp(req) });
  res.status(201).json(rows[0]);
});

module.exports = router;
