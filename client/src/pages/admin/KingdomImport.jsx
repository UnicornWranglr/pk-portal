import { useState } from 'react';

export default function KingdomImport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePreview() {
    if (!file) return;
    setError(''); setLoading(true); setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/kingdom/import', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setPreview(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleConfirm() {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/kingdom/import?confirm=true', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
      setPreview(null); setFile(null);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Kingdom Log Import</h2>
      <p className="text-sm text-gray-500 mb-6">Upload a CSV or Excel file containing Kingdom usage data. Only entries for the current month will be processed — historical entries are ignored. Re-importing replaces previous data for the month.</p>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      {/* Verification summary — stays visible after import */}
      {result && (
        <div className="mb-6 space-y-4">
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h3 className="font-bold text-green-800 mb-2">Import Complete — {result.month}</h3>
            <p className="text-sm text-green-700">
              <span className="font-medium">{result.inserted}</span> usage records imported.
              {result.skipped > 0 && <span className="text-gray-500 ml-2">({result.skipped} historical entries skipped)</span>}
              {result.unmatched.length > 0 && <span className="text-amber-700 ml-2">{result.unmatched.length} entries could not be matched.</span>}
            </p>
          </div>

          {/* Per-user verification breakdown */}
          {result.verification && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm">Kingdom Usage Verification — {result.month}</h3>
                <div className="text-sm text-gray-500">
                  <span className="font-medium text-purple-600">{result.verification.total_users}</span> users &middot;
                  <span className="font-medium text-purple-600 ml-1">{result.verification.total_days}</span> license-days &middot;
                  <span className="font-medium text-green-700 ml-1">&pound;{result.verification.total_charge.toFixed(2)}</span> total
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">User</th>
                    <th className="text-left px-4 py-2 font-medium">Days Used</th>
                    <th className="text-left px-4 py-2 font-medium">Rate Applied</th>
                    <th className="text-left px-4 py-2 font-medium">Kingdom Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.verification.users.map((u, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-medium">{u.display_name}</td>
                      <td className="px-4 py-2">{u.days}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{u.rate_applied}</td>
                      <td className="px-4 py-2 font-medium">&pound;{u.charge.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-gray-50">
                  <tr>
                    <td className="px-4 py-2 font-bold">Total</td>
                    <td className="px-4 py-2 font-bold">{result.verification.total_days}</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 font-bold">&pound;{result.verification.total_charge.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload area */}
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
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold">Import Preview — {preview.month}</h3>
              <p className="text-sm text-gray-500">
                {preview.total_rows} rows parsed &middot; {preview.matched.length} matched &middot; {preview.skipped} historical skipped
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPreview(null); setFile(null); }} className="text-sm text-gray-500 px-3 py-1.5 border rounded">Cancel</button>
              <button onClick={handleConfirm} disabled={loading || preview.matched.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Importing...' : `Import ${preview.matched.length} Records`}
              </button>
            </div>
          </div>

          {preview.matched.length > 0 && (
            <>
              <h4 className="text-sm font-medium text-green-700 mb-2">Matched ({preview.matched.length})</h4>
              <div className="bg-green-50 rounded overflow-hidden mb-4 max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-green-100"><tr><th className="text-left px-3 py-2 font-medium">User</th><th className="text-left px-3 py-2 font-medium">Date</th></tr></thead>
                  <tbody className="divide-y divide-green-100">
                    {preview.matched.map((m, i) => <tr key={i}><td className="px-3 py-1.5">{m.display_name}</td><td className="px-3 py-1.5 text-gray-600">{m.date}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {preview.unmatched.length > 0 && (
            <>
              <h4 className="text-sm font-medium text-amber-700 mb-2">Unmatched ({preview.unmatched.length})</h4>
              <div className="bg-amber-50 rounded overflow-hidden max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-amber-100"><tr><th className="text-left px-3 py-2 font-medium">Username</th><th className="text-left px-3 py-2 font-medium">Date</th><th className="text-left px-3 py-2 font-medium">Reason</th></tr></thead>
                  <tbody className="divide-y divide-amber-100">
                    {preview.unmatched.map((u, i) => <tr key={i}><td className="px-3 py-1.5 font-medium">{u.username}</td><td className="px-3 py-1.5 text-gray-600">{u.date}</td><td className="px-3 py-1.5 text-amber-600 text-xs">{u.reason}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
