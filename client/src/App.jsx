import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

import Login     from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Monitor   from '@/pages/Monitor';
import Timeline  from '@/pages/Timeline';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/monitor/:id" element={
          <ProtectedRoute><Monitor /></ProtectedRoute>
        } />
        <Route path="/timeline/:id" element={
          <ProtectedRoute><Timeline /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}