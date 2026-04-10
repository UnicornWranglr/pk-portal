const { Router } = require('express');
const pool = require('../../db/pool');

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.display_name, u.email, u.user_type, u.status, u.added_date, u.end_date,
            u.requires_office_license, u.kingdom_license, p.name AS project_name
     FROM users u
     LEFT JOIN projects p ON p.id = u.project_id
     WHERE u.client_id = $1 AND u.status != 'removed'
     ORDER BY u.display_name`,
    [req.clientId]
  );
  res.json(rows);
});

module.exports = router;
