import { useState, useEffect } from 'react';
import { api } from '../../api';
import { formatDate } from '../../utils';

const typeColors = { standard: 'bg-blue-100 text-blue-700', gpu: 'bg-amber-100 text-amber-700' };

// Handle both old and new line item formats
function getSeatCharge(item) {
  if (item.charges.seat) return item.charges.seat;
  return { amount: item.charges.standard || item.charges.gpu || 0, rate_applied: null };
}
function getKingdomCharge(item) {
  if (item.charges.kingdom) return item.charges.kingdom;
  if (item.charges.kingdom_addon) return { amount: item.charges.kingdom_addon, rate_applied: null, days: item.kingdom_usage_days };
  return null;
}

export default function PortalBilling() {
  const [periods, setPeriods] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { api.get('/portal/billing').then(setPeriods); }, []);

  async function handleApprove(id) {
    await api.put(`/portal/billing/${id}/approve`);
    setPeriods(await api.get('/portal/billing'));
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Billing</h2>

      {periods.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No billing periods available yet</div>
      )}

      <div className="space-y-4">
        {periods.map(p => {
          const items = p.line_items || [];
          const isExpanded = expandedId === p.id;
          return (
            <div key={p.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm">{formatDate(p.period_start)} — {formatDate(p.period_end)}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Generated: {formatDate(p.generated_at, true)}
                      {p.sent_at && <span className="ml-3">Sent: {formatDate(p.sent_at, true)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-700">&pound;{parseFloat(p.total).toFixed(2)}</span>
                    {p.client_approved ? (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Approved</span>
                    ) : p.sent_at ? (
                      <button onClick={e => { e.stopPropagation(); handleApprove(p.id); }}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-indigo-700">
                        Approve Bill
                      </button>
                    ) : null}
                    <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t px-4 pb-4">
                  <table className="w-full text-sm mt-3">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">User</th>
                        <th className="text-left px-3 py-2 font-medium">Type</th>
                        <th className="text-left px-3 py-2 font-medium">Active Period</th>
                        <th className="text-left px-3 py-2 font-medium">Days</th>
                        <th className="text-left px-3 py-2 font-medium">Seat</th>
                        <th className="text-left px-3 py-2 font-medium">Kingdom</th>
                        <th className="text-left px-3 py-2 font-medium">Setup</th>
                        <th className="text-left px-3 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item, i) => {
                        const seat = getSeatCharge(item);
                        const kingdom = getKingdomCharge(item);
                        return (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium">{item.display_name}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[item.user_type]}`}>{item.user_type}</span></td>
                            <td className="px-3 py-2 text-xs text-gray-600">{item.active_period || '—'}</td>
                            <td className="px-3 py-2">{item.days_active}</td>
                            <td className="px-3 py-2">&pound;{seat.amount.toFixed(2)}{seat.rate_applied && <span className="text-xs text-gray-400 ml-1">({seat.rate_applied})</span>}</td>
                            <td className="px-3 py-2">{kingdom ? <span>&pound;{kingdom.amount.toFixed(2)} <span className="text-xs text-gray-400">({kingdom.days}d)</span></span> : '—'}</td>
                            <td className="px-3 py-2">{item.charges.setup_fee ? `\u00A3${item.charges.setup_fee.toFixed(2)}` : '—'}</td>
                            <td className="px-3 py-2 font-medium">&pound;{item.total.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t bg-gray-50">
                      <tr><td colSpan={7} className="px-3 py-2 text-right font-bold">Total</td><td className="px-3 py-2 font-bold">&pound;{parseFloat(p.total).toFixed(2)}</td></tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
