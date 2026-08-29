import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar,
  IonIcon, IonRefresher, IonRefresherContent, IonAvatar
} from '@ionic/react';
import {
  carOutline, timeOutline,
  walletOutline, locationOutline,
  chevronDownCircleOutline, arrowForwardOutline, paperPlaneOutline,
  businessOutline, schoolOutline, restaurantOutline, homeOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import LoyaltyCard from '../../components/LoyaltyCard';
import InitialsAvatar from '../../components/InitialsAvatar';
import Skeleton from '../../components/Skeleton';
import OnboardingBanner from '../../components/OnboardingBanner';
import SafeRender from '../../components/SafeRender';
import './CustomerDashboard.css';

const POPULAR_DESTINATIONS = [
  { id: 'city-square', name: 'Uganda Central Square', area: 'Central', icon: businessOutline, lat: 0.3136, lng: 32.5811 },
  { id: 'entebbe', name: 'Entebbe Airport', area: 'Airport Rd', icon: paperPlaneOutline, lat: 0.0437, lng: 32.4369 },
  { id: 'makerere', name: 'Uganda University', area: 'Kampala', icon: schoolOutline, lat: 0.3361, lng: 32.5711 },
  { id: 'owino', name: 'Owino Market', area: 'Wakiso', icon: restaurantOutline, lat: 0.3446, lng: 32.5806 },
];

const CustomerDashboard: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalRides, setTotalRides] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (user?.id) {
          const res = await api.get(`/rides/history/${user.id}`);
          if (alive && Array.isArray(res.data)) setTotalRides(res.data.length);
        }
      } catch { /* history unavailable — leave null */ }
      try {
        const res = await api.get(`/wallet/balance`);
        if (alive && res.data?.ok) setWalletBalance(res.data.balance);
      } catch { /* wallet unavailable — leave null */ }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const handleRefresh = (event: any) => { setTimeout(() => { event?.target?.complete(); }, 800); };

  // Defensive: never crash if auth state is unexpected
  if (!user) {
    return (
      <IonPage>
        <IonContent className="rider-page-container">
          <div style={{ padding: 24, textAlign: 'center', color: '#fff' }}>
            <h3>Loading profile...</h3>
            <p style={{ color: '#94A3B8' }}>Please wait while we fetch your account.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#080c14'} as any}>
        <IonToolbar style={{'--background': '#080c14'}}>
          <div style={{ maxWidth: 500, margin: '0 auto', width: '100%' }}>
            <div className="rider-header">
              <div>
                <h2 className="welcome-text">Hello, {((user?.fullName || 'there') || 'Guest').split(' ')[0] || 'Guest'} 👋</h2>
                <p className="welcome-subtitle">Ready for your next ride?</p>
              </div>
              <IonAvatar
                className="profile-avatar"
                onClick={() => history.push('/customer/profile')}
              >
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                  <InitialsAvatar name={user?.fullName || 'N'} size={40} />
                </div>
              </IonAvatar>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="rider-page-container">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        <div style={{ padding: '0 12px', maxWidth: 500, margin: '0 auto' }}>

          {/* ONBOARDING: First-time user banner */}
          <OnboardingBanner />

          {/* 1. PRIMARY HERO: Request a Ride */}
          <div className="ride-cta-card">
            <button
              className="btn-request-ride"
              onClick={() => history.push('/customer/book')}
            >
              <IonIcon icon={carOutline} />
              Request a Ride
            </button>
            <span className="ride-cta-subtitle">Cars & Boda nearby</span>
          </div>

          <SafeRender>
          {/* Real stats only — no fake numbers */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Skeleton rows={1} trailingWidth="0px" />
            </div>
          ) : (
            <div className="stats-grid">
              <div className="stat-pill">
                <IonIcon icon={carOutline} className="stat-icon" />
                <h3 className="stat-value">{totalRides ?? 0}</h3>
                <p className="stat-label">Total Rides</p>
              </div>
              <div className="stat-pill">
                <IonIcon icon={walletOutline} className="stat-icon" />
                <h3 className="stat-value" style={{ fontSize: 18 }}>
                  {walletBalance === null ? '—' : `UGX ${(walletBalance / 1000).toFixed(0)}k`}
                </h3>
                <p className="stat-label">Wallet</p>
                {walletBalance === null && (
                  <span style={{ fontSize: 10, color: '#FF6B35', marginTop: 4, textAlign: 'center' }}>
                    Gateway not configured
                  </span>
                )}
              </div>
            </div>
          )}
          </SafeRender>

          {/* 2. QUICK ACTIONS */}
          <h3 className="quick-actions-header">Quick Actions</h3>
          <div className="quick-actions-grid">
            {[
              { label: 'History', icon: timeOutline, path: '/customer/history' },
              { label: 'Places', icon: locationOutline, path: '/customer/places' },
              { label: 'Wallet', icon: walletOutline, path: '/customer/payments' },
              { label: 'Book', icon: carOutline, path: '/customer/book' },
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
          <SafeRender>
            {user && <LoyaltyCard points={280} tier="silver" />}
          </SafeRender>

          {/* 4. POPULAR DESTINATIONS (real Uganda routes → booking) */}
          <div className="drivers-section-header">
            <h3 className="drivers-title">Popular Destinations</h3>
            <span
              className="view-map-link"
              onClick={() => history.push('/customer/book')}
            >
              Book now <IonIcon icon={arrowForwardOutline} />
            </span>
          </div>

          {POPULAR_DESTINATIONS.map(dest => (
            <div
              key={dest.id}
              className="driver-row"
              style={{ cursor: 'pointer' }}
              onClick={() => history.push('/customer/book')}
            >
              <div className="driver-info">
                <IonAvatar style={{ width: 38, height: 38, background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)' }}>
                  <IonIcon icon={dest.icon} style={{ color: '#FF6B35', fontSize: 16 }} />
                </IonAvatar>
                <div>
                  <p className="driver-name">{dest.name}</p>
                  <p className="driver-vehicle">
                    <IonIcon icon={homeOutline} />
                    {dest.area}
                  </p>
                </div>
              </div>
              <IonIcon icon={arrowForwardOutline} style={{ color: '#64748B', fontSize: 16 }} />
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CustomerDashboard;
