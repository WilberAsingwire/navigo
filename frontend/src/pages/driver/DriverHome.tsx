import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle,
  IonGrid, IonRow, IonCol, IonIcon, IonText, IonButton, IonToggle,
  IonAvatar, IonBadge, IonCard, IonCardContent, IonRefresher, IonRefresherContent, useIonRouter
} from '@ionic/react';
import {
  carOutline, starOutline, leafOutline, timeOutline, walletOutline,
  documentTextOutline, trendingUpOutline,
  chevronDownCircleOutline, helpCircleOutline,
  checkmarkCircleOutline, cashOutline
} from 'ionicons/icons';
import InitialsAvatar from '../../components/InitialsAvatar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import socketService from '../../services/socketService';
import DriverTrustCard from '../../components/BodaSafeBadges';
import LoyaltyCard from '../../components/LoyaltyCard';
import './DriverHome.css';

interface WalletTx {
  id: string;
  kind: string;
  amount: number;
  createdAt: string;
}

const DriverHome: React.FC = () => {
  const ionRouter = useIonRouter();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [profileStats, setProfileStats] = useState({ rating: 5, totalTrips: 0 });
  const [transactions, setTransactions] = useState<WalletTx[]>([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/drivers/profile');
        setIsOnline(res.data.user?.isOnline || false);
        if (res.data.profile) {
          setProfileStats({
            rating: Number(res.data.profile.rating) || 5,
            totalTrips: Number(res.data.profile.totalTrips) || 0,
          });
        }
      } catch (e) {
        console.error('Failed to fetch driver status:', e);
      }
    };
    fetchStatus();

    const fetchEarnings = async () => {
      try {
        const res = await api.get('/wallet/transactions');
        setTransactions(res.data?.transactions || []);
      } catch (e) {
        console.error('Failed to fetch earnings:', e);
      }
    };
    fetchEarnings();
  }, []);

  // Driver income = wallet payouts + cash-trip earnings + tips (see DriverEarnings.tsx)
  const earnings = transactions.filter(t => t.kind === 'payout' || t.kind === 'cash_trip' || t.kind === 'tip');
  const sumSince = (days: number) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return earnings.filter(t => new Date(t.createdAt).getTime() >= cutoff).reduce((s, t) => s + t.amount, 0);
  };
  const todayEarnings = sumSince(1);
  const weeklyEarnings = sumSince(7);

  useEffect(() => {
    if (!user?.id) return;

    // Ride requests are now handled by the global DriverNotificationProvider
  }, [user?.id, ionRouter]);

  useEffect(() => {
    const status = user?.verificationStatus || 'unverified';
    if (status === 'unverified' || status === 'rejected') {
      // 'replace' swaps the current history entry instead of pushing a new one,
      // so the back button can't return an unverified driver to this screen.
      ionRouter.push('/driver/documents', 'root', 'replace');
    }
  }, [user, ionRouter]);

  // Real recent activity, built from the driver's own wallet transactions.
  const recentActivity = transactions.slice(0, 4).map(t => {
    const isPositive = t.amount >= 0;
    const label =
      t.kind === 'payout' ? 'Ride earnings credited' :
      t.kind === 'cash_trip' ? 'Cash ride completed' :
      t.kind === 'tip' ? 'Tip received' :
      t.kind === 'withdrawal' ? 'Payout sent to Mobile Money' :
      t.kind === 'refund' ? 'Payout refunded' : 'Wallet activity';
    return {
      id: t.id,
      text: `${label} — UGX ${Math.abs(t.amount).toLocaleString()}`,
      time: new Date(t.createdAt).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' }),
      icon: t.kind === 'withdrawal' ? cashOutline : checkmarkCircleOutline,
      color: isPositive ? '#2D6A4F' : '#FF6B35',
    };
  });

  const handleStatusToggle = async (online: boolean) => {
    if (user?.verificationStatus !== 'approved') {
      setIsOnline(false);
      alert('Your account must be approved by an admin before you can go online.');
      return;
    }

    try {
      await api.post('/drivers/status/online', { online });
      setIsOnline(online);
    } catch (error) {
      console.error('Failed to update online status:', error);
      alert('Could not update status. Please try again.');
      setIsOnline(!online); // Revert toggle
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="driver-toolbar">
          <div className="header-content">
            <div className="user-profile-group">
              <IonAvatar style={{ width: 36, height: 36, cursor: 'pointer' }} onClick={() => ionRouter.push('/driver/profile')}>
                <InitialsAvatar name={user?.fullName || 'D'} size={36} />
              </IonAvatar>
              <div>
                <h2 className="driver-welcome-text">Hello, {user?.fullName?.split(' ')[0] || 'Driver'} 👋</h2>
                <p className={`driver-status-text ${isOnline ? 'online' : 'offline'}`}>{isOnline ? '🟢 Online' : '🔴 Offline'}</p>
              </div>
            </div>
            <IonToggle checked={isOnline} onIonChange={e => handleStatusToggle(e.detail.checked)} color="success" />
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="driver-page-container">
        <IonRefresher slot="fixed" onIonRefresh={(e) => setTimeout(() => e.target.complete(), 1000)}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          {/* Status Banner */}
          <div className={`status-banner ${isOnline ? 'online' : 'offline'}`}>
            <IonIcon icon={isOnline ? leafOutline : timeOutline} className="status-icon" style={{ color: isOnline ? '#2D6A4F' : '#888' }} />
            <IonText className="status-text" style={{ color: isOnline ? '#2D6A4F' : '#888' }}>
              {isOnline ? 'You are visible to nearby riders' : 'Go online to start receiving ride requests'}
            </IonText>
          </div>

          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <IonIcon icon={walletOutline} className="kpi-icon" style={{ color: '#00e676' }} />
              <h3 className="kpi-value">UGX {todayEarnings.toLocaleString()}</h3>
              <p className="kpi-label">Today's Earnings</p>
            </div>
            <div className="kpi-card">
              <IonIcon icon={starOutline} className="kpi-icon" style={{ color: '#FFC107' }} />
              <h3 className="kpi-value">{profileStats.rating.toFixed(1)}</h3>
              <p className="kpi-label">Your Rating</p>
            </div>
          </div>

          {/* Driver Trust Status — real, verifiable data only (see BodaSafeBadges.tsx) */}
          <DriverTrustCard isVerified={user?.verificationStatus === 'approved'} rating={profileStats.rating} totalRides={profileStats.totalTrips} />

          {/* Zawadi Loyalty */}
          <LoyaltyCard ridesCount={profileStats.totalTrips} />

          {/* Quick Actions */}
          <h3 className="actions-header">Quick Actions</h3>
          <div className="actions-grid">
            {[
              { label: 'Earnings', icon: walletOutline, path: '/driver/earnings', color: '#00e676' },
              { label: 'Vehicle', icon: carOutline, path: '/driver/vehicle', color: '#4da6ff' },
              { label: 'Documents', icon: documentTextOutline, path: '/driver/documents', color: '#b47fff' },
              // 'Live Map' used to link to /admin/map, an admin-only route —
              // any driver tapping it was immediately bounced back to
              // /driver/home by ProtectedContent's role check. Support is a
              // page drivers can actually use.
              { label: 'Support', icon: helpCircleOutline, path: '/driver/support', color: '#FF6B35' },
            ].map(action => (
              <div key={action.label} onClick={() => ionRouter.push(action.path)} className="action-card">
                <IonIcon icon={action.icon} style={{ color: action.color }} />
                <p>{action.label}</p>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <h3 className="activity-header">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>
              No activity yet — complete your first ride to see it here.
            </p>
          ) : (
            recentActivity.map(activity => (
              <div key={activity.id} className="activity-item">
                <IonIcon icon={activity.icon} className="activity-icon" style={{ color: activity.color }} />
                <span className="activity-text">{activity.text}</span>
                <span className="activity-time">{activity.time}</span>
              </div>
            ))
          )}

          {/* Stats Row */}
          <div className="bottom-stats-grid">
            <div className="bottom-stat-card">
              <p className="bottom-stat-value">{profileStats.totalTrips}</p>
              <span className="bottom-stat-label">Total Rides</span>
            </div>
            <div className="bottom-stat-card">
              <p className="bottom-stat-value">{profileStats.rating.toFixed(1)} ⭐</p>
              <span className="bottom-stat-label">Rating</span>
            </div>
            <div className="bottom-stat-card">
              <p className="bottom-stat-value">UGX {Math.round(weeklyEarnings/1000)}K</p>
              <span className="bottom-stat-label">This Week</span>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DriverHome;
