import { useState, useEffect } from 'react';
import { api } from '../../api';

const typeBadge = { add: 'bg-green-100 text-green-700', remove: 'bg-red-100 text-red-700', change_type: 'bg-blue-100 text-blue-700' };
const statusBadge = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };

export default function PortalRequests() {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('add');
  const [form, setForm] = useState({ requested_user_name: '', requested_user_email: '', requested_user_type: 'standard', user_id: '', requested_end_date: '', notes: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const [r, u] = await Promise.all([api.get('/portal/requests'), api.get('/portal/users')]);
    setRequests(r);
    setUsers(u);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { type: formType, notes: form.notes || undefined };

    if (formType === 'add') {
      payload.requested_user_name = form.requested_user_name;
      payload.requested_user_email = form.requested_user_email || undefined;
      payload.requested_user_type = form.requested_user_type;
    } else if (formType === 'remove') {
      payload.user_id = parseInt(form.user_id);
      payload.requested_end_date = form.requested_end_date || undefined;
    } else {
      payload.user_id = parseInt(form.user_id);
      payload.requested_user_type = form.requested_user_type;
    }

    await api.post('/portal/requests', payload);
    setForm({ requested_user_name: '', requested_user_email: '', requested_user_type: 'standard', user_id: '', requested_end_date: '', notes: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Requests</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">
          {showForm ? 'Cancel' : 'New Request'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex gap-2 mb-4">
            {['add', 'remove', 'change_type'].map(t => (
              <button type="button" key={t} onClick={() => setFormType(t)}
                className={`px-3 py-1.5 rounded text-sm font-medium capitalize ${formType === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                {t === 'change_type' ? 'Change Type' : t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {formType === 'add' && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1">User Name *</label>
                  <input value={form.requested_user_name} onChange={e => setForm({ ...form, requested_user_name: e.target.value })} required
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Email</label>
                  <input type="email" value={form.requested_user_email} onChange={e => setForm({ ...form, requested_user_email: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Seat Type *</label>
                  <select value={form.requested_user_type} onChange={e => setForm({ ...form, requested_user_type: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm">
                    <option value="standard">Standard</option>
                    <option value="kingdom">Kingdom</option>
                    <option value="gpu">GPU</option>
                  </select>
                </div>
              </>
            )}

            {(formType === 'remove' || formType === 'change_type') && (
              <div>
                <label className="block text-xs font-medium mb-1">Select User *</label>
                <select value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} required
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">Choose user...</option>
                  {users.filter(u => u.status === 'active').map(u => (
                    <option key={u.id} value={u.id}>{u.display_name} ({u.user_type})</option>
                  ))}
                </select>
              </div>
            )}

            {formType === 'remove' && (
              <div>
                <label className="block text-xs font-medium mb-1">End Date</label>
                <input type="date" value={form.requested_end_date} onChange={e => setForm({ ...form, requested_end_date: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            )}

            {formType === 'change_type' && (
              <div>
                <label className="block text-xs font-medium mb-1">New Type *</label>
                <select value={form.requested_user_type} onChange={e => setForm({ ...form, requested_user_type: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="standard">Standard</option>
                  <option value="kingdom">Kingdom</option>
                  <option value="gpu">GPU</option>
                </select>
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="mt-4">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Submit Request</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Details</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Submitted</th>
              <th className="text-left px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {requests.map(r => (
              <tr key={r.id}>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadge[r.type]}`}>{r.type}</span></td>
                <td className="px-4 py-3 text-gray-600">
                  {r.type === 'add' && `${r.requested_user_name} (${r.requested_user_type})`}
                  {r.type === 'remove' && `${r.target_user_name || 'User #' + r.user_id} — end: ${r.requested_end_date || 'ASAP'}`}
                  {r.type === 'change_type' && `${r.target_user_name || 'User #' + r.user_id} → ${r.requested_user_type}`}
                </td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge[r.status]}`}>{r.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.submitted_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && <p className="text-center py-8 text-gray-500">No requests yet</p>}
      </div>
    </div>
  );
}
