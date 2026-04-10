import { useState, useEffect } from 'react';
import { api } from '../../api';

const actionLabels = {
  login: 'Logged in',
  login_failed: 'Login failed',
  create_client: 'Created client',
  update_client: 'Updated client',
  create_user: 'Created user',
  update_user: 'Updated user',
  approve_request: 'Approved request',
  reject_request: 'Rejected request',
  submit_request: 'Submitted request',
  update_billing_config: 'Updated billing config',
  generate_billing: 'Generated billing',
};

const actionColors = {
  login: 'bg-blue-100 text-blue-700',
  login_failed: 'bg-red-100 text-red-700',
  create_client: 'bg-green-100 text-green-700',
  update_client: 'bg-amber-100 text-amber-700',
  create_user: 'bg-green-100 text-green-700',
  update_user: 'bg-amber-100 text-amber-700',
  approve_request: 'bg-green-100 text-green-700',
  reject_request: 'bg-red-100 text-red-700',
  submit_request: 'bg-indigo-100 text-indigo-700',
  update_billing_config: 'bg-amber-100 text-amber-700',
  generate_billing: 'bg-purple-100 text-purple-700',
};

const actorColors = {
  admin: 'bg-gray-800 text-white',
  client: 'bg-indigo-600 text-white',
  system: 'bg-gray-400 text-white',
};

function formatDetails(details) {
  if (!details) return null;
  const entries = [];

  // Login details
  if (details.portal) entries.push(`Portal: ${details.portal}`);
  if (details.email) entries.push(`Email: ${details.email}`);

  // Request details
  if (details.type) entries.push(`Type: ${details.type}`);
  if (details.requested_user_name) entries.push(`User: ${details.requested_user_name}`);
  if (details.requested_user_type) entries.push(`Seat: ${details.requested_user_type}`);
  if (details.notes) entries.push(`Notes: ${details.notes}`);

  // Billing details
  if (details.period_start) entries.push(`Period: ${details.period_start} to ${details.period_end}`);
  if (details.total !== undefined) entries.push(`Total: \u00A3${parseFloat(details.total).toFixed(2)}`);

  // Create details
  if (details.name && !details.old) entries.push(`Name: ${details.name}`);
  if (details.display_name && !details.old) entries.push(`Name: ${details.display_name}`);
  if (details.user_type && !details.old) entries.push(`Type: ${details.user_type}`);

  // Change tracking (old → new)
  if (details.old && details.new) {
    for (const key of Object.keys(details.new)) {
      const oldVal = details.old[key];
      const newVal = details.new[key];
      if (oldVal !== newVal && newVal !== null && newVal !== undefined) {
        entries.push(`${key}: ${oldVal || '(empty)'} \u2192 ${newVal}`);
      }
    }
  }

  return entries.length > 0 ? entries : null;
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ action: '', entity_type: '', client_id: '' });
  const [filterOptions, setFilterOptions] = useState({ actions: [], entity_types: [], clients: [] });
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadFilters(); }, []);
  useEffect(() => { loadLogs(1); }, [filters]);

  async function loadFilters() {
    setFilterOptions(await api.get('/admin/activity/filters'));
  }

  async function loadLogs(page) {
    const params = new URLSearchParams({ page, limit: 50 });
    if (filters.action) params.set('action', filters.action);
    if (filters.entity_type) params.set('entity_type', filters.entity_type);
    if (filters.client_id) params.set('client_id', filters.client_id);

    const data = await api.get(`/admin/activity?${params}`);
    setLogs(data.logs);
    setPagination(data.pagination);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Activity Log</h2>
          <p className="text-sm text-gray-500">{pagination.total} total entries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Action</label>
          <select value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })}
            className="border rounded px-3 py-1.5 text-sm min-w-[160px]">
            <option value="">All actions</option>
            {filterOptions.actions.map(a => (
              <option key={a} value={a}>{actionLabels[a] || a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Entity</label>
          <select value={filters.entity_type} onChange={e => setFilters({ ...filters, entity_type: e.target.value })}
            className="border rounded px-3 py-1.5 text-sm min-w-[140px]">
            <option value="">All entities</option>
            {filterOptions.entity_types.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Client</label>
          <select value={filters.client_id} onChange={e => setFilters({ ...filters, client_id: e.target.value })}
            className="border rounded px-3 py-1.5 text-sm min-w-[160px]">
            <option value="">All clients</option>
            {filterOptions.clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {(filters.action || filters.entity_type || filters.client_id) && (
          <button onClick={() => setFilters({ action: '', entity_type: '', client_id: '' })}
            className="text-sm text-gray-500 hover:text-gray-700 pb-1">
            Clear filters
          </button>
        )}
      </div>

      {/* Log table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium w-44">Timestamp</th>
              <th className="text-left px-4 py-3 font-medium w-24">Source</th>
              <th className="text-left px-4 py-3 font-medium w-28">Actor</th>
              <th className="text-left px-4 py-3 font-medium w-44">Action</th>
              <th className="text-left px-4 py-3 font-medium">Client</th>
              <th className="text-left px-4 py-3 font-medium">Details</th>
              <th className="text-left px-4 py-3 font-medium w-28">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map(log => {
              const details = formatDetails(log.details);
              const isExpanded = expandedId === log.id;
              return (
                <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actorColors[log.actor_type] || 'bg-gray-100'}`}>
                      {log.actor_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium truncate">{log.actor_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.client_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {details ? (
                      isExpanded ? (
                        <ul className="space-y-0.5">
                          {details.map((d, i) => <li key={i}>{d}</li>)}
                        </ul>
                      ) : (
                        <span className="truncate block max-w-xs">{details[0]}{details.length > 1 ? ` (+${details.length - 1} more)` : ''}</span>
                      )
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ip_address || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {logs.length === 0 && <p className="text-center py-8 text-gray-500">No activity logged yet</p>}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button disabled={pagination.page <= 1} onClick={() => loadLogs(pagination.page - 1)}
              className="px-3 py-1.5 border rounded text-sm disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <button disabled={pagination.page >= pagination.pages} onClick={() => loadLogs(pagination.page + 1)}
              className="px-3 py-1.5 border rounded text-sm disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
