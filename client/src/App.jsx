import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './components/AdminLayout';
import PortalLayout from './components/PortalLayout';
import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Clients from './pages/admin/Clients';
import ClientDetail from './pages/admin/ClientDetail';
import AdminRequests from './pages/admin/Requests';
import BillingConfig from './pages/admin/BillingConfig';
import ActivityLog from './pages/admin/ActivityLog';
import KingdomImport from './pages/admin/KingdomImport';
import DataImport from './pages/admin/DataImport';
import PortalUsers from './pages/portal/Users';
import PortalRequests from './pages/portal/Requests';

function RequireAuth({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;
  if (user.role !== role) return <Navigate to="/" />;
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Login />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" />;
  return <Navigate to="/portal/users" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          {/* Admin */}
          <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
            <Route index element={<Navigate to="dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="billing-config" element={<BillingConfig />} />
            <Route path="kingdom-import" element={<KingdomImport />} />
            <Route path="data-import" element={<DataImport />} />
            <Route path="activity" element={<ActivityLog />} />
          </Route>

          {/* Client Portal */}
          <Route path="/portal" element={<RequireAuth role="client"><PortalLayout /></RequireAuth>}>
            <Route index element={<Navigate to="users" />} />
            <Route path="users" element={<PortalUsers />} />
            <Route path="requests" element={<PortalRequests />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
