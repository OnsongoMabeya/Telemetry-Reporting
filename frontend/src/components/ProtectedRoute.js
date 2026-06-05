import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRoles, fallbackPath = '/my-sites' }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const hasRequiredRole = requiredRoles.some(role => user?.role === role);

  if (!hasRequiredRole) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
