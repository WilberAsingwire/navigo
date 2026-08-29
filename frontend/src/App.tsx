import React, { ReactNode, useState, useEffect } from 'react';
// Navigo Map Perfection Implementation
import { Route, Redirect } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DriverNotificationProvider } from './context/DriverNotificationContext';
import Home from './pages/auth/Home';
import Onboarding from './components/Onboarding';

/* --- AUTH PAGES --- */
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import AuthCallback from './pages/auth/AuthCallback';
import CompleteSocialRegistration from './pages/auth/CompleteSocialRegistration';
import './pages/admin/AdminGlobal.css';

/* --- RIDER PAGES --- */
import CustomerDashboard from './pages/rider/CustomerDashboard';
import RideRequest from './pages/rider/RideRequest';
import CustomerRideHistory from './pages/rider/CustomerRideHistory';
import CustomerSavedPlaces from './pages/rider/CustomerSavedPlaces';
import CustomerSupport from './pages/rider/CustomerSupport';
import Profile from './pages/rider/Profile';
import ActiveRide from './pages/rider/ActiveRide';
import RiderPayments from './pages/rider/RiderPayments';
import USSDInfo from './pages/rider/USSDInfo';

/* --- DRIVER PAGES --- */
import DriverHome from './pages/driver/DriverHome';
import IncomingRequest from './pages/driver/IncomingRequest';
import DriverEarnings from './pages/driver/DriverEarnings';
import DriverVehicle from './pages/driver/DriverVehicle';
import DriverDocuments from './pages/driver/DriverDocuments';
import DriverActiveRide from './pages/driver/DriverActiveRide';
import DriverProfile from './pages/driver/DriverProfile';

/* --- ADMIN PAGES --- */
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserReview from './pages/admin/AdminUserReview';
import AdminSupport from './pages/admin/AdminSupport';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLiveMap from './pages/admin/AdminLiveMap';
import AdminApprovals from './pages/admin/AdminApprovals';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPayouts from './pages/admin/AdminPayouts';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import Terms from './pages/legal/Terms';
import Privacy from './pages/legal/Privacy';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';

/* Core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import './theme/variables.css';

setupIonicReact();

const ProtectedContent: React.FC<{ allowedRoles: string[]; component: React.ComponentType<any> }> = ({ allowedRoles, component: Component, ...props }) => {
  const { isAuthenticated, user, isLoading, isGuest } = useAuth();
  if (isLoading) return <div className="ion-padding" style={{ color: '#fff', textAlign: 'center', marginTop: '50vh' }}>Loading...</div>;
  if (isGuest || !isAuthenticated || !user) return <Redirect to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Redirect to={'/' + user.role + '/home'} />;
  return <Component {...props} />;
};

const HomeRedirect: React.FC = () => {
  const savedUser = localStorage.getItem('navigo_user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      const role = user.role || 'customer';
      if (role === 'admin') return <Redirect to="/admin/dashboard" />;
      if (role === 'driver') return <Redirect to="/driver/home" />;
      return <Redirect to="/customer/home" />;
    } catch { return <Redirect to="/login" />; }
  }
  return <Redirect to="/login" />;
};

const SkipVerification: React.FC = () => <HomeRedirect />;

const ActiveRidePlaceholder: React.FC = () => (
  <div className="ion-padding" style={{ color: '#fff', textAlign: 'center', marginTop: '30vh' }}>
    <h1>🗺️ Trip in Progress</h1>
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('navigo_onboarding_complete');
    if (isAuthenticated && !hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [isAuthenticated]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('navigo_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  return (
    <IonApp>
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      <IonReactRouter>
        {/* Mounted inside the router so accepting a ride from the global
            incoming-request overlay can actually navigate to the active-ride
            screen (previously this lived above IonReactRouter with no
            history/router access, so accepting silently left the driver
            stuck wherever they were). */}
        <DriverNotificationProvider>
        <IonRouterOutlet>

          {/* Public Routes */}
          <Route path="/login" exact render={() => <ErrorBoundary><Login /></ErrorBoundary>} />
          <Route path="/register" exact render={() => <ErrorBoundary><Register /></ErrorBoundary>} />
          <Route path="/forgot-password" exact render={() => <ErrorBoundary><ForgotPassword /></ErrorBoundary>} />
          <Route path="/verify-phone" exact render={() => <ErrorBoundary><SkipVerification /></ErrorBoundary>} />
          <Route path="/explore" exact render={() => <ErrorBoundary><RideRequest /></ErrorBoundary>} />
          <Route path="/ussd" exact render={() => <ErrorBoundary><USSDInfo /></ErrorBoundary>} />
          <Route path="/auth/callback" exact render={() => <ErrorBoundary><AuthCallback /></ErrorBoundary>} />
          <Route path="/auth/complete-social-reg" exact render={() => <ErrorBoundary><CompleteSocialRegistration /></ErrorBoundary>} />
          <Route path="/terms" exact render={() => <ErrorBoundary><Terms /></ErrorBoundary>} />
          <Route path="/privacy" exact render={() => <ErrorBoundary><Privacy /></ErrorBoundary>} />

          {/* Customer Routes (primary — NAVIGO customers book rides & deliveries) */}
          <Route path="/customer/home" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerDashboard} /></ErrorBoundary>} />
          <Route path="/customer/book" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={RideRequest} /></ErrorBoundary>} />
          <Route path="/customer/active-ride" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={ActiveRide} /></ErrorBoundary>} />
          <Route path="/customer/history" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerRideHistory} /></ErrorBoundary>} />
          <Route path="/customer/places" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerSavedPlaces} /></ErrorBoundary>} />
          <Route path="/customer/payments" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={RiderPayments} /></ErrorBoundary>} />
          <Route path="/customer/support" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerSupport} /></ErrorBoundary>} />
          <Route path="/customer/profile" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={Profile} /></ErrorBoundary>} />

          {/* Driver Routes */}
          <Route path="/driver/home" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver']} component={DriverHome} /></ErrorBoundary>} />
          <Route path="/driver/requests" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver']} component={IncomingRequest} /></ErrorBoundary>} />
          <Route path="/driver/earnings" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver']} component={DriverEarnings} /></ErrorBoundary>} />
          <Route path="/driver/vehicle" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver']} component={DriverVehicle} /></ErrorBoundary>} />
          <Route path="/driver/documents" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver']} component={DriverDocuments} /></ErrorBoundary>} />
          <Route path="/driver/active-ride" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver']} component={DriverActiveRide} /></ErrorBoundary>} />
          <Route path="/driver/profile" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver']} component={DriverProfile} /></ErrorBoundary>} />
          <Route path="/driver/support" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver']} component={CustomerSupport} /></ErrorBoundary>} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminDashboard} /></ErrorBoundary>} />
          <Route path="/admin/home" exact render={() => <ErrorBoundary><Redirect to="/admin/dashboard" /></ErrorBoundary>} />
          <Route path="/admin/approvals" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminApprovals} /></ErrorBoundary>} />
          <Route path="/admin/support" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminSupport} /></ErrorBoundary>} />
          <Route path="/admin/payouts" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminPayouts} /></ErrorBoundary>} />
          <Route path="/admin/users" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminUsers} /></ErrorBoundary>} />
          <Route path="/admin/map" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminLiveMap} /></ErrorBoundary>} />
          <Route path="/admin/analytics" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminAnalytics} /></ErrorBoundary>} />
          <Route path="/admin/approve" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminUserReview} /></ErrorBoundary>} />
          <Route path="/admin/settings" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminSettings} /></ErrorBoundary>} />

          {/* Default */}
          <Route path="/" exact render={() => <ErrorBoundary><Home /></ErrorBoundary>} />

          {/* Catch-all: any unknown URL gets a real 404 instead of a blank page */}
          <Route render={() => <ErrorBoundary><NotFound /></ErrorBoundary>} />

        </IonRouterOutlet>
        </DriverNotificationProvider>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
