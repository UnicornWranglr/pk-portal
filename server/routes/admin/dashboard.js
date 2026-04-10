const { Router } = require('express');
const pool = require('../../db/pool');

const router = Router();

router.get('/', async (req, res) => {
  const [clients, users, pendingRequests, actionedThisMonth, recentActivity, clientStats] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM clients`),
    pool.query(`SELECT COUNT(*) FROM users WHERE status = 'active'`),
    pool.query(`SELECT COUNT(*) FROM requests WHERE status = 'pending'`),
    pool.query(
      `SELECT COUNT(*) FROM requests WHERE status = 'actioned'
       AND actioned_at >= date_trunc('month', CURRENT_DATE)`
    ),
    pool.query(
      `SELECT a.*, c.name AS client_name
       FROM audit_logs a LEFT JOIN clients c ON c.id = a.client_id
       WHERE a.action IN ('submit_request', 'action_request', 'reject_request', 'create_user', 'update_user', 'login')
       ORDER BY a.created_at DESC LIMIT 10`
    ),
    pool.query(
      `SELECT c.id, c.name, c.billing_contact,
         COUNT(u.id) FILTER (WHERE u.status = 'active') AS active_users,
         COUNT(r.id) FILTER (WHERE r.status = 'pending') AS pending_requests,
         (SELECT total FROM billing_periods bp WHERE bp.client_id = c.id ORDER BY bp.generated_at DESC LIMIT 1) AS last_billing_total,
         (SELECT bp.period_end FROM billing_periods bp WHERE bp.client_id = c.id ORDER BY bp.generated_at DESC LIMIT 1) AS last_billing_period
       FROM clients c
       LEFT JOIN users u ON u.client_id = c.id
       LEFT JOIN requests r ON r.client_id = c.id AND r.status = 'pending'
       GROUP BY c.id
       ORDER BY c.name`
    ),
  ]);

  res.json({
    summary: {
      total_clients: parseInt(clients.rows[0].count),
      total_active_users: parseInt(users.rows[0].count),
      pending_requests: parseInt(pendingRequests.rows[0].count),
      actioned_this_month: parseInt(actionedThisMonth.rows[0].count),
    },
    recent_activity: recentActivity.rows,
    client_stats: clientStats.rows,
  });
});

module.exports = router;
