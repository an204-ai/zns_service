import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AdminLayout from './layouts/AdminLayout';
import CustomerLayout from './layouts/CustomerLayout';
import LoginPage from './pages/auth/LoginPage';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminCustomers from './pages/admin/Customers';
import AdminCustomerDetail from './pages/admin/CustomerDetail';
import AdminOAConfigs from './pages/admin/OAConfigs';
import AdminOADetail from './pages/admin/OADetail';
import AdminTemplates from './pages/admin/Templates';
import AdminMessages from './pages/admin/Messages';

// Customer pages
import CustomerDashboard from './pages/customer/Dashboard';
import CustomerProfile from './pages/customer/Profile';
import CustomerApiKeys from './pages/customer/ApiKeys';
import CustomerOAInfo from './pages/customer/OAInfo';
import CustomerSendMessage from './pages/customer/SendMessage';
import CustomerCampaigns from './pages/customer/Campaigns';
import CustomerMessageHistory from './pages/customer/MessageHistory';
import CustomerApiDocs from './pages/customer/ApiDocs';

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/customer'} replace />;
  }
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-overlay" style={{ minHeight: '100vh' }}><div className="spinner" /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/customer'} replace /> : <LoginPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="ADMIN"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="customers/:id" element={<AdminCustomerDetail />} />
        <Route path="oa-configs" element={<AdminOAConfigs />} />
        <Route path="oa-configs/:id" element={<AdminOADetail />} />
        <Route path="templates" element={<AdminTemplates />} />
        <Route path="messages" element={<AdminMessages />} />
      </Route>

      {/* Customer routes */}
      <Route path="/customer" element={<ProtectedRoute requiredRole="CUSTOMER"><CustomerLayout /></ProtectedRoute>}>
        <Route index element={<CustomerDashboard />} />
        <Route path="profile" element={<Navigate to="/customer" replace />} />
        <Route path="api-keys" element={<Navigate to="/customer/oa-info" replace />} />
        <Route path="oa-info" element={<CustomerOAInfo />} />
        <Route path="send-message" element={<CustomerSendMessage />} />
        <Route path="campaigns" element={<CustomerCampaigns />} />
        <Route path="messages" element={<CustomerMessageHistory />} />
        <Route path="api-docs" element={<CustomerApiDocs />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
