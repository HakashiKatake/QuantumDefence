import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Header from './components/layout/Header.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ThreatsPage from './pages/ThreatsPage.jsx';
import MissionsPage from './pages/MissionsPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import AssetsPage from './pages/AssetsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

// Route wrapper for authentication protection
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-main font-mono text-accent-cyan tracking-widest select-none">
        ESTABLISHING SECURE COMMS LINK...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/threats" element={<ThreatsPage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
};

export default App;
