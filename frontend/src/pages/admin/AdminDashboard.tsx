import React, { useState, useEffect } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonCard, IonCardContent, IonIcon, IonGrid, IonRow, IonCol, IonBadge, IonButton, IonSpinner } from '@ionic/react';
import { 
  peopleOutline, carOutline, statsChartOutline, walletOutline, 
  bicycleOutline, starOutline, trendingUpOutline, alertCircleOutline,
  checkmarkCircleOutline, timeOutline, mapOutline, settingsOutline,
  refreshOutline, shieldCheckmarkOutline, cashOutline, callOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 1250, totalDrivers: 480, totalMotorists: 320,
    activeRides: 42, revenue: 'UGX 2.4M', rating: 4.8,
    pendingApprovals: 12, supportTickets: 5, disputes: 3
  });

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  const kpiCards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: peopleOutline, color: '#4da6ff', change: '+12%' },
    { label: 'Active Drivers', value: stats.totalDrivers.toLocaleString(), icon: carOutline, color: '#2D6A4F', change: '+8%' },
    { label: 'Motorists', value: stats.totalMotorists.toLocaleString(), icon: bicycleOutline, color: '#ffab40', change: '+15%' },
    { label: 'Active Rides', value: stats.activeRides.toString(), icon: mapOutline, color: '#FF6B35', change: 'Now' },
    { label: 'Revenue Today', value: stats.revenue, icon: walletOutline, color: '#00e676', change: '+22%' },
    { label: 'Avg Rating', value: stats.rating.toString(), icon: starOutline, color: '#FFC107', change: '★' },
  ];

  const quickActions = [
    { label: 'Approvals', icon: checkmarkCircleOutline, path: '/admin/approvals', badge: stats.pendingApprovals, color: 'warning' },
    { label: 'Users', icon: peopleOutline, path: '/admin/users', color: 'primary' },
    { label: 'Live Map', icon: mapOutline, path: '/admin/map', color: 'success' },
    { label: 'Support', icon: callOutline, path: '/admin/support', badge: stats.supportTickets, color: 'danger' },
    { label: 'Disputes', icon: alertCircleOutline, path: '/admin/approve', badge: stats.disputes, color: 'warning' },
    { label: 'Settings', icon: settingsOutline, path: '/admin/settings', color: 'medium' },
  ];

  const alerts = [
    { icon: alertCircleOutline, text: '3 new driver applications pending', color: '#FFC107', time: '2 min ago' },
    { icon: checkmarkCircleOutline, text: 'Driver John K. approved', color: '#2D6A4F', time: '15 min ago' },
    { icon: starOutline, text: 'Rider dispute #1042 needs review', color: '#ff5252', time: '1 hour ago' },
    { icon: trendingUpOutline, text: 'Revenue up 22% this week', color: '#4da6ff', time: '3 hours ago' },
  ];

  if (loading) {
    return (
      <IonPage>
        <IonContent style={{'--background': '#080c14'} as any}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
            <div style={{ fontSize: 40 }}>🛡️</div>
            <IonSpinner name="crescent" color="warning" />
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading admin panel...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Admin Dashboard</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => window.location.reload()}>
            <IonIcon icon={refreshOutline} style={{ color: '#FF6B35' }} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14', '--color': '#fff8f0'} as any}>
        <div style={{ padding: 14, maxWidth: 800, margin: '0 auto' }}>
          
          {/* Welcome */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ color: '#fff', margin: 0, fontSize: 20 }}>Welcome, Admin 🛡️</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '4px 0 0' }}>System is running normally</p>
            </div>
            <IonBadge color="success" style={{ padding: '6px 12px' }}>● Online</IonBadge>
          </div>

          {/* KPI Cards */}
          <IonGrid className="ion-no-padding" style={{ marginBottom: 8 }}>
            <IonRow>
              {kpiCards.map((kpi, i) => (
                <IonCol size="6" sizeMd="4" key={i}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <IonIcon icon={kpi.icon} style={{ fontSize: 22, color: kpi.color }} />
                      <span style={{ fontSize: 10, color: kpi.color, fontWeight: 600 }}>{kpi.change}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '6px 0' }}>{kpi.value}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{kpi.label}</div>
                  </div>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>

          {/* Quick Actions */}
          <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
            {quickActions.map((action, i) => (
              <div key={i} onClick={() => history.push(action.path)}
                style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, textAlign: 'center', cursor: 'pointer', position: 'relative', border: '1px solid rgba(255,255,255,0.05)' }}>
                <IonIcon icon={action.icon} style={{ fontSize: 24, color: '#FF6B35' }} />
                <p style={{ color: '#fff', fontSize: 11, margin: '6px 0 0' }}>{action.label}</p>
                {action.badge && (
                  <IonBadge color={action.color} style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, padding: '2px 6px' }}>
                    {action.badge}
                  </IonBadge>
                )}
              </div>
            ))}
          </div>

          {/* Revenue Chart Placeholder */}
          <div style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(255,107,53,0.02))', borderRadius: 16, padding: 20, marginBottom: 24, border: '1px solid rgba(255,107,53,0.1)' }}>
            <h3 style={{ color: '#fff', margin: '0 0 4px', fontSize: 15 }}>📈 Revenue Overview</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '0 0 16px' }}>Last 7 days</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
              {[40, 55, 35, 70, 60, 85, 95].map((h, i) => (
                <div key={i} style={{ flex: 1, background: `linear-gradient(180deg, #FF6B35, #E85D75)`, height: `${h}%`, borderRadius: '4px 4px 0 0', opacity: 0.7 + (i * 0.04) }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <span key={d} style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{d}</span>)}
            </div>
          </div>

          {/* Recent Alerts */}
          <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>🔔 Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 30 }}>
            {alerts.map((alert, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12 }}>
                <IonIcon icon={alert.icon} style={{ color: alert.color, fontSize: 18, flexShrink: 0 }} />
                <span style={{ color: '#fff', fontSize: 12, flex: 1 }}>{alert.text}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{alert.time}</span>
              </div>
            ))}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;