import { useState, useEffect } from 'react';
import { api } from '../../api';

const typeColors = { standard: 'bg-blue-100 text-blue-700', kingdom: 'bg-purple-100 text-purple-700', gpu: 'bg-amber-100 text-amber-700' };
const statusColors = { active: 'bg-green-100 text-green-700', pending_removal: 'bg-yellow-100 text-yellow-700' };

export default function PortalUsers() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get('/portal/users').then(setUsers); }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Your Users</h2>
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
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.display_name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[u.user_type]}`}>{u.user_type}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[u.status] || ''}`}>{u.status}</span></td>
                <td className="px-4 py-3 text-gray-600">{u.project_name || '—'}</td>
                <td className="px-4 py-3">{u.requires_office_license ? <span className="text-green-600 text-xs font-medium">Yes</span> : <span className="text-gray-400 text-xs">No</span>}</td>
                <td className="px-4 py-3 text-gray-500">{u.added_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-center py-8 text-gray-500">No users found</p>}
      </div>
    </div>
  );
}
