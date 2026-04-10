import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api';
import { formatDate } from '../../utils';

const typeColors = { standard: 'bg-blue-100 text-blue-700', gpu: 'bg-amber-100 text-amber-700' };
const statusColors = { active: 'bg-green-100 text-green-700', paused: 'bg-gray-200 text-gray-600', pending_removal: 'bg-yellow-100 text-yellow-700', removed: 'bg-red-100 text-red-700' };

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [billing, setBilling] = useState([]);
  const [billingConfig, setBillingConfig] = useState(null);
  const [tab, setTab] = useState('users');
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState({});
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [generatedPreview, setGeneratedPreview] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [kingdomModal, setKingdomModal] = useState(null);
  const [kingdomMonth, setKingdomMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [kingdomDays, setKingdomDays] = useState([]);
  const [kingdomCharge, setKingdomCharge] = useState(null);

  // Billing month/year selector
  const now = new Date();
  const [billMonth, setBillMonth] = useState(now.getMonth() + 1);
  const [billYear, setBillYear] = useState(now.getFullYear());

  useEffect(() => { load(); }, [id]);

  async function load() {
    const [c, u, p, b, bc] = await Promise.all([
      api.get(`/admin/clients/${id}`),
      api.get(`/admin/clients/${id}/users`),
      api.get(`/admin/clients/${id}/projects`),
      api.get(`/admin/billing/periods/${id}`),
      api.get('/admin/billing/config'),
    ]);
    setClient(c);
    setUsers(u);
    setProjects(p);
    setBilling(b);
    setBillingConfig(bc);
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
      display_name: user.display_name, email: user.email || '',
      user_type: user.user_type, status: user.status,
      end_date: user.end_date || '', requires_office_license: user.requires_office_license || false,
      kingdom_license: user.kingdom_license || false, project_id: user.project_id || '',
    });
  }

  async function saveUser(e) {
    e.preventDefault();
    await api.put(`/admin/users/${editingUserId}`, {
      ...userForm, project_id: userForm.project_id ? parseInt(userForm.project_id) : null,
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

  // Billing — generate preview then save
  async function handleGenerateBill() {
    const daysInMonth = new Date(billYear, billMonth, 0).getDate();
    const period_start = `${billYear}-${String(billMonth).padStart(2, '0')}-01`;
    const period_end = `${billYear}-${String(billMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const result = await api.post(`/admin/billing/generate/${id}`, { period_start, period_end });
    setGeneratedPreview(result);
    setSelectedPeriod(null);
    load();
  }

  // Kingdom usage calendar
  async function openKingdomModal(user) {
    setKingdomModal({ userId: user.id, userName: user.display_name });
    await loadKingdomDays(user.id, kingdomMonth);
  }

  async function loadKingdomDays(userId, month) {
    const days = await api.get(`/admin/users/${userId}/kingdom-usage?month=${month}`);
    setKingdomDays(days);
    // Calculate charge
    if (billingConfig && days.length > 0) {
      const dailyTotal = days.length * parseFloat(billingConfig.kingdom_addon_daily);
      const monthlyRate = parseFloat(billingConfig.kingdom_addon_monthly);
      setKingdomCharge(dailyTotal >= monthlyRate ? monthlyRate : dailyTotal);
    } else {
      setKingdomCharge(0);
    }
  }

  async function toggleKingdomDay(date) {
    const exists = kingdomDays.some(d => d.usage_date === date || d.usage_date?.slice(0, 10) === date);
    await api.put(`/admin/users/${kingdomModal.userId}/kingdom-usage`, { date, active: !exists });
    await loadKingdomDays(kingdomModal.userId, kingdomMonth);
  }

  function changeKingdomMonth(delta) {
    const d = new Date(kingdomMonth + '-01');
    d.setMonth(d.getMonth() + delta);
    const newMonth = d.toISOString().slice(0, 7);
    setKingdomMonth(newMonth);
    loadKingdomDays(kingdomModal.userId, newMonth);
  }

  function renderCalendar() {
    const year = parseInt(kingdomMonth.slice(0, 4));
    const month = parseInt(kingdomMonth.slice(5, 7)) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const daySet = new Set(kingdomDays.map(d => (d.usage_date?.slice ? d.usage_date.slice(0, 10) : d.usage_date)));
    const today = new Date().toISOString().slice(0, 10);
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isActive = daySet.has(dateStr);
      const isToday = dateStr === today;
      cells.push(
        <button key={day} onClick={() => toggleKingdomDay(dateStr)}
          className={`h-9 w-9 rounded text-sm font-medium transition-colors
            ${isActive ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            ${isToday ? 'ring-2 ring-purple-400' : ''}`}>
          {day}
        </button>
      );
    }
    return cells;
  }

  if (!client) return <p>Loading...</p>;

  const activeBill = generatedPreview || selectedPeriod;

  return (
    <div>
      {/* Kingdom Usage Modal */}
      {kingdomModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[420px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Kingdom Usage — {kingdomModal.userName}</h3>
              <button onClick={() => setKingdomModal(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => changeKingdomMonth(-1)} className="text-sm text-gray-500 hover:text-gray-700">&larr; Prev</button>
              <span className="font-medium">{new Date(kingdomMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
              <button onClick={() => changeKingdomMonth(1)} className="text-sm text-gray-500 hover:text-gray-700">Next &rarr;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-xs text-gray-400 font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
            {/* Kingdom usage summary */}
            <div className="mt-4 bg-purple-50 rounded p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-purple-800">
                    {kingdomDays.length} usage day{kingdomDays.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-purple-600 mt-0.5">
                    {kingdomDays.length} &times; &pound;{billingConfig ? parseFloat(billingConfig.kingdom_addon_daily).toFixed(2) : '—'}/day
                    {billingConfig && kingdomDays.length * parseFloat(billingConfig.kingdom_addon_daily) >= parseFloat(billingConfig.kingdom_addon_monthly) && (
                      <span className="ml-1">(capped at monthly rate)</span>
                    )}
                  </p>
                </div>
                <p className="text-lg font-bold text-purple-700">
                  &pound;{kingdomCharge !== null ? kingdomCharge.toFixed(2) : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client header */}
      <div className="mb-6">
        <Link to="/admin/clients" className="text-sm text-blue-600 hover:underline">&larr; All Clients</Link>
        {editingClient ? (
          <form onSubmit={saveClient} className="bg-white p-4 rounded-lg shadow mt-2">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Name *</label>
                <input value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} required className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Contact Email</label>
                <input type="email" value={clientForm.contact_email} onChange={e => setClientForm({ ...clientForm, contact_email: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Billing Contact</label>
                <input value={clientForm.billing_contact} onChange={e => setClientForm({ ...clientForm, billing_contact: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
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
              <p className="text-sm text-gray-500">
                {client.contact_email}
                {client.billing_contact && <span> &middot; Billing: {client.billing_contact}</span>}
              </p>
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
                <th className="text-left px-4 py-3 font-medium">Kingdom</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Project</th>
                <th className="text-left px-4 py-3 font-medium">Office</th>
                <th className="text-left px-4 py-3 font-medium">Added</th>
                <th className="text-left px-4 py-3 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => editingUserId === u.id ? (
                <tr key={u.id} className="bg-blue-50">
                  <td className="px-4 py-2"><input value={userForm.display_name} onChange={e => setUserForm({ ...userForm, display_name: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></td>
                  <td className="px-4 py-2"><input value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></td>
                  <td className="px-4 py-2">
                    <select value={userForm.user_type} onChange={e => setUserForm({ ...userForm, user_type: e.target.value })} className="border rounded px-2 py-1 text-sm">
                      <option value="standard">Standard</option><option value="gpu">GPU</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center"><input type="checkbox" checked={userForm.kingdom_license} onChange={e => setUserForm({ ...userForm, kingdom_license: e.target.checked })} /></td>
                  <td className="px-4 py-2">
                    <select value={userForm.status} onChange={e => setUserForm({ ...userForm, status: e.target.value })} className="border rounded px-2 py-1 text-sm">
                      <option value="active">Active</option><option value="paused">Paused</option><option value="pending_removal">Pending Removal</option><option value="removed">Removed</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select value={userForm.project_id} onChange={e => setUserForm({ ...userForm, project_id: e.target.value })} className="border rounded px-2 py-1 text-sm">
                      <option value="">None</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center"><input type="checkbox" checked={userForm.requires_office_license} onChange={e => setUserForm({ ...userForm, requires_office_license: e.target.checked })} /></td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{formatDate(u.added_date)}</td>
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
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[u.user_type] || 'bg-gray-100'}`}>{u.user_type}</span></td>
                  <td className="px-4 py-3">
                    {u.kingdom_license ? (
                      <button onClick={() => openKingdomModal(u)} className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200">Kingdom</button>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[u.status]}`}>{u.status}</span></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.project_name || '—'}</td>
                  <td className="px-4 py-3">{u.requires_office_license ? <span className="text-green-600 text-xs font-medium">Yes</span> : <span className="text-gray-400 text-xs">No</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.added_date)}</td>
                  <td className="px-4 py-3"><button onClick={() => startEditUser(u)} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button></td>
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
              <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project name" className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <button onClick={handleAddProject} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Add</button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 font-medium">Project Name</th><th className="text-left px-4 py-3 font-medium">Created</th></tr></thead>
              <tbody className="divide-y">
                {projects.map(p => (<tr key={p.id}><td className="px-4 py-3 font-medium">{p.name}</td><td className="px-4 py-3 text-gray-500">{formatDate(p.created_at)}</td></tr>))}
              </tbody>
            </table>
            {projects.length === 0 && <p className="text-center py-8 text-gray-500">No projects yet</p>}
          </div>
        </div>
      )}

      {/* Billing tab */}
      {tab === 'billing' && (
        <div>
          {/* Month/year selector */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 items-end">
            <div>
              <label className="block text-xs font-medium mb-1">Month</label>
              <select value={billMonth} onChange={e => setBillMonth(parseInt(e.target.value))} className="border rounded px-3 py-2 text-sm">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en-GB', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Year</label>
              <select value={billYear} onChange={e => setBillYear(parseInt(e.target.value))} className="border rounded px-3 py-2 text-sm">
                {Array.from({ length: 5 }, (_, i) => {
                  const y = now.getFullYear() - 2 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <button onClick={handleGenerateBill} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
              Generate Bill
            </button>
          </div>

          {/* Active bill (generated or selected from history) */}
          {activeBill && (
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">
                  {activeBill.period_start} to {activeBill.period_end}
                  {generatedPreview && <span className="ml-2 text-xs text-green-600 font-normal">Saved</span>}
                </h3>
                <span className="text-lg font-bold text-green-700">&pound;{parseFloat(activeBill.total).toFixed(2)}</span>
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
                  {(activeBill.line_items || []).map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">
                        {item.display_name}
                        {item.kingdom_license && <span className="ml-1 text-xs text-purple-600">[K]</span>}
                      </td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[item.user_type]}`}>{item.user_type}</span></td>
                      <td className="px-4 py-2">
                        {item.days_active}
                        {item.kingdom_usage_days > 0 && <span className="text-purple-600 text-xs ml-1">({item.kingdom_usage_days}K)</span>}
                      </td>
                      <td className="px-4 py-2">&pound;{(item.charges.standard || item.charges.gpu || 0).toFixed(2)}</td>
                      <td className="px-4 py-2">{item.charges.kingdom_addon ? `\u00A3${item.charges.kingdom_addon.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-2">{item.charges.setup_fee ? `\u00A3${item.charges.setup_fee.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-2 font-medium">&pound;{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex justify-end">
                <button onClick={() => exportCSV(activeBill)} className="text-sm text-blue-600 hover:underline">Export CSV</button>
              </div>
            </div>
          )}

          {/* Past billing periods */}
          <h3 className="font-bold mb-3">Saved Billing Periods</h3>
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
                  <tr key={b.id} className={`hover:bg-gray-50 cursor-pointer ${selectedPeriod?.id === b.id ? 'bg-blue-50' : ''}`}
                    onClick={() => { setSelectedPeriod(b); setGeneratedPreview(null); }}>
                    <td className="px-4 py-3">{formatDate(b.period_start)} — {formatDate(b.period_end)}</td>
                    <td className="px-4 py-3 font-medium">&pound;{parseFloat(b.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(b.generated_at, true)}</td>
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
  const lines = ['User,Type,Kingdom,Days Active,Kingdom Days,Seat Charge,Kingdom Charge,Setup Fee,Total'];
  for (const item of items) {
    lines.push([
      item.display_name, item.user_type, item.kingdom_license ? 'Yes' : 'No',
      item.days_active, item.kingdom_usage_days || 0,
      (item.charges.standard || item.charges.gpu || 0).toFixed(2),
      (item.charges.kingdom_addon || 0).toFixed(2),
      (item.charges.setup_fee || 0).toFixed(2),
      item.total.toFixed(2),
    ].join(','));
  }
  lines.push(`,,,,,,,,${parseFloat(period.total).toFixed(2)}`);
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `billing-${period.period_start}-${period.period_end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
