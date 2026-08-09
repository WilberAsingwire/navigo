import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar,
  IonIcon, IonProgressBar, IonRefresher, IonRefresherContent, IonAvatar, IonToast
} from '@ionic/react';
import {
  carOutline, timeOutline,
  starOutline, walletOutline, locationOutline,
  bicycleOutline, chevronDownCircleOutline, arrowForwardOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoyaltyCard from '../../components/LoyaltyCard';
import './CustomerDashboard.css';

const RiderDashboard: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [nearbyDrivers] = useState([
    { id: '1', name: 'John K.', vehicle: 'Toyota Prius', type: 'car', distance: '0.5' },
    { id: '2', name: 'Sarah M.', vehicle: 'Bajaj Boxer', type: 'bike', distance: '1.2' },
    { id: '3', name: 'Peter O.', vehicle: 'Toyota Hiace', type: 'car', distance: '2.0' },
  ]);
  const userData = { name: user?.name || 'Rider', stats: { totalRides: 5, rating: 4.8 } };

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const handleRefresh = (event: any) => { setTimeout(() => { event.target.complete(); }, 800); };

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#080c14'} as any}>
        <IonToolbar style={{'--background': '#080c14'}}>
          <div className="rider-header">
            <div>
              <h2 className="welcome-text">Hello, {userData.name.split(' ')[0]} 👋</h2>
              <p className="welcome-subtitle">Ready for your next ride?</p>
            </div>
            <IonAvatar
              className="profile-avatar"
              onClick={() => history.push('/rider/profile')}
            >
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Rider')}&background=FF6B35&color=fff&size=64`} alt="profile" />
            </IonAvatar>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="rider-page-container">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>
        {loading && <IonProgressBar type="indeterminate" color="warning" />}

        <div style={{ padding: '0 12px', maxWidth: 500, margin: '0 auto' }}>

          {/* 1. PRIMARY HERO SECTION: Request a Ride & Stats */}
          <div className="ride-cta-card">
            <button
              className="btn-request-ride"
              onClick={() => history.push('/rider/book')}
            >
              <IonIcon icon={carOutline} />
              Request a Ride
            </button>
            <span className="ride-cta-subtitle">Cars & Boda nearby</span>
          </div>

          <div className="stats-grid">
            <div className="stat-pill">
              <IonIcon icon={carOutline} className="stat-icon" />
              <h3 className="stat-value">{userData.stats.totalRides}</h3>
              <p className="stat-label">Total Rides</p>
            </div>
            <div className="stat-pill">
              <IonIcon icon={starOutline} className="stat-icon" />
              <h3 className="stat-value">{userData.stats.rating}</h3>
              <p className="stat-label">Your Rating</p>
            </div>
          </div>

          {/* 2. QUICK ACTIONS */}
          <h3 className="quick-actions-header">Quick Actions</h3>
          <div className="quick-actions-grid">
            {[
              { label: 'History', icon: timeOutline, path: '/rider/history' },
              { label: 'Places', icon: locationOutline, path: '/rider/places' },
              { label: 'Wallet', icon: walletOutline, path: '/rider/payments' },
              { label: 'Book', icon: carOutline, path: '/rider/book' },
            ].map(item => (
              <div
                key={item.label}
                className="action-btn"
                onClick={() => history.push(item.path)}
              >
                <IonIcon icon={item.icon} className="action-icon" />
                <span className="action-label">{item.label}</span>
              </div>
            ))}
          </div>

          {/* 3. ZAWADI REWARDS */}
          <LoyaltyCard points={280} tier="silver" />

          {/* 4. DRIVERS AROUND YOU */}
          <div className="drivers-section-header">
            <h3 className="drivers-title">Drivers Around You</h3>
            <span
              className="view-map-link"
              onClick={() => history.push('/rider/book')}
            >
              View Map <IonIcon icon={arrowForwardOutline} />
            </span>
          </div>

          {nearbyDrivers.map((driver, i) => (
            <div key={i} className="driver-row">
              <div className="driver-info">
                <IonAvatar style={{ width: 38, height: 38 }}>
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=FF6B35&color=fff&size=64`} alt={driver.name} />
                </IonAvatar>
                <div>
                  <p className="driver-name">{driver.name}</p>
                  <p className="driver-vehicle">
                    <IonIcon icon={driver.type === 'car' ? carOutline : bicycleOutline} />
                    {driver.vehicle}
                  </p>
                </div>
              </div>
              <span className="distance-badge">{driver.distance}km</span>
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RiderDashboard;