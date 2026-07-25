import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

/* --- AUTH PAGES --- */
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

/* --- RIDER PAGES --- */
import CustomerDashboard from './pages/rider/CustomerDashboard';
import RideRequest from './pages/rider/RideRequest';
import CustomerRideHistory from './pages/rider/CustomerRideHistory';
import CustomerSavedPlaces from './pages/rider/CustomerSavedPlaces';
import CustomerSupport from './pages/rider/CustomerSupport';
import CustomerPayments from './pages/rider/CustomerPayments';
import Profile from './pages/rider/Profile';
import ActiveRide from './pages/rider/ActiveRide';          // ✅ NEW
import RiderPayments from './pages/rider/RiderPayments';     // ✅ NEW

/* --- DRIVER PAGES --- */
import DriverHome from './pages/driver/DriverHome';
import IncomingRequest from './pages/driver/IncomingRequest';
import DriverEarnings from './pages/driver/DriverEarnings';
import DriverVehicle from './pages/driver/DriverVehicle';
import DriverDocuments from './pages/driver/DriverDocuments'; // ✅ NEW

/* --- ADMIN PAGES --- */
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserReview from './pages/admin/AdminUserReview';
import AdminSupport from './pages/admin/AdminSupport';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLiveMap from './pages/admin/AdminLiveMap';
import AdminApprovals from './pages/admin/AdminApprovals';   // ✅ NEW

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

// Smart redirect
const HomeRedirect: React.FC = () => {
  const savedUser = localStorage.getItem('navigo_user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      const role = user.role || 'rider';
      return <Redirect to={`/${role}/home`} />;
    } catch {
      return <Redirect to="/login" />;
    }
  }
  return <Redirect to="/login" />;
};

// Skip verification
const SkipVerification: React.FC = () => <HomeRedirect />;

const ActiveRidePlaceholder: React.FC = () => (
  <div className="ion-padding" style={{ color: '#fff', textAlign: 'center', marginTop: '30vh' }}>
    <h1>🗺️ Trip in Progress</h1>
    <p>Active ride tracking coming soon!</p>
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <IonApp>
        <IonReactRouter>
          <IonRouterOutlet>

           {/* --- Public Routes --- */}
<Route exact path="/login" component={Login} />
<Route exact path="/register" component={Register} />
<Route exact path="/forgot-password" component={ForgotPassword} />
<Route exact path="/verify-phone" component={SkipVerification} />
<Route exact path="/explore" component={RideRequest} />

{/* --- Rider Routes --- */}
<ProtectedRoute exact path="/rider/home" component={CustomerDashboard} allowedRoles={['rider', 'customer']} />
<ProtectedRoute exact path="/rider/book" component={RideRequest} allowedRoles={['rider', 'customer']} />
<ProtectedRoute exact path="/rider/active-ride" component={ActiveRide} allowedRoles={['rider', 'customer']} />     {/* ✅ NEW */}
<ProtectedRoute exact path="/rider/history" component={CustomerRideHistory} allowedRoles={['rider', 'customer']} />
<ProtectedRoute exact path="/rider/places" component={CustomerSavedPlaces} allowedRoles={['rider', 'customer']} />
<ProtectedRoute exact path="/rider/payments" component={RiderPayments} allowedRoles={['rider', 'customer']} />     {/* ✅ NEW */}
<ProtectedRoute exact path="/rider/support" component={CustomerSupport} allowedRoles={['rider', 'customer']} />
<ProtectedRoute exact path="/rider/profile" component={Profile} allowedRoles={['rider', 'customer']} />

{/* --- Driver Routes --- */}
<ProtectedRoute exact path="/driver/home" component={DriverHome} allowedRoles={['driver', 'motorist']} />
<ProtectedRoute exact path="/driver/requests" component={IncomingRequest} allowedRoles={['driver', 'motorist']} />
<ProtectedRoute exact path="/driver/earnings" component={DriverEarnings} allowedRoles={['driver', 'motorist']} />
<ProtectedRoute exact path="/driver/vehicle" component={DriverVehicle} allowedRoles={['driver', 'motorist']} />
<ProtectedRoute exact path="/driver/documents" component={DriverDocuments} allowedRoles={['driver', 'motorist']} /> {/* ✅ NEW */}
<ProtectedRoute exact path="/driver/active-ride" component={ActiveRidePlaceholder} allowedRoles={['driver', 'motorist']} />

{/* --- Admin Routes --- */}
<ProtectedRoute exact path="/admin/dashboard" component={AdminDashboard} allowedRoles={['admin']} />
<ProtectedRoute exact path="/admin/approvals" component={AdminApprovals} allowedRoles={['admin']} />              {/* ✅ NEW */}
<ProtectedRoute exact path="/admin/support" component={AdminSupport} allowedRoles={['admin']} />
<ProtectedRoute exact path="/admin/users" component={AdminUsers} allowedRoles={['admin']} />
<ProtectedRoute exact path="/admin/map" component={AdminLiveMap} allowedRoles={['admin']} />

{/* --- Default --- */}
<Route exact path="/" component={HomeRedirect} />

          </IonRouterOutlet>
        </IonReactRouter>
      </IonApp>
    </AuthProvider>
  );
};

export default App;