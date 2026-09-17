import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle,
  IonGrid, IonRow, IonCol, IonIcon, IonText, IonButton, IonToggle,
  IonAvatar, IonBadge, IonCard, IonCardContent, IonRefresher, IonRefresherContent, useIonRouter
} from '@ionic/react';
import {
  carOutline, starOutline, leafOutline, timeOutline, walletOutline,
  documentTextOutline, peopleOutline, trendingUpOutline, mapOutline,
  chevronDownCircleOutline, settingsOutline, personOutline,
  checkmarkCircleOutline, cashOutline
} from 'ionicons/icons';
import InitialsAvatar from '../../components/InitialsAvatar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import socketService from '../../services/socketService';
import BodaSafeScore from '../../components/BodaSafeBadges';
import LoyaltyCard from '../../components/LoyaltyCard';
import './DriverHome.css';

const DriverHome: React.FC = () => {
  const ionRouter = useIonRouter();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/drivers/profile');
        setIsOnline(res.data.user?.isOnline || false);
      } catch (e) {
        console.error('Failed to fetch driver status:', e);
      }
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Ride requests are now handled by the global DriverNotificationProvider
  }, [user?.id, ionRouter]);

  useEffect(() => {
    const status = user?.verificationStatus || 'unverified';
    if (status === 'unverified' || status === 'rejected') {
      ionRouter.push('/driver/documents', 'root', 'replace');
    }
  }, [user, ionRouter]);

  const [stats] = useState({
    earnings: 85000,
    rating: 4.8,
    completedRides: 156,
    acceptanceRate: 94,
    todayEarnings: 45000,
    weeklyEarnings: 320000
  });

  const [recentActivity] = useState([
    { id: '1', text: 'Ride completed with Alice N. — UGX 8,500', time: '10 min ago', icon: checkmarkCircleOutline, color: '#2D6A4F' },
    { id: '2', text: 'New ride request from Kololo', time: '25 min ago', icon: carOutline, color: '#4da6ff' },
    { id: '3', text: 'Payout of UGX 200,000 processed', time: '2 hours ago', icon: cashOutline, color: '#FF6B35' },
    { id: '4', text: 'Your rating increased to 4.8 ⭐', time: '1 day ago', icon: trendingUpOutline, color: '#FFC107' },
  ]);

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
              <IonAvatar style={{ width: 36, height: 36 }} onClick={() => ionRouter.push('/driver/vehicle')}>
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
              <h3 className="kpi-value">UGX {stats.todayEarnings.toLocaleString()}</h3>
              <p className="kpi-label">Today's Earnings</p>
            </div>
            <div className="kpi-card">
              <IonIcon icon={starOutline} className="kpi-icon" style={{ color: '#FFC107' }} />
              <h3 className="kpi-value">{stats.rating}</h3>
              <p className="kpi-label">Your Rating</p>
            </div>
          </div>

          {/* Boda Safe Score */}
          <BodaSafeScore badges={['helmet', 'sanitized', 'idverified', 'trained']} rating={stats.rating} totalRides={stats.completedRides} />

          {/* Zawadi Loyalty */}
          <LoyaltyCard points={450} tier="gold" />

          {/* Quick Actions */}
          <h3 className="actions-header">Quick Actions</h3>
          <div className="actions-grid">
            {[
              { label: 'Earnings', icon: walletOutline, path: '/driver/earnings', color: '#00e676' },
              { label: 'Vehicle', icon: carOutline, path: '/driver/vehicle', color: '#4da6ff' },
              { label: 'Documents', icon: documentTextOutline, path: '/driver/documents', color: '#b47fff' },
              { label: 'Live Map', icon: mapOutline, path: '/admin/map', color: '#FF6B35' },
            ].map(action => (
              <div key={action.label} onClick={() => ionRouter.push(action.path)} className="action-card">
                <IonIcon icon={action.icon} style={{ color: action.color }} />
                <p>{action.label}</p>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <h3 className="activity-header">Recent Activity</h3>
          {recentActivity.map(activity => (
            <div key={activity.id} className="activity-item">
              <IonIcon icon={activity.icon} className="activity-icon" style={{ color: activity.color }} />
              <span className="activity-text">{activity.text}</span>
              <span className="activity-time">{activity.time}</span>
            </div>
          ))}

          {/* Stats Row */}
          <div className="bottom-stats-grid">
            <div className="bottom-stat-card">
              <p className="bottom-stat-value">{stats.completedRides}</p>
              <span className="bottom-stat-label">Total Rides</span>
            </div>
            <div className="bottom-stat-card">
              <p className="bottom-stat-value">{stats.acceptanceRate}%</p>
              <span className="bottom-stat-label">Acceptance</span>
            </div>
            <div className="bottom-stat-card">
              <p className="bottom-stat-value">UGX {Math.round(stats.weeklyEarnings/1000)}K</p>
              <span className="bottom-stat-label">This Week</span>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DriverHome;
