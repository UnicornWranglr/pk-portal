import { useState, useEffect } from 'react';
import { api } from '../../api';
import { formatDate } from '../../utils';

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
  const [savedConfig, setSavedConfig] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    const data = await api.get('/admin/billing/config');
    setConfig(data);
    setSavedConfig(data);
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = {};
    for (const f of fields) {
      payload[f.key] = f.isInt ? parseInt(config[f.key]) : parseFloat(config[f.key]);
    }
    const updated = await api.put('/admin/billing/config', payload);
    setConfig(updated);
    setSavedConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!config) return <p>Loading...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Billing Configuration</h2>

      <div className="grid grid-cols-2 gap-6 max-w-3xl">
        {/* Current values */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-sm mb-4">Current Rates</h3>
          <div className="space-y-3">
            {fields.map(f => (
              <div key={f.key} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{f.label}</span>
                <span className="text-sm font-medium">
                  {f.isInt ? savedConfig[f.key] : `\u00A3${parseFloat(savedConfig[f.key]).toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 pt-3 border-t">
            Last updated: {formatDate(savedConfig.updated_at, true)}
          </p>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-sm mb-4">Edit Rates</h3>
          <div className="space-y-3">
            {fields.map(f => (
              <div key={f.key} className="flex items-center justify-between">
                <label className="text-sm text-gray-600">{f.label}</label>
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
          <div className="mt-6 pt-3 border-t flex items-center gap-3">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              Save Changes
            </button>
            {saved && (
              <span className="text-green-600 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Saved successfully
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
