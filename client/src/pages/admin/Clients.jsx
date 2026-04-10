import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { formatDate } from '../../utils';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', contact_email: '', billing_contact: '' });

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    setClients(await api.get('/admin/clients'));
  }

  async function handleCreate(e) {
    e.preventDefault();
    await api.post('/admin/clients', form);
    setForm({ name: '', contact_email: '', billing_contact: '' });
    setShowForm(false);
    loadClients();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Clients</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
          {showForm ? 'Cancel' : 'Add Client'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Contact Email</label>
            <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Billing Contact</label>
            <input value={form.billing_contact} onChange={e => setForm({ ...form, billing_contact: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="col-span-3">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Create</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Contact Email</th>
              <th className="text-left px-4 py-3 font-medium">Billing Contact</th>
              <th className="text-left px-4 py-3 font-medium">Active Users</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/admin/clients/${c.id}`} className="text-blue-600 hover:underline font-medium">{c.name}</Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.contact_email || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.billing_contact || '—'}</td>
                <td className="px-4 py-3">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{c.active_users}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && <p className="text-center py-8 text-gray-500">No clients yet</p>}
      </div>
    </div>
  );
}
