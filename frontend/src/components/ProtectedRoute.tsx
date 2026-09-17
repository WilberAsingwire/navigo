import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { IonSpinner } from '@ionic/react';
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
}) => {
  const { isAuthenticated, user, isLoading, isGuest } = useAuth();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        height: '100vh', background: 'var(--nav-bg)', color: '#fff', gap: 16 
      }}>
        <div style={{ fontSize: 40 }}>🚀</div>
        <IonSpinner name="crescent" color="warning" />
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Loading NAVIGO...</p>
      </div>
    );
  }

  return (
    <Route
      exact={exact}
      path={path}
      render={(props) => {
        if (isGuest) {
          return <Redirect to="/login" />;
        }

        if (!isAuthenticated || !user) {
          return <Redirect to="/login" />;
        }

        const userRole = user.role || 'customer';

        if (!allowedRoles.includes(userRole)) {
          const redirectPath = userRole === 'admin' ? '/admin/dashboard' :
                              (userRole === 'driver' || userRole === 'motorist') ? '/driver/home' : '/customer/home';
          return <Redirect to={redirectPath} />;
        }

        return <Component {...props} />;
      }}
    />
  );
};

export default ProtectedRoute;