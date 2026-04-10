import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/admin/clients', label: 'Clients' },
  { to: '/admin/requests', label: 'Requests' },
  { to: '/admin/billing-config', label: 'Billing Config' },
  { to: '/admin/kingdom-import', label: 'Kingdom Import' },
  { to: '/admin/data-import', label: 'Data Import' },
  { to: '/admin/activity', label: 'Activity Log' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">Peak Portal</h1>
          <p className="text-xs text-gray-400">Admin</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? 'bg-blue-600' : 'hover:bg-gray-800'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-sm truncate">{user?.name}</p>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white mt-1">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50 p-6">
        <Outlet />
      </main>
    </div>
  );
}
