import { useState, useEffect } from 'react';
import { api } from '../../api';
import { formatDate } from '../../utils';

const typeBadge = { add: 'bg-green-100 text-green-700', remove: 'bg-red-100 text-red-700', change_type: 'bg-blue-100 text-blue-700', move_project: 'bg-purple-100 text-purple-700' };
const statusBadge = { pending: 'bg-yellow-100 text-yellow-700', actioned: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };

export default function PortalRequests() {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('add');
  const [form, setForm] = useState({
    requested_user_name: '', requested_user_email: '', requested_user_type: 'standard',
    user_id: '', requested_end_date: '', requested_start_date: '', notes: '',
    requested_office_license: false, requested_kingdom_license: false,
    assign_project: false, requested_project_id: '',
  });
  const [newProjectName, setNewProjectName] = useState('');
  const [addingProject, setAddingProject] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [r, u, p] = await Promise.all([api.get('/portal/requests'), api.get('/portal/users'), api.get('/portal/projects')]);
    setRequests(r); setUsers(u); setProjects(p);
  }

  async function handleAddProject() {
    if (!newProjectName.trim()) return;
    const project = await api.post('/portal/projects', { name: newProjectName.trim() });
    setProjects([...projects, project]);
    setForm({ ...form, requested_project_id: String(project.id) });
    setNewProjectName(''); setAddingProject(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { type: formType, notes: form.notes || undefined };

    if (formType === 'add') {
      payload.requested_user_name = form.requested_user_name;
      payload.requested_user_email = form.requested_user_email || undefined;
      payload.requested_user_type = form.requested_user_type;
      payload.requested_start_date = form.requested_start_date || undefined;
      payload.requested_office_license = form.requested_office_license;
      payload.requested_kingdom_license = form.requested_kingdom_license;
      payload.requested_project_id = form.assign_project && form.requested_project_id ? parseInt(form.requested_project_id) : undefined;
    } else if (formType === 'remove') {
      payload.user_id = parseInt(form.user_id);
      payload.requested_end_date = form.requested_end_date || undefined;
    } else if (formType === 'change_type') {
      payload.user_id = parseInt(form.user_id);
      payload.requested_user_type = form.requested_user_type;
    } else if (formType === 'move_project') {
      payload.user_id = parseInt(form.user_id);
      payload.requested_project_id = parseInt(form.requested_project_id);
    }

    await api.post('/portal/requests', payload);
    setForm({ requested_user_name: '', requested_user_email: '', requested_user_type: 'standard', user_id: '', requested_end_date: '', requested_start_date: '', notes: '', requested_office_license: false, requested_kingdom_license: false, assign_project: false, requested_project_id: '' });
    setShowForm(false); load();
  }

  const typeLabels = { add: 'Add User', remove: 'Remove User', change_type: 'Change Type', move_project: 'Move Project' };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Requests</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">
          {showForm ? 'Cancel' : 'New Request'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg shadow mb-6">
          <div className="flex gap-2 mb-5">
            {['add', 'remove', 'change_type', 'move_project'].map(t => (
              <button type="button" key={t} onClick={() => setFormType(t)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${formType === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                {typeLabels[t]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {formType === 'add' && (
              <>
                <div><label className="block text-xs font-medium mb-1">User Name *</label><input value={form.requested_user_name} onChange={e => setForm({ ...form, requested_user_name: e.target.value })} required className="w-full border rounded px-3 py-2 text-sm" placeholder="Full name" /></div>
                <div><label className="block text-xs font-medium mb-1">Email</label><input type="email" value={form.requested_user_email} onChange={e => setForm({ ...form, requested_user_email: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" placeholder="user@company.com" /></div>
                <div><label className="block text-xs font-medium mb-1">Seat Type *</label><select value={form.requested_user_type} onChange={e => setForm({ ...form, requested_user_type: e.target.value })} className="w-full border rounded px-3 py-2 text-sm"><option value="standard">Standard</option><option value="gpu">GPU</option></select></div>
                <div><label className="block text-xs font-medium mb-1">Start Date</label><input type="date" value={form.requested_start_date} onChange={e => setForm({ ...form, requested_start_date: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" /><p className="text-xs text-gray-400 mt-1">When should access begin?</p></div>

                <div className="col-span-2 bg-gray-50 p-3 rounded">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={form.requested_office_license} onChange={e => setForm({ ...form, requested_office_license: e.target.checked })} className="sr-only peer" /><div className="w-9 h-5 bg-gray-300 peer-checked:bg-indigo-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div></label>
                    <div><span className="text-sm font-medium">Microsoft Office License</span><p className="text-xs text-gray-500">Does this user require a Microsoft Office license (Outlook, Teams etc.)?</p></div>
                  </div>
                </div>
                <div className="col-span-2 bg-gray-50 p-3 rounded">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={form.requested_kingdom_license} onChange={e => setForm({ ...form, requested_kingdom_license: e.target.checked })} className="sr-only peer" /><div className="w-9 h-5 bg-gray-300 peer-checked:bg-purple-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div></label>
                    <div><span className="text-sm font-medium">Kingdom Software License</span><p className="text-xs text-gray-500">Does this user require access to the Kingdom seismic interpretation software?</p></div>
                  </div>
                </div>
                <div className="col-span-2 bg-gray-50 p-3 rounded">
                  <div className="flex items-center gap-3 mb-2">
                    <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={form.assign_project} onChange={e => setForm({ ...form, assign_project: e.target.checked, requested_project_id: '' })} className="sr-only peer" /><div className="w-9 h-5 bg-gray-300 peer-checked:bg-indigo-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div></label>
                    <div><span className="text-sm font-medium">Assign to Project</span><p className="text-xs text-gray-500">Is this user assigned to a specific project?</p></div>
                  </div>
                  {form.assign_project && (
                    <div className="ml-12 mt-2">
                      {!addingProject ? (
                        <div className="flex gap-2">
                          <select value={form.requested_project_id} onChange={e => setForm({ ...form, requested_project_id: e.target.value })} className="flex-1 border rounded px-3 py-2 text-sm">
                            <option value="">Select project...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <button type="button" onClick={() => setAddingProject(true)} className="text-sm text-indigo-600 hover:text-indigo-800 whitespace-nowrap">+ New project</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project name" className="flex-1 border rounded px-3 py-2 text-sm" />
                          <button type="button" onClick={handleAddProject} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm">Add</button>
                          <button type="button" onClick={() => { setAddingProject(false); setNewProjectName(''); }} className="text-sm text-gray-500">Cancel</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {(formType === 'remove' || formType === 'change_type' || formType === 'move_project') && (
              <div>
                <label className="block text-xs font-medium mb-1">Select User *</label>
                <select value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} required className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">Choose user...</option>
                  {users.filter(u => u.status === 'active').map(u => <option key={u.id} value={u.id}>{u.display_name} ({u.user_type})</option>)}
                </select>
              </div>
            )}

            {formType === 'remove' && (
              <div><label className="block text-xs font-medium mb-1">End Date</label><input type="date" value={form.requested_end_date} onChange={e => setForm({ ...form, requested_end_date: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" /><p className="text-xs text-gray-400 mt-1">Last day of access</p></div>
            )}

            {formType === 'change_type' && (
              <div><label className="block text-xs font-medium mb-1">New Type *</label><select value={form.requested_user_type} onChange={e => setForm({ ...form, requested_user_type: e.target.value })} className="w-full border rounded px-3 py-2 text-sm"><option value="standard">Standard</option><option value="gpu">GPU</option></select></div>
            )}

            {formType === 'move_project' && (
              <div>
                <label className="block text-xs font-medium mb-1">New Project *</label>
                <select value={form.requested_project_id} onChange={e => setForm({ ...form, requested_project_id: e.target.value })} required className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            <div className="col-span-2"><label className="block text-xs font-medium mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any additional information — e.g. special requirements" className="w-full border rounded px-3 py-2 text-sm" /></div>
          </div>

          <div className="mt-4"><button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Submit Request</button></div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Type</th><th className="text-left px-4 py-3 font-medium">Details</th>
              <th className="text-left px-4 py-3 font-medium">Status</th><th className="text-left px-4 py-3 font-medium">Submitted</th>
              <th className="text-left px-4 py-3 font-medium">Notes</th><th className="text-left px-4 py-3 font-medium">Admin Response</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {requests.map(r => (
              <tr key={r.id}>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadge[r.type] || 'bg-gray-100'}`}>{r.type === 'move_project' ? 'move project' : r.type}</span></td>
                <td className="px-4 py-3 text-gray-600">
                  {r.type === 'add' && <span>{r.requested_user_name} ({r.requested_user_type}){r.requested_kingdom_license && <span className="ml-1 text-xs text-purple-600">[Kingdom]</span>}{r.requested_office_license && <span className="ml-1 text-xs text-blue-600">[Office]</span>}{r.project_name && <span className="ml-1 text-xs text-purple-600">[{r.project_name}]</span>}</span>}
                  {r.type === 'remove' && `${r.target_user_name || 'User #' + r.user_id} — end: ${r.requested_end_date ? formatDate(r.requested_end_date) : 'ASAP'}`}
                  {r.type === 'change_type' && `${r.target_user_name || 'User #' + r.user_id} → ${r.requested_user_type}`}
                  {r.type === 'move_project' && `${r.target_user_name || 'User #' + r.user_id} → ${r.project_name || 'Project'}`}
                </td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge[r.status]}`}>{r.status}</span></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(r.submitted_at, true)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate">{r.notes || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate">{r.admin_notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && <p className="text-center py-8 text-gray-500">No requests yet</p>}
      </div>
    </div>
  );
}
