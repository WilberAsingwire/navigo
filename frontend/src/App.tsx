import React from 'react';
// Navigo Map Perfection Implementation
import { Route, Redirect } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Home from './pages/auth/Home';

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
import CustomerPayments from './pages/rider/CustomerPayments';
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

/* --- ADMIN PAGES --- */
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserReview from './pages/admin/AdminUserReview';
import AdminSupport from './pages/admin/AdminSupport';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLiveMap from './pages/admin/AdminLiveMap';
import AdminApprovals from './pages/admin/AdminApprovals';
import AdminSettings from './pages/admin/AdminSettings';

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
      if (role === 'driver' || role === 'motorist') return <Redirect to="/driver/home" />;
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
        <IonApp>
          <IonReactRouter>
            <IonRouterOutlet>

              {/* Public Routes */}
              <Route path="/login" component={Login} exact />
              <Route path="/register" component={Register} exact />
              <Route path="/forgot-password" component={ForgotPassword} exact />
              <Route path="/verify-phone" component={SkipVerification} exact />
              <Route path="/explore" component={RideRequest} exact />
              <Route path="/ussd" component={USSDInfo} exact />
              <Route path="/auth/callback" component={AuthCallback} exact />
              <Route path="/auth/complete-social-reg" component={CompleteSocialRegistration} exact />

              {/* Customer Routes (primary — NAVIGO customers book rides & deliveries) */}
              <Route path="/customer/home" exact render={() => <ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerDashboard} />} />
              <Route path="/customer/book" exact render={() => <ProtectedContent allowedRoles={['rider', 'customer']} component={RideRequest} />} />
              <Route path="/customer/active-ride" exact render={() => <ProtectedContent allowedRoles={['rider', 'customer']} component={ActiveRide} />} />
              <Route path="/customer/history" exact render={() => <ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerRideHistory} />} />
              <Route path="/customer/places" exact render={() => <ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerSavedPlaces} />} />
              <Route path="/customer/payments" exact render={() => <ProtectedContent allowedRoles={['rider', 'customer']} component={RiderPayments} />} />
              <Route path="/customer/support" exact render={() => <ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerSupport} />} />
              <Route path="/customer/profile" exact render={() => <ProtectedContent allowedRoles={['rider', 'customer']} component={Profile} />} />

              {/* /rider/* — legacy paths, redirected for backward compatibility */}
              <Route path="/customer/home" exact render={() => <Redirect to="/customer/home" />} />
              <Route path="/customer/book" exact render={() => <Redirect to="/customer/book" />} />
              <Route path="/customer/active-ride" exact render={() => <Redirect to="/customer/active-ride" />} />
              <Route path="/customer/history" exact render={() => <Redirect to="/customer/history" />} />
              <Route path="/customer/places" exact render={() => <Redirect to="/customer/places" />} />
              <Route path="/customer/payments" exact render={() => <Redirect to="/customer/payments" />} />
              <Route path="/customer/support" exact render={() => <Redirect to="/customer/support" />} />
              <Route path="/customer/profile" exact render={() => <Redirect to="/customer/profile" />} />

              {/* Driver Routes */}
              <Route path="/driver/home" exact render={() => <ProtectedContent allowedRoles={['driver', 'motorist']} component={DriverHome} />} />
              <Route path="/driver/requests" exact render={() => <ProtectedContent allowedRoles={['driver', 'motorist']} component={IncomingRequest} />} />
              <Route path="/driver/earnings" exact render={() => <ProtectedContent allowedRoles={['driver', 'motorist']} component={DriverEarnings} />} />
              <Route path="/driver/vehicle" exact render={() => <ProtectedContent allowedRoles={['driver', 'motorist']} component={DriverVehicle} />} />
              <Route path="/driver/documents" exact render={() => <ProtectedContent allowedRoles={['driver', 'motorist']} component={DriverDocuments} />} />
              <Route path="/driver/active-ride" exact render={() => <ProtectedContent allowedRoles={['driver', 'motorist']} component={DriverActiveRide} />} />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" exact render={() => <ProtectedContent allowedRoles={['admin']} component={AdminDashboard} />} />
              <Route path="/admin/home" exact render={() => <Redirect to="/admin/dashboard" />} />
              <Route path="/admin/approvals" exact render={() => <ProtectedContent allowedRoles={['admin']} component={AdminApprovals} />} />
              <Route path="/admin/support" exact render={() => <ProtectedContent allowedRoles={['admin']} component={AdminSupport} />} />
              <Route path="/admin/users" exact render={() => <ProtectedContent allowedRoles={['admin']} component={AdminUsers} />} />
              <Route path="/admin/map" exact render={() => <ProtectedContent allowedRoles={['admin']} component={AdminLiveMap} />} />
              <Route path="/admin/approve" exact render={() => <ProtectedContent allowedRoles={['admin']} component={AdminUserReview} />} />
              <Route path="/admin/settings" exact render={() => <ProtectedContent allowedRoles={['admin']} component={AdminSettings} />} />

              {/* Default */}
              <Route path="/" component={Home} exact />

            </IonRouterOutlet>
          </IonReactRouter>
        </IonApp>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
