const { Router } = require('express');
const pool = require('../../db/pool');

const router = Router();

// Get notifications for current user
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT n.*, r.type AS request_type, r.requested_user_name
     FROM notifications n
     LEFT JOIN requests r ON r.id = n.request_id
     WHERE n.client_user_id = $1
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [req.user.id]
  );
  res.json(rows);
});

// Count unread
router.get('/unread-count', async (req, res) => {
  const { rows: [{ count }] } = await pool.query(
    'SELECT COUNT(*) FROM notifications WHERE client_user_id = $1 AND read = FALSE',
    [req.user.id]
  );
  res.json({ count: parseInt(count) });
});

// Mark one as read
router.put('/:id/read', async (req, res) => {
  await pool.query(
    'UPDATE notifications SET read = TRUE WHERE id = $1 AND client_user_id = $2',
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Marked as read' });
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  await pool.query(
    'UPDATE notifications SET read = TRUE WHERE client_user_id = $1 AND read = FALSE',
    [req.user.id]
  );
  res.json({ message: 'All marked as read' });
});

module.exports = router;
