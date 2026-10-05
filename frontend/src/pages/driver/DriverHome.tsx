import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar,
  IonIcon, IonText, IonToggle, IonToast,
  IonAvatar, IonRefresher, IonRefresherContent
} from '@ionic/react';
import {
  carOutline, starOutline, leafOutline, timeOutline, walletOutline,
  documentTextOutline, mapOutline,
  chevronDownCircleOutline,
  checkmarkCircleOutline, cashOutline, trendingUpOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import InitialsAvatar from '../../components/InitialsAvatar';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import BodaSafeScore from '../../components/BodaSafeBadges';
import LoyaltyCard from '../../components/LoyaltyCard';
import ThemeToggle from '../../components/ThemeToggle';
import useHaptic from '../../hooks/useHaptic';
import './DriverHome.css';

const DriverHome: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const { light, medium } = useHaptic();
  const [isOnline, setIsOnline] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

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
    const status = user?.verificationStatus || 'unverified';
    if (status === 'unverified' || status === 'rejected') {
      history.push('/driver/documents');
    }
  }, [user, history]);

  const [stats, setStats] = useState({
    earnings: 0,
    rating: 5,
    completedRides: 0,
    acceptanceRate: 100,
    todayEarnings: 0,
    weeklyEarnings: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const res = await api.get('/drivers/stats');
        if (res.data) {
          setStats(res.data.stats);
          setRecentActivity(res.data.activity);
        }
      } catch (e) {
        console.error('Failed to fetch driver stats:', e);
      }
    };
    fetchDriverData();
  }, []);

  const handleStatusToggle = async (online: boolean) => {
    if (user?.verificationStatus !== 'approved') {
      setIsOnline(false);
      setToastMsg('Your account must be approved by an admin before you can go online.');
      setShowToast(true);
      return;
    }
    try {
      medium();
      await api.post('/drivers/status/online', { online });
      setIsOnline(online);
    } catch (error) {
      console.error('Failed to update online status:', error);
      setToastMsg('Could not update status. Please try again.');
      setShowToast(true);
      setIsOnline(!online);
    }
  };

  const navWithHaptic = (path: string) => {
    light();
    history.push(path);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="driver-toolbar" style={{ '--background': 'var(--nav-bg)' } as any}>
          <div className="header-content">
            <div className="user-profile-group">
              <IonAvatar style={{ width: 36, height: 36 }} onClick={() => navWithHaptic('/driver/vehicle')}>
                <InitialsAvatar name={user?.fullName || 'D'} size={36} />
              </IonAvatar>
              <div>
                <h2 className="driver-welcome-text">Hello, {user?.fullName?.split(' ')[0] || 'Driver'}</h2>
                <p className={`driver-status-text ${isOnline ? 'online' : 'offline'}`}>{isOnline ? 'Online' : 'Offline'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ThemeToggle size="small" />
              <IonToggle checked={isOnline} onIonChange={e => handleStatusToggle(e.detail.checked)} color="success" />
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="driver-page-container driver-home-wrapper" style={{'--background': 'var(--nav-bg)'} as any}>
        <IonRefresher slot="fixed" onIonRefresh={(e) => setTimeout(() => e.target.complete(), 1000)}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          <div className={`status-banner ${isOnline ? 'online' : 'offline'}`} onClick={() => handleStatusToggle(!isOnline)}>
            <IonIcon icon={isOnline ? leafOutline : timeOutline} className="status-icon" style={{ color: isOnline ? '#2D6A4F' : '#888' }} />
            <IonText className="status-text" style={{ color: isOnline ? '#2D6A4F' : '#888' }}>
              {isOnline ? 'You are visible to nearby riders' : 'Go online to start receiving ride requests'}
            </IonText>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card" onClick={() => navWithHaptic('/driver/earnings')}>
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

          <BodaSafeScore badges={['helmet', 'sanitized', 'idverified', 'trained']} rating={stats.rating} totalRides={stats.completedRides} />
          <LoyaltyCard points={450} tier="gold" />

          <h3 className="actions-header">Quick Actions</h3>
          <div className="actions-grid">
            {[
              { label: 'Earnings', icon: walletOutline, path: '/driver/earnings', color: '#00e676' },
              { label: 'Vehicle', icon: carOutline, path: '/driver/vehicle', color: '#4da6ff' },
              { label: 'Documents', icon: documentTextOutline, path: '/driver/documents', color: '#b47fff' },
              { label: 'Live Map', icon: mapOutline, path: '/admin/map', color: '#FF6B35' },
            ].map(action => (
              <div key={action.label} onClick={() => navWithHaptic(action.path)} className="action-card">
                <IonIcon icon={action.icon} style={{ color: action.color }} />
                <p>{action.label}</p>
              </div>
            ))}
          </div>

          <h3 className="activity-header">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            recentActivity.map(activity => (
              <div key={activity.id} className="activity-item" onClick={() => light()}>
                <IonIcon icon={activity.icon || checkmarkCircleOutline} className="activity-icon" style={{ color: activity.color }} />
                <span className="activity-text">{activity.text}</span>
                <span className="activity-time">{new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--nav-text-muted)', fontSize: 13 }}>No recent activity yet</div>
          )}

          <div className="bottom-stats-grid">
            <div className="bottom-stat-card"><p className="bottom-stat-value">{stats.completedRides}</p><span className="bottom-stat-label">Total Rides</span></div>
            <div className="bottom-stat-card"><p className="bottom-stat-value">{stats.acceptanceRate}%</p><span className="bottom-stat-label">Acceptance</span></div>
            <div className="bottom-stat-card"><p className="bottom-stat-value">UGX {Math.round(stats.weeklyEarnings/1000)}K</p><span className="bottom-stat-label">This Week</span></div>
          </div>
        </div>
        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} position="top" />
      </IonContent>
    </IonPage>
  );
};

export default DriverHome;
