const { Router } = require('express');
const pool = require('../../db/pool');

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, display_name, email, user_type, status, added_date, end_date
     FROM users WHERE client_id = $1 AND status != 'removed'
     ORDER BY display_name`,
    [req.clientId]
  );
  res.json(rows);
});

module.exports = router;
