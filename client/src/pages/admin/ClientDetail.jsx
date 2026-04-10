import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api';

const typeColors = { standard: 'bg-blue-100 text-blue-700', kingdom: 'bg-purple-100 text-purple-700', gpu: 'bg-amber-100 text-amber-700' };
const statusColors = { active: 'bg-green-100 text-green-700', pending_removal: 'bg-yellow-100 text-yellow-700', removed: 'bg-red-100 text-red-700' };

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [billing, setBilling] = useState([]);
  const [tab, setTab] = useState('users');
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState({});
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({});
  const [billingForm, setBillingForm] = useState({ period_start: '', period_end: '' });
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => { load(); }, [id]);

  async function load() {
    const [c, u, p, b] = await Promise.all([
      api.get(`/admin/clients/${id}`),
      api.get(`/admin/clients/${id}/users`),
      api.get(`/admin/clients/${id}/projects`),
      api.get(`/admin/billing/periods/${id}`),
    ]);
    setClient(c);
    setUsers(u);
    setProjects(p);
    setBilling(b);
  }

  // Client CRUD
  function startEditClient() {
    setClientForm({ name: client.name, contact_email: client.contact_email || '', billing_contact: client.billing_contact || '' });
    setEditingClient(true);
  }

  async function saveClient(e) {
    e.preventDefault();
    await api.put(`/admin/clients/${id}`, clientForm);
    setEditingClient(false);
    load();
  }

  // User editing
  function startEditUser(user) {
    setEditingUserId(user.id);
    setUserForm({
      display_name: user.display_name,
      email: user.email || '',
      user_type: user.user_type,
      status: user.status,
      end_date: user.end_date || '',
      requires_office_license: user.requires_office_license || false,
      project_id: user.project_id || '',
    });
  }

  async function saveUser(e) {
    e.preventDefault();
    await api.put(`/admin/users/${editingUserId}`, {
      ...userForm,
      project_id: userForm.project_id ? parseInt(userForm.project_id) : null,
    });
    setEditingUserId(null);
    load();
  }

  async function handleAddProject() {
    if (!newProjectName.trim()) return;
    await api.post(`/admin/clients/${id}/projects`, { name: newProjectName.trim() });
    setNewProjectName('');
    load();
  }

  async function handleGenerateBilling(e) {
    e.preventDefault();
    const result = await api.post(`/admin/billing/generate/${id}`, billingForm);
    setSelectedPeriod(result);
    setBillingForm({ period_start: '', period_end: '' });
    load();
  }

  if (!client) return <p>Loading...</p>;

  return (
    <div>
      {/* Client header */}
      <div className="mb-6">
        <Link to="/admin/clients" className="text-sm text-blue-600 hover:underline">&larr; All Clients</Link>

        {editingClient ? (
          <form onSubmit={saveClient} className="bg-white p-4 rounded-lg shadow mt-2">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Name *</label>
                <input value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} required
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Contact Email</label>
                <input type="email" value={clientForm.contact_email} onChange={e => setClientForm({ ...clientForm, contact_email: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Billing Contact</label>
                <input value={clientForm.billing_contact} onChange={e => setClientForm({ ...clientForm, billing_contact: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Save</button>
              <button type="button" onClick={() => setEditingClient(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between mt-2">
            <div>
              <h2 className="text-xl font-bold">{client.name}</h2>
              <p className="text-sm text-gray-500">{client.contact_email} &middot; Billing: {client.billing_contact}</p>
            </div>
            <button onClick={startEditClient} className="text-sm text-blue-600 hover:underline">Edit</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['users', 'projects', 'billing'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm font-medium capitalize ${tab === t ? 'bg-gray-900 text-white' : 'bg-white border hover:bg-gray-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Project</th>
                <th className="text-left px-4 py-3 font-medium">Office</th>
                <th className="text-left px-4 py-3 font-medium">Added</th>
                <th className="text-left px-4 py-3 font-medium">End Date</th>
                <th className="text-left px-4 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => editingUserId === u.id ? (
                <tr key={u.id} className="bg-blue-50">
                  <td className="px-4 py-2"><input value={userForm.display_name} onChange={e => setUserForm({ ...userForm, display_name: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></td>
                  <td className="px-4 py-2"><input value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></td>
                  <td className="px-4 py-2">
                    <select value={userForm.user_type} onChange={e => setUserForm({ ...userForm, user_type: e.target.value })} className="border rounded px-2 py-1 text-sm">
                      <option value="standard">Standard</option>
                      <option value="kingdom">Kingdom</option>
                      <option value="gpu">GPU</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select value={userForm.status} onChange={e => setUserForm({ ...userForm, status: e.target.value })} className="border rounded px-2 py-1 text-sm">
                      <option value="active">Active</option>
                      <option value="pending_removal">Pending Removal</option>
                      <option value="removed">Removed</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select value={userForm.project_id} onChange={e => setUserForm({ ...userForm, project_id: e.target.value })} className="border rounded px-2 py-1 text-sm">
                      <option value="">None</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input type="checkbox" checked={userForm.requires_office_license} onChange={e => setUserForm({ ...userForm, requires_office_license: e.target.checked })} />
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{u.added_date}</td>
                  <td className="px-4 py-2"><input type="date" value={userForm.end_date} onChange={e => setUserForm({ ...userForm, end_date: e.target.value })} className="border rounded px-2 py-1 text-xs" /></td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button onClick={saveUser} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                      <button onClick={() => setEditingUserId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.display_name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[u.user_type]}`}>{u.user_type}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[u.status]}`}>{u.status}</span></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.project_name || '—'}</td>
                  <td className="px-4 py-3">{u.requires_office_license ? <span className="text-green-600 text-xs font-medium">Yes</span> : <span className="text-gray-400 text-xs">No</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.added_date}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.end_date || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEditUser(u)} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-center py-8 text-gray-500">No users — they'll appear here when requests are actioned</p>}
        </div>
      )}

      {/* Projects tab */}
      {tab === 'projects' && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">New Project</label>
              <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                placeholder="Project name" className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <button onClick={handleAddProject} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Add</button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Project Name</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projects.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {projects.length === 0 && <p className="text-center py-8 text-gray-500">No projects yet</p>}
          </div>
        </div>
      )}

      {/* Billing tab */}
      {tab === 'billing' && (
        <div>
          <form onSubmit={handleGenerateBilling} className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 items-end">
            <div>
              <label className="block text-xs font-medium mb-1">Period Start</label>
              <input type="date" value={billingForm.period_start} onChange={e => setBillingForm({ ...billingForm, period_start: e.target.value })} required
                className="border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Period End</label>
              <input type="date" value={billingForm.period_end} onChange={e => setBillingForm({ ...billingForm, period_end: e.target.value })} required
                className="border rounded px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Generate</button>
          </form>

          {selectedPeriod && (
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Billing: {selectedPeriod.period_start} to {selectedPeriod.period_end}</h3>
                <span className="text-lg font-bold text-green-700">&pound;{parseFloat(selectedPeriod.total).toFixed(2)}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">User</th>
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Days</th>
                    <th className="text-left px-4 py-2 font-medium">Seat</th>
                    <th className="text-left px-4 py-2 font-medium">Kingdom</th>
                    <th className="text-left px-4 py-2 font-medium">Setup</th>
                    <th className="text-left px-4 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(selectedPeriod.line_items || []).map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{item.display_name}</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[item.user_type]}`}>{item.user_type}</span></td>
                      <td className="px-4 py-2">{item.days_active}</td>
                      <td className="px-4 py-2">&pound;{(item.charges.standard || item.charges.gpu || 0).toFixed(2)}</td>
                      <td className="px-4 py-2">{item.charges.kingdom_addon ? `\u00A3${item.charges.kingdom_addon.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-2">{item.charges.setup_fee ? `\u00A3${item.charges.setup_fee.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-2 font-medium">&pound;{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex justify-end">
                <button onClick={() => exportCSV(selectedPeriod)} className="text-sm text-blue-600 hover:underline">Export CSV</button>
              </div>
            </div>
          )}

          <h3 className="font-bold mb-3">Past Billing Periods</h3>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Period</th>
                  <th className="text-left px-4 py-3 font-medium">Total</th>
                  <th className="text-left px-4 py-3 font-medium">Generated</th>
                  <th className="text-left px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {billing.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedPeriod(b)}>
                    <td className="px-4 py-3">{b.period_start} to {b.period_end}</td>
                    <td className="px-4 py-3 font-medium">&pound;{parseFloat(b.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(b.generated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-blue-600 text-sm">View</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {billing.length === 0 && <p className="text-center py-8 text-gray-500">No billing periods generated</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function exportCSV(period) {
  const items = period.line_items || [];
  const lines = ['User,Type,Days Active,Seat Charge,Kingdom Addon,Setup Fee,Total'];
  for (const item of items) {
    lines.push([
      item.display_name,
      item.user_type,
      item.days_active,
      (item.charges.standard || item.charges.gpu || 0).toFixed(2),
      (item.charges.kingdom_addon || 0).toFixed(2),
      (item.charges.setup_fee || 0).toFixed(2),
      item.total.toFixed(2),
    ].join(','));
  }
  lines.push(`,,,,,,${parseFloat(period.total).toFixed(2)}`);
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `billing-${period.period_start}-${period.period_end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
