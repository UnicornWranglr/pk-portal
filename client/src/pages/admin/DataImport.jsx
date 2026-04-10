import { useState } from 'react';

export default function DataImport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePreview() {
    if (!file) return;
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/data-import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/data-import?confirm=true', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
      setPreview(null);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const clientEntries = preview ? Object.entries(preview.clients) : [];
  const totalUsers = clientEntries.reduce((sum, [, users]) => sum + users.length, 0);

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Client & User Data Import</h2>
      <p className="text-sm text-gray-500 mb-6">
        Upload a CSV or Excel file to bulk-import clients and users. Expected columns:
        <span className="font-mono text-xs ml-1">client_name, user_name, user_type, kingdom_license, added_date, status</span>
      </p>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      {result && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
          <h3 className="font-bold text-green-800 mb-2">Import Complete</h3>
          <p className="text-sm text-green-700">
            <span className="font-medium">{result.users_created}</span> users created across <span className="font-medium">{result.clients}</span> clients.
          </p>
          {result.issues.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-amber-700 font-medium mb-1">{result.issues.length} issue{result.issues.length !== 1 ? 's' : ''}:</p>
              <ul className="text-xs text-amber-600 space-y-0.5 max-h-32 overflow-auto">
                {result.issues.map((iss, i) => (
                  <li key={i}>{iss.row ? `Row ${iss.row}: ` : ''}{iss.issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Upload */}
      {!preview && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={e => setFile(e.target.files[0])}
              className="block mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            <p className="text-xs text-gray-400 mt-2">Accepted: .csv, .xlsx, .xls (max 10MB)</p>
          </div>
          {file && (
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">Selected: <span className="font-medium">{file.name}</span></p>
              <button onClick={handlePreview} disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Processing...' : 'Preview Import'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold">Import Preview</h3>
                <p className="text-sm text-gray-500">
                  {preview.total_rows} rows parsed &middot; {preview.valid} valid &middot; {clientEntries.length} client{clientEntries.length !== 1 ? 's' : ''} &middot; {totalUsers} user{totalUsers !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setPreview(null); setFile(null); }}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border rounded">Cancel</button>
                <button onClick={handleConfirm} disabled={loading || totalUsers === 0}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                  {loading ? 'Importing...' : `Import ${totalUsers} Users`}
                </button>
              </div>
            </div>

            {/* Grouped by client */}
            {clientEntries.map(([clientName, users]) => (
              <div key={clientName} className="mb-4">
                <h4 className="text-sm font-medium mb-1">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs mr-2">Client</span>
                  {clientName}
                  <span className="text-gray-400 ml-2 text-xs">({users.length} user{users.length !== 1 ? 's' : ''})</span>
                </h4>
                <div className="bg-gray-50 rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left px-3 py-1.5 font-medium text-xs">User</th>
                        <th className="text-left px-3 py-1.5 font-medium text-xs">Type</th>
                        <th className="text-left px-3 py-1.5 font-medium text-xs">Kingdom</th>
                        <th className="text-left px-3 py-1.5 font-medium text-xs">Added</th>
                        <th className="text-left px-3 py-1.5 font-medium text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map((u, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-medium">{u.userName}</td>
                          <td className="px-3 py-1.5">{u.userType}</td>
                          <td className="px-3 py-1.5">{u.kingdomLicense ? <span className="text-purple-600 text-xs font-medium">Yes</span> : <span className="text-gray-400 text-xs">No</span>}</td>
                          <td className="px-3 py-1.5 text-gray-500">{u.addedDate}</td>
                          <td className="px-3 py-1.5">{u.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Issues */}
            {preview.issues.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-amber-700 mb-2">Issues ({preview.issues.length})</h4>
                <div className="bg-amber-50 rounded overflow-hidden max-h-48 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-100">
                      <tr>
                        <th className="text-left px-3 py-1.5 font-medium text-xs">Row</th>
                        <th className="text-left px-3 py-1.5 font-medium text-xs">Issue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {preview.issues.map((iss, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-amber-700">{iss.row}</td>
                          <td className="px-3 py-1.5 text-amber-600">{iss.issue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
