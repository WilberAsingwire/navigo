import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  exact?: boolean;
  path: string;
  component: React.ComponentType<any>;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  component: Component, 
  allowedRoles, 
  exact = false,
  path,
  ...rest 
}) => {
  const { isAuthenticated, user, isLoading, isGuest } = useAuth();

  if (isLoading) {
    return (
      <div className="ion-padding" style={{ color: '#fff', textAlign: 'center', marginTop: '50vh' }}>
        <p>Loading NAVIGO...</p>
      </div>
    );
  }

  return (
    <Route
      exact={exact}
      path={path}
      render={(props) => {
        // If guest trying to access protected route, redirect to login
        if (isGuest) {
          return <Redirect to="/login" />;
        }

        // If not authenticated, redirect to login
        if (!isAuthenticated || !user) {
          return <Redirect to="/login" />;
        }

        // If wrong role, redirect to their correct dashboard
        if (!allowedRoles.includes(user.role)) {
          const correctPath = `/${user.role}/home`;
          return <Redirect to={correctPath} />;
        }

        return <Component {...props} />;
      }}
    />
  );
};

export default ProtectedRoute;