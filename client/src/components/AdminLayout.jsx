import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/clients', label: 'Clients', badgeKey: 'unbilled' },
  { to: '/admin/requests', label: 'Requests', badgeKey: 'pending' },
  { to: '/admin/billing-config', label: 'Billing Config' },
  { to: '/admin/kingdom-import', label: 'Kingdom Import' },
  { to: '/admin/data-import', label: 'Data Import' },
  { to: '/admin/activity', label: 'Activity Log' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [badges, setBadges] = useState({ pending: 0, unbilled: 0 });

  useEffect(() => {
    loadBadges();
    const interval = setInterval(loadBadges, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadBadges() {
    try {
      const [requests, unbilled] = await Promise.all([
        api.get('/admin/requests?status=pending'),
        api.get('/admin/billing/unbilled-count'),
      ]);
      setBadges({
        pending: Array.isArray(requests) ? requests.length : 0,
        unbilled: unbilled.count || 0,
      });
    } catch { /* ignore */ }
  }

  function handleLogout() { logout(); navigate('/'); }

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">Peak Portal</h1>
          <p className="text-xs text-gray-400">Admin</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label, badgeKey }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `flex items-center justify-between px-3 py-2 rounded text-sm ${isActive ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
              {label}
              {badgeKey && badges[badgeKey] > 0 && (
                <span className={`text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 ${badgeKey === 'pending' ? 'bg-yellow-500 text-gray-900' : 'bg-red-500 text-white'}`}>
                  {badges[badgeKey]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-sm truncate">{user?.name}</p>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white mt-1">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50 p-6"><Outlet /></main>
    </div>
  );
}
