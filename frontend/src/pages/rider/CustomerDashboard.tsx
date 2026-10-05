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
import useHaptic from '../../hooks/useHaptic';
import ThemeToggle from '../../components/ThemeToggle';
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
  const { light, medium, selection } = useHaptic();
  const [loading, setLoading] = useState(true);
  const [totalRides, setTotalRides] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletError, setWalletError] = useState(false);
  const [completedRides, setCompletedRides] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (user?.id) {
          const res = await api.get(`/rides/history/${user.id}`);
          if (alive && Array.isArray(res.data)) {
            const all = res.data;
            setTotalRides(all.length);
            const completed = all.filter((r: any) => r.status === 'completed').length;
            setCompletedRides(completed);
            localStorage.setItem('navigo_ride_count', String(all.length));
            localStorage.setItem('navigo_completed_rides', String(completed));
          }
        }
      } catch { /* noop */ }
      try {
        const res = await api.get(`/wallet/balance`);
        if (alive && res.data?.ok) {
          setWalletBalance(res.data.balance);
          setWalletError(false);
        } else if (alive) {
          setWalletBalance(0);
          setWalletError(false);
        }
      } catch {
        if (alive) {
          setWalletBalance(0);
          setWalletError(true);
        }
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const loyaltyTier = (() => {
    const pts = completedRides * 15 + totalRides * 5;
    if (pts >= 2500) return { points: pts, tier: 'platinum' as const };
    if (pts >= 1000) return { points: pts, tier: 'gold' as const };
    if (pts >= 500) return { points: pts, tier: 'silver' as const };
    return { points: Math.max(pts, 0), tier: 'bronze' as const };
  })();

  const handleRefresh = (event: any) => {
    medium();
    setTimeout(() => {
      event?.target?.complete();
      window.location.reload();
    }, 800);
  };

  const navWithHaptic = (path: string, type: 'light' | 'medium' = 'light') => {
    if (type === 'light') light(); else medium();
    history.push(path);
  };

  if (!user) {
    return (
      <IonPage>
        <IonContent className="rider-page-container rider-dashboard-wrapper" style={{'--background': 'var(--nav-bg)'} as any}>
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--nav-text)' }}>
            <h3>Loading profile...</h3>
            <p style={{ color: 'var(--nav-text-secondary)' }}>Please wait while we fetch your account.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': 'var(--nav-bg)'} as any}>
        <IonToolbar style={{'--background': 'var(--nav-bg)'}}>
          <div style={{ maxWidth: 500, margin: '0 auto', width: '100%' }}>
            <div className="rider-header">
              <div>
                <h2 className="welcome-text">Hello, {(user?.fullName || 'there').split(' ')[0] || 'Guest'}</h2>
                <p className="welcome-subtitle">Ready for your next ride?</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ThemeToggle size="small" />
                <IonAvatar
                  className="profile-avatar"
                  onClick={() => navWithHaptic('/customer/profile', 'medium')}
                >
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                    <InitialsAvatar name={user?.fullName || 'N'} size={40} />
                  </div>
                </IonAvatar>
              </div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="rider-page-container rider-dashboard-wrapper" style={{'--background': 'var(--nav-bg)'} as any}>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} pullingText="Pull to refresh" refreshingSpinner="crescent" />
        </IonRefresher>

        <div style={{ padding: '0 12px', maxWidth: 500, margin: '0 auto' }}>
          <OnboardingBanner />

          <div className="ride-cta-card" onClick={() => navWithHaptic('/customer/book', 'medium')}>
            <button
              className="btn-request-ride"
              onClick={(e) => { e.stopPropagation(); navWithHaptic('/customer/book', 'medium'); }}
            >
              <IonIcon icon={carOutline} />
              Request a Ride
            </button>
            <span className="ride-cta-subtitle">Cars & Boda nearby • Tap to book</span>
          </div>

          <SafeRender>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Skeleton rows={2} trailingWidth="0px" />
            </div>
          ) : (
            <div className="stats-grid">
              <div className="stat-pill" onClick={() => { selection(); navWithHaptic('/customer/history'); }}>
                <IonIcon icon={carOutline} className="stat-icon" />
                <h3 className="stat-value">{totalRides}</h3>
                <p className="stat-label">Total Rides</p>
              </div>
              <div className="stat-pill" onClick={() => { selection(); navWithHaptic('/customer/payments'); }}>
                <IonIcon icon={walletOutline} className="stat-icon" />
                <h3 className="stat-value" style={{ fontSize: walletBalance !== null && walletBalance >= 1000 ? 16 : 18 }}>
                  {walletBalance === null ? 'UGX 0' : walletBalance >= 1000 ? `UGX ${(walletBalance / 1000).toFixed(1)}k` : `UGX ${walletBalance.toLocaleString()}`}
                </h3>
                <p className="stat-label">Wallet</p>
                {walletError && (
                  <span style={{ fontSize: 10, color: 'var(--nav-text-secondary)', marginTop: 4, textAlign: 'center' }}>
                    Offline — cached
                  </span>
                )}
              </div>
            </div>
          )}
          </SafeRender>

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
                onClick={() => navWithHaptic(item.path)}
              >
                <IonIcon icon={item.icon} className="action-icon" />
                <span className="action-label">{item.label}</span>
              </div>
            ))}
          </div>

          <SafeRender>
            {user && <LoyaltyCard points={loyaltyTier.points} tier={loyaltyTier.tier} />}
          </SafeRender>

          <div className="drivers-section-header">
            <h3 className="drivers-title">Popular Destinations</h3>
            <span
              className="view-map-link"
              onClick={() => navWithHaptic('/customer/book')}
            >
              Book now <IonIcon icon={arrowForwardOutline} />
            </span>
          </div>

          {POPULAR_DESTINATIONS.map(dest => (
            <div
              key={dest.id}
              className="driver-row"
              style={{ cursor: 'pointer' }}
              onClick={() => navWithHaptic('/customer/book')}
            >
              <div className="driver-info">
                <IonAvatar style={{ width: 38, height: 38, background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)' }}>
                  <IonIcon icon={dest.icon} style={{ color: 'var(--navigo-orange)', fontSize: 16 }} />
                </IonAvatar>
                <div>
                  <p className="driver-name">{dest.name}</p>
                  <p className="driver-vehicle">
                    <IonIcon icon={homeOutline} />
                    {dest.area}
                  </p>
                </div>
              </div>
              <IonIcon icon={arrowForwardOutline} style={{ color: 'var(--nav-text-muted)', fontSize: 16 }} />
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CustomerDashboard;
