import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './components/AdminLayout';
import PortalLayout from './components/PortalLayout';
import AdminLogin from './pages/admin/Login';
import Clients from './pages/admin/Clients';
import ClientDetail from './pages/admin/ClientDetail';
import AdminRequests from './pages/admin/Requests';
import BillingConfig from './pages/admin/BillingConfig';
import ActivityLog from './pages/admin/ActivityLog';
import PortalLogin from './pages/portal/Login';
import PortalUsers from './pages/portal/Users';
import PortalRequests from './pages/portal/Requests';

function RequireAuth({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/portal/login'} />;
  if (user.role !== role) return <Navigate to="/" />;
  return children;
}

function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">PK-Portal</h1>
        <p className="text-gray-500 mb-6">Peak Processing Client & Admin Portal</p>
        <div className="flex gap-4 justify-center">
          <a href="/admin/login" className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800">Admin Portal</a>
          <a href="/portal/login" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700">Client Portal</a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
            <Route index element={<Navigate to="clients" />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="billing-config" element={<BillingConfig />} />
            <Route path="activity" element={<ActivityLog />} />
          </Route>

          {/* Client Portal */}
          <Route path="/portal/login" element={<PortalLogin />} />
          <Route path="/portal" element={<RequireAuth role="client"><PortalLayout /></RequireAuth>}>
            <Route index element={<Navigate to="users" />} />
            <Route path="users" element={<PortalUsers />} />
            <Route path="requests" element={<PortalRequests />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
