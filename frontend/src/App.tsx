import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { IonApp, IonRouterOutlet, IonSpinner, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DriverNotificationProvider } from './context/DriverNotificationContext';
import Home from './pages/auth/Home';
import Onboarding from './components/Onboarding';
import ErrorBoundary from './components/ErrorBoundary';
import PremiumExperience from './components/PremiumExperience';
import './pages/admin/AdminGlobal.css';

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
import './theme/interactive.css';
import './theme/polish.css';
import './theme/design-polish.css';
import './theme/light-mode.css';
import './theme/system.css'; /* interaction discipline — must load last */
import './theme/premium-v3.css';

setupIonicReact({ mode: 'md' });

/* --- LAZY LOADED PAGES FOR PERFORMANCE --- */
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const CompleteSocialRegistration = lazy(() => import('./pages/auth/CompleteSocialRegistration'));
const PhoneVerification = lazy(() => import('./pages/auth/PhoneVerification'));

/* Rider — keep dashboard eager for fast first paint, others lazy */
import CustomerDashboard from './pages/rider/CustomerDashboard';
const RideRequest = lazy(() => import('./pages/rider/RideRequest'));
const CustomerRideHistory = lazy(() => import('./pages/rider/CustomerRideHistory'));
const CustomerSavedPlaces = lazy(() => import('./pages/rider/CustomerSavedPlaces'));
const CustomerSupport = lazy(() => import('./pages/rider/CustomerSupport'));
const Profile = lazy(() => import('./pages/rider/Profile'));
const ActiveRide = lazy(() => import('./pages/rider/ActiveRide'));
const RiderPayments = lazy(() => import('./pages/rider/RiderPayments'));
const USSDInfo = lazy(() => import('./pages/rider/USSDInfo'));

/* Driver */
const DriverHome = lazy(() => import('./pages/driver/DriverHome'));
const IncomingRequest = lazy(() => import('./pages/driver/IncomingRequest'));
const DriverEarnings = lazy(() => import('./pages/driver/DriverEarnings'));
const DriverVehicle = lazy(() => import('./pages/driver/DriverVehicle'));
const DriverDocuments = lazy(() => import('./pages/driver/DriverDocuments'));
const DriverActiveRide = lazy(() => import('./pages/driver/DriverActiveRide'));
const DriverLiveMap = lazy(() => import('./pages/driver/DriverLiveMap'));

/* Admin */
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUserReview = lazy(() => import('./pages/admin/AdminUserReview'));
const AdminSupport = lazy(() => import('./pages/admin/AdminSupport'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminLiveMap = lazy(() => import('./pages/admin/AdminLiveMap'));
const AdminApprovals = lazy(() => import('./pages/admin/AdminApprovals'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminPayouts = lazy(() => import('./pages/admin/AdminPayouts'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));

const PageLoader: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--nav-bg)', color: 'var(--nav-text)', gap: 16 }}>
    <div style={{ fontSize: 32 }}>🚀</div>
    <IonSpinner name="crescent" color="warning" />
    <p style={{ color: 'var(--nav-text-secondary)', fontSize: 13 }}>Loading NAVIGO...</p>
  </div>
);

const ProtectedContent: React.FC<{ allowedRoles: string[]; component: React.ElementType }> = ({ allowedRoles, component: Component, ...props }) => {
  const { isAuthenticated, user, isLoading, isGuest } = useAuth();
  if (isLoading) return <PageLoader />;
  if (isGuest || !isAuthenticated || !user) return <Redirect to="/login" />;
  // Normalize role — backend may return 'customer' for rider
  const normalizedRole = user.role === 'customer' ? 'rider' : user.role;
  const allowedNormalized = allowedRoles.map(r => r === 'customer' ? 'rider' : r);
  if (!allowedNormalized.includes(normalizedRole) && !allowedRoles.includes(user.role)) {
    const redirectPath = normalizedRole === 'admin' ? '/admin/dashboard' :
      (normalizedRole === 'driver' || normalizedRole === 'motorist') ? '/driver/home' : '/customer/home';
    return <Redirect to={redirectPath} />;
  }
  return <Component {...props} />;
};

const HomeRedirect: React.FC = () => {
  const savedUser = localStorage.getItem('navigo_user');
  const savedToken = localStorage.getItem('navigo_token');
  if (savedUser && savedToken) {
    try {
      const user = JSON.parse(savedUser);
      const role = user.role || 'rider';
      if (role === 'admin') return <Redirect to="/admin/dashboard" />;
      if (role === 'driver' || role === 'motorist') return <Redirect to="/driver/home" />;
      return <Redirect to="/customer/home" />;
    } catch {
      localStorage.removeItem('navigo_user');
      localStorage.removeItem('navigo_token');
      return <Redirect to="/login" />;
    }
  }
  return <Redirect to="/" />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <DriverNotificationProvider>
            <AppContent />
          </DriverNotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
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
      <PremiumExperience />
      <a href="#main-content" className="skip-link">Skip to content</a>
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      <IonReactRouter>
        <Suspense fallback={<PageLoader />}>
          <IonRouterOutlet id="main-content">

            {/* Public Routes */}
            <Route path="/login" render={() => <ErrorBoundary><Login /></ErrorBoundary>} exact />
            <Route path="/register" render={() => <ErrorBoundary><Register /></ErrorBoundary>} exact />
            <Route path="/forgot-password" render={() => <ErrorBoundary><ForgotPassword /></ErrorBoundary>} exact />
            <Route path="/verify-phone" component={PhoneVerification} exact />
            <Route path="/explore" render={() => <ErrorBoundary><RideRequest /></ErrorBoundary>} exact />
            <Route path="/ussd" render={() => <ErrorBoundary><USSDInfo /></ErrorBoundary>} exact />
            <Route path="/auth/callback" render={() => <ErrorBoundary><AuthCallback /></ErrorBoundary>} exact />
            <Route path="/auth/complete-social-reg" render={() => <ErrorBoundary><CompleteSocialRegistration /></ErrorBoundary>} exact />

            {/* Customer Routes */}
            <Route path="/customer/home" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerDashboard} /></ErrorBoundary>} />
            <Route path="/customer/book" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={RideRequest} /></ErrorBoundary>} />
            <Route path="/customer/active-ride" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={ActiveRide} /></ErrorBoundary>} />
            <Route path="/customer/history" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerRideHistory} /></ErrorBoundary>} />
            <Route path="/customer/places" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerSavedPlaces} /></ErrorBoundary>} />
            <Route path="/customer/payments" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={RiderPayments} /></ErrorBoundary>} />
            <Route path="/customer/support" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={CustomerSupport} /></ErrorBoundary>} />
            <Route path="/customer/profile" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['rider', 'customer']} component={Profile} /></ErrorBoundary>} />

            {/* Driver Routes */}
            <Route path="/driver/home" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver', 'motorist']} component={DriverHome} /></ErrorBoundary>} />
            <Route path="/driver/requests" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver', 'motorist']} component={IncomingRequest} /></ErrorBoundary>} />
            <Route path="/driver/earnings" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver', 'motorist']} component={DriverEarnings} /></ErrorBoundary>} />
            <Route path="/driver/vehicle" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver', 'motorist']} component={DriverVehicle} /></ErrorBoundary>} />
            <Route path="/driver/documents" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver', 'motorist']} component={DriverDocuments} /></ErrorBoundary>} />
            <Route path="/driver/active-ride" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver', 'motorist']} component={DriverActiveRide} /></ErrorBoundary>} />
            <Route path="/driver/live-map" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['driver', 'motorist']} component={DriverLiveMap} /></ErrorBoundary>} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminDashboard} /></ErrorBoundary>} />
            <Route path="/admin/home" exact render={() => <Redirect to="/admin/dashboard" />} />
            <Route path="/admin/approvals" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminApprovals} /></ErrorBoundary>} />
            <Route path="/admin/support" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminSupport} /></ErrorBoundary>} />
            <Route path="/admin/payouts" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminPayouts} /></ErrorBoundary>} />
            <Route path="/admin/users" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminUsers} /></ErrorBoundary>} />
            <Route path="/admin/map" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminLiveMap} /></ErrorBoundary>} />
            <Route path="/admin/analytics" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminAnalytics} /></ErrorBoundary>} />
            <Route path="/admin/approve" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminUserReview} /></ErrorBoundary>} />
            <Route path="/admin/settings" exact render={() => <ErrorBoundary><ProtectedContent allowedRoles={['admin']} component={AdminSettings} /></ErrorBoundary>} />

            {/* Default - MUST use render, not component with arrow fn (fixes redirect loop) */}
            <Route path="/" render={() => <ErrorBoundary><Home /></ErrorBoundary>} exact />

          </IonRouterOutlet>
        </Suspense>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
