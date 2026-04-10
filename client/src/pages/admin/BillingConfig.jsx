import { useState, useEffect } from 'react';
import { api } from '../../api';

const fields = [
  { key: 'standard_daily', label: 'Standard Daily Rate' },
  { key: 'standard_monthly', label: 'Standard Monthly Rate' },
  { key: 'kingdom_addon_daily', label: 'Kingdom Add-on Daily' },
  { key: 'kingdom_addon_monthly', label: 'Kingdom Add-on Monthly' },
  { key: 'gpu_daily', label: 'GPU Daily Rate' },
  { key: 'gpu_monthly', label: 'GPU Monthly Rate' },
  { key: 'setup_fee', label: 'Setup Fee (one-off)' },
  { key: 'fair_use_threshold_days', label: 'Fair-Use Threshold (days)', isInt: true },
];

export default function BillingConfig() {
  const [config, setConfig] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    setConfig(await api.get('/admin/billing/config'));
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = {};
    for (const f of fields) {
      payload[f.key] = f.isInt ? parseInt(config[f.key]) : parseFloat(config[f.key]);
    }
    setConfig(await api.put('/admin/billing/config', payload));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!config) return <p>Loading...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Billing Configuration</h2>
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 max-w-lg">
        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.key} className="flex items-center justify-between">
              <label className="text-sm font-medium">{f.label}</label>
              <div className="flex items-center">
                {!f.isInt && <span className="text-gray-400 mr-1">&pound;</span>}
                <input
                  type="number" step={f.isInt ? '1' : '0.01'}
                  value={config[f.key]} onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                  className="w-28 border rounded px-3 py-1.5 text-sm text-right"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Save Changes</button>
          {saved && <span className="text-green-600 text-sm">Saved!</span>}
        </div>
        <p className="text-xs text-gray-400 mt-4">Last updated: {new Date(config.updated_at).toLocaleString()}</p>
      </form>
    </div>
  );
}
