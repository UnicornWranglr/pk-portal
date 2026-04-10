import { useState, useEffect } from 'react';
import { api } from '../../api';

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [actionNotes, setActionNotes] = useState({});

  useEffect(() => { loadRequests(); }, [filter]);

  async function loadRequests() {
    setRequests(await api.get(`/admin/requests?status=${filter}`));
  }

  async function handleAction(id) {
    await api.put(`/admin/requests/${id}/action`, { admin_notes: actionNotes[id] || null });
    setActionNotes({ ...actionNotes, [id]: '' });
    loadRequests();
  }

  async function handleReject(id) {
    await api.put(`/admin/requests/${id}/reject`, { admin_notes: actionNotes[id] || null });
    setActionNotes({ ...actionNotes, [id]: '' });
    loadRequests();
  }

  const typeBadge = { add: 'bg-green-100 text-green-700', remove: 'bg-red-100 text-red-700', change_type: 'bg-blue-100 text-blue-700' };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Requests</h2>

      <div className="flex gap-2 mb-4">
        {['pending', 'actioned', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded text-sm font-medium capitalize ${filter === s ? 'bg-gray-900 text-white' : 'bg-white border hover:bg-gray-50'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Client</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Details</th>
              <th className="text-left px-4 py-3 font-medium">Client Notes</th>
              <th className="text-left px-4 py-3 font-medium">Requested By</th>
              <th className="text-left px-4 py-3 font-medium">Submitted</th>
              {filter === 'pending' && <th className="text-left px-4 py-3 font-medium">Actions</th>}
              {filter !== 'pending' && <th className="text-left px-4 py-3 font-medium">Admin Notes</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.client_name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadge[r.type]}`}>{r.type}</span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {r.type === 'add' && (
                    <div>
                      <span className="font-medium">{r.requested_user_name}</span> ({r.requested_user_type})
                      {r.requested_kingdom_license && <span className="ml-1 text-purple-600">[Kingdom]</span>}
                      {r.requested_office_license && <span className="ml-1 text-blue-600">[Office]</span>}
                      {r.project_name && <span className="ml-1 text-gray-500">[{r.project_name}]</span>}
                      {r.requested_start_date && <div className="text-gray-400 mt-0.5">Start: {r.requested_start_date}</div>}
                    </div>
                  )}
                  {r.type === 'remove' && `${r.target_user_name || 'User #' + r.user_id} — end: ${r.requested_end_date || 'ASAP'}`}
                  {r.type === 'change_type' && `${r.target_user_name || 'User #' + r.user_id} → ${r.requested_user_type}`}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px]">{r.notes || '—'}</td>
                <td className="px-4 py-3">{r.requested_by_name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.submitted_at).toLocaleString()}</td>
                {filter === 'pending' && (
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <textarea
                        value={actionNotes[r.id] || ''}
                        onChange={e => setActionNotes({ ...actionNotes, [r.id]: e.target.value })}
                        placeholder="Admin notes (optional)"
                        rows={2}
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(r.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Action</button>
                        <button onClick={() => handleReject(r.id)} className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700">Reject</button>
                      </div>
                    </div>
                  </td>
                )}
                {filter !== 'pending' && (
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px]">{r.admin_notes || '—'}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && <p className="text-center py-8 text-gray-500">No {filter} requests</p>}
      </div>
    </div>
  );
}
