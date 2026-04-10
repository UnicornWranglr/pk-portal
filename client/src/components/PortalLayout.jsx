import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const navItems = [
  { to: '/portal/users', label: 'Users' },
  { to: '/portal/requests', label: 'Requests' },
  { to: '/portal/billing', label: 'Billing' },
];

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-indigo-900 text-white flex flex-col">
        <div className="p-4 border-b border-indigo-700">
          <h1 className="text-lg font-bold">Peak Portal</h1>
          <p className="text-xs text-indigo-300">Client Portal</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? 'bg-indigo-600' : 'hover:bg-indigo-800'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-indigo-700">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm truncate">{user?.name}</p>
            <NotificationBell />
          </div>
          <button onClick={handleLogout} className="text-xs text-indigo-300 hover:text-white">
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
