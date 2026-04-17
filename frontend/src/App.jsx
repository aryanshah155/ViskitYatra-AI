import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import RoutePanel from './components/RoutePanel';
import MainLayout from './components/MainLayout';
import AdminPanel from './pages/admin/AdminPanel';
import Policies from './pages/admin/Policies';
import AuthModal from './components/AuthModal';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

const PublicRoute = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return null;
  return !token ? children : <Navigate to="/dashboard" />;
};

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      
      {/* Public Auth Routes */}
      <Route path="/login" element={<PublicRoute><AuthModal initialMode={true} isPage={true} /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><AuthModal initialMode={false} isPage={true} /></PublicRoute>} />
      
      {/* Protected Commuter Routes */}
      <Route element={<ProtectedRoute role="user" />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/route" element={<RoutePanel />} />
          <Route path="/results" element={<Results />} />
        </Route>
      </Route>

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/policies" element={<Policies />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  React.useEffect(() => {
    console.log("Mission Alpha: Application initialized and mounted successfully.");
  }, []);

  return (
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
