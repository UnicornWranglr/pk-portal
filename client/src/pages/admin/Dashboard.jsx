import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { formatDate } from '../../utils';

const actionLabels = {
  login: 'Logged in', submit_request: 'Request submitted', action_request: 'Request actioned',
  reject_request: 'Request rejected', create_user: 'User created', update_user: 'User updated',
};
const actionColors = {
  login: 'bg-blue-100 text-blue-700', submit_request: 'bg-indigo-100 text-indigo-700',
  action_request: 'bg-green-100 text-green-700', reject_request: 'bg-red-100 text-red-700',
  create_user: 'bg-green-100 text-green-700', update_user: 'bg-amber-100 text-amber-700',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/admin/dashboard').then(setData); }, []);

  if (!data) return <p>Loading...</p>;
  const { summary, recent_activity, client_stats } = data;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Dashboard</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card label="Active Clients" value={summary.total_clients} />
        <Card label="Active Users" value={summary.total_active_users} />
        <Card label="Pending Requests" value={summary.pending_requests} link="/admin/requests" highlight={summary.pending_requests > 0} />
        <Card label="Actioned This Month" value={summary.actioned_this_month} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b flex justify-between items-center">
            <h3 className="font-bold text-sm">Recent Activity</h3>
            <Link to="/admin/activity" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {recent_activity.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${actionColors[a.action] || 'bg-gray-100 text-gray-700'}`}>
                  {actionLabels[a.action] || a.action}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{a.actor_name || '—'}</span>
                  {a.client_name && <span className="text-xs text-gray-400 ml-2">{a.client_name}</span>}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(a.created_at, true)}</span>
              </div>
            ))}
            {recent_activity.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No recent activity</p>}
          </div>
        </div>

        {/* Client stats */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b">
            <h3 className="font-bold text-sm">Client Overview</h3>
          </div>
          <div className="divide-y">
            {client_stats.map(c => (
              <Link key={c.id} to={`/admin/clients/${c.id}`} className="block px-4 py-3 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.billing_contact && <span className="text-xs text-gray-400 ml-2">{c.billing_contact}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-500">{c.active_users} user{c.active_users != 1 ? 's' : ''}</span>
                    {parseInt(c.pending_requests) > 0 && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">{c.pending_requests} pending</span>
                    )}
                    {c.last_billing_total && (
                      <span className="text-gray-400">Last bill: &pound;{parseFloat(c.last_billing_total).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {client_stats.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No clients</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, link, highlight }) {
  const content = (
    <div className={`bg-white rounded-lg shadow p-4 ${highlight ? 'ring-2 ring-yellow-400' : ''}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}
