import { useState, useEffect } from 'react';
import { api } from '../../api';

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { loadRequests(); }, [filter]);

  async function loadRequests() {
    setRequests(await api.get(`/admin/requests?status=${filter}`));
  }

  async function handleApprove(id) {
    await api.put(`/admin/requests/${id}/approve`);
    loadRequests();
  }

  async function handleReject(id) {
    const notes = prompt('Rejection reason (optional):');
    await api.put(`/admin/requests/${id}/reject`, { notes });
    loadRequests();
  }

  const typeBadge = { add: 'bg-green-100 text-green-700', remove: 'bg-red-100 text-red-700', change_type: 'bg-blue-100 text-blue-700' };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Requests</h2>

      <div className="flex gap-2 mb-4">
        {['pending', 'approved', 'rejected'].map(s => (
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
              <th className="text-left px-4 py-3 font-medium">Requested By</th>
              <th className="text-left px-4 py-3 font-medium">Submitted</th>
              {filter === 'pending' && <th className="text-left px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.client_name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadge[r.type]}`}>{r.type}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {r.type === 'add' && `${r.requested_user_name} (${r.requested_user_type})`}
                  {r.type === 'remove' && `${r.target_user_name || 'User #' + r.user_id} — end: ${r.requested_end_date || 'ASAP'}`}
                  {r.type === 'change_type' && `${r.target_user_name || 'User #' + r.user_id} → ${r.requested_user_type}`}
                </td>
                <td className="px-4 py-3">{r.requested_by_name}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.submitted_at).toLocaleString()}</td>
                {filter === 'pending' && (
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => handleApprove(r.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Approve</button>
                    <button onClick={() => handleReject(r.id)} className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700">Reject</button>
                  </td>
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
