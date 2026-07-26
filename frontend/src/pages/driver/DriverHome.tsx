import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle,
  IonGrid, IonRow, IonCol, IonIcon, IonText, IonButton, IonToggle,
  IonAvatar, IonBadge, IonCard, IonCardContent, IonRefresher, IonRefresherContent
} from '@ionic/react';
import { 
  carOutline, starOutline, leafOutline, timeOutline, walletOutline,
  documentTextOutline, peopleOutline, trendingUpOutline, mapOutline,
  chevronDownCircleOutline, settingsOutline, personOutline,
  checkmarkCircleOutline, cashOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BodaSafeScore from '../../components/BodaSafeBadges';
import LoyaltyCard from '../../components/LoyaltyCard';
import './DriverHome.css';

const DriverHome: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
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

  const handleStatusToggle = (online: boolean) => {
    setIsOnline(online);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IonAvatar style={{ width: 36, height: 36 }} onClick={() => history.push('/driver/profile')}>
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Driver')}&background=FF6B35&color=fff&size=64`} alt="profile" />
              </IonAvatar>
              <div>
                <h2 style={{ color: '#fff', margin: 0, fontSize: 16 }}>Hello, {user?.name?.split(' ')[0] || 'Driver'} 👋</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 2 }}>{isOnline ? '🟢 Online' : '🔴 Offline'}</p>
              </div>
            </div>
            <IonToggle checked={isOnline} onIonChange={e => handleStatusToggle(e.detail.checked)} color="success" />
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <IonRefresher slot="fixed" onIonRefresh={(e) => setTimeout(() => e.target.complete(), 1000)}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          {/* Status Banner */}
          <div style={{ 
            background: isOnline ? 'rgba(45,106,79,0.1)' : 'rgba(255,255,255,0.03)', 
            borderRadius: 12, padding: 12, marginBottom: 14, 
            display: 'flex', alignItems: 'center', gap: 10,
            border: `1px solid ${isOnline ? 'rgba(45,106,79,0.2)' : 'rgba(255,255,255,0.05)'}`
          }}>
            <IonIcon icon={isOnline ? leafOutline : timeOutline} style={{ color: isOnline ? '#2D6A4F' : '#888', fontSize: 20 }} />
            <IonText style={{ color: isOnline ? '#2D6A4F' : '#888', fontSize: 13 }}>
              {isOnline ? 'You are visible to nearby riders' : 'Go online to start receiving ride requests'}
            </IonText>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14 }}>
              <IonIcon icon={walletOutline} style={{ color: '#00e676', fontSize: 20, marginBottom: 6 }} />
              <h3 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700 }}>UGX {stats.todayEarnings.toLocaleString()}</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '2px 0 0' }}>Today's Earnings</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14 }}>
              <IonIcon icon={starOutline} style={{ color: '#FFC107', fontSize: 20, marginBottom: 6 }} />
              <h3 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700 }}>{stats.rating}</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '2px 0 0' }}>Your Rating</p>
            </div>
          </div>

          {/* Boda Safe Score */}
          <BodaSafeScore badges={['helmet', 'sanitized', 'idverified', 'trained']} rating={stats.rating} totalRides={stats.completedRides} />

          {/* Zawadi Loyalty */}
          <LoyaltyCard points={450} tier="gold" />

          {/* Quick Actions */}
          <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Earnings', icon: walletOutline, path: '/driver/earnings', color: '#00e676' },
              { label: 'Vehicle', icon: carOutline, path: '/driver/vehicle', color: '#4da6ff' },
              { label: 'Documents', icon: documentTextOutline, path: '/driver/documents', color: '#b47fff' },
              { label: 'Live Map', icon: mapOutline, path: '/admin/map', color: '#FF6B35' },
            ].map(action => (
              <div key={action.label} onClick={() => history.push(action.path)}
                style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, textAlign: 'center', cursor: 'pointer' }}>
                <IonIcon icon={action.icon} style={{ color: action.color, fontSize: 22, marginBottom: 6 }} />
                <p style={{ color: '#fff', fontSize: 12, margin: 0 }}>{action.label}</p>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Recent Activity</h3>
          {recentActivity.map(activity => (
            <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, marginBottom: 6 }}>
              <IonIcon icon={activity.icon} style={{ color: activity.color, fontSize: 16, flexShrink: 0 }} />
              <span style={{ color: '#fff', fontSize: 12, flex: 1 }}>{activity.text}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>{activity.time}</span>
            </div>
          ))}

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 16, marginBottom: 30 }}>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 10 }}>
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{stats.completedRides}</p>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>Total Rides</span>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 10 }}>
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{stats.acceptanceRate}%</p>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>Acceptance</span>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 10 }}>
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>UGX {Math.round(stats.weeklyEarnings/1000)}K</p>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>This Week</span>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DriverHome;