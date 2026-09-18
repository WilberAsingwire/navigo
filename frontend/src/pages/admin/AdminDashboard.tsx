import React, { useState, useEffect } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonIcon, IonGrid, IonRow, IonCol, IonBadge, IonButton, IonSpinner } from '@ionic/react';
import { 
  peopleOutline, carOutline, statsChartOutline, walletOutline, 
  bicycleOutline, starOutline, trendingUpOutline, alertCircleOutline,
  checkmarkCircleOutline, timeOutline, mapOutline, settingsOutline,
  refreshOutline, shieldCheckmarkOutline, cashOutline, callOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import api from '../../services/api';

interface AdminStats {
  totalUsers: number;
  totalDrivers: number;
  totalMotorists: number;
  activeRides: number;
  revenue: string;
  rating: string;
  avgRating?: string;
  pendingApprovals: number;
  supportTickets: number;
  disputes: number;
}

const AdminDashboard: React.FC = () => {
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0, totalDrivers: 0, totalMotorists: 0,
    activeRides: 0, revenue: '0', rating: '0',
    pendingApprovals: 0, supportTickets: 0, disputes: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/auth/admin/stats');
        setStats({
          totalUsers: res.data.totalUsers ?? 0,
          totalDrivers: res.data.totalDrivers ?? 0,
          totalMotorists: res.data.totalMotorists ?? 0,
          activeRides: res.data.activeRides ?? 0,
          revenue: `UGX ${parseInt(res.data.revenue || 0).toLocaleString()}`,
          rating: res.data.avgRating ?? res.data.rating ?? '0',
          avgRating: res.data.avgRating ?? res.data.rating ?? '0',
          pendingApprovals: res.data.pendingApprovals ?? 0,
          supportTickets: res.data.supportTickets ?? 0,
          disputes: res.data.disputes ?? 0,
        });
      } catch (e) {
        console.error('Failed to fetch admin stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const kpiCards = [
    { label: 'Total Users', value: (stats.totalUsers ?? 0).toLocaleString(), icon: peopleOutline, color: '#4da6ff', change: '+12%' },
    { label: 'Active Drivers', value: (stats.totalDrivers ?? 0).toLocaleString(), icon: carOutline, color: '#2D6A4F', change: '+8%' },
    { label: 'Motorists', value: (stats.totalMotorists ?? 0).toLocaleString(), icon: bicycleOutline, color: '#ffab40', change: '+15%' },
    { label: 'Active Rides', value: (stats.activeRides ?? 0).toString(), icon: mapOutline, color: '#FF6B35', change: 'Now' },
    { label: 'Revenue Today', value: String(stats.revenue ?? '0'), icon: walletOutline, color: '#10B981', change: '+22%' },
    { label: 'Avg Rating', value: String(stats.avgRating ?? stats.rating ?? '0'), icon: starOutline, color: '#F59E0B', change: '★' },
  ];

  const quickActions = [
    { label: 'Approvals', icon: checkmarkCircleOutline, path: '/admin/approvals', badge: stats.pendingApprovals, color: 'warning' },
    { label: 'Users', icon: peopleOutline, path: '/admin/users', color: 'primary' },
    { label: 'Live Map', icon: mapOutline, path: '/admin/map', color: 'success' },
    { label: 'Support', icon: callOutline, path: '/admin/support', badge: stats.supportTickets, color: 'danger' },
    { label: 'Disputes', icon: alertCircleOutline, path: '/admin/approve', badge: stats.disputes, color: 'warning' },
    { label: 'Settings', icon: settingsOutline, path: '/admin/settings', color: 'medium' },
  ];

  const alerts: any[] = [];

  if (loading) {
    return (
      <IonPage>
        <IonContent style={{'--background': 'var(--nav-bg)'} as any} className="admin-container">
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
      <IonHeader className="ion-no-border" style={{'--background': '#121212'} as any}>
        <IonToolbar style={{'--background': '#121212'}}>
          <IonTitle style={{ color: '#fff', fontSize: 18 }}>Admin Dashboard</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => window.location.reload()}>
            <IonIcon icon={refreshOutline} style={{ color: '#FF6B35' }} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': 'var(--nav-bg)'} as any} className="admin-container">
        <div style={{ padding: 14, maxWidth: 800, margin: '0 auto' }}>
          
          {/* Welcome */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ color: '#fff', margin: 0, fontSize: 24, fontWeight: 700 }}>Welcome, Admin 🛡️</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '4px 0 0' }}>System is running normally</p>
            </div>
            <IonBadge style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981', padding: '6px 14px', borderRadius: 20, fontSize: 12 }}>● Online</IonBadge>
          </div>

          {/* KPI Cards */}
          <IonGrid className="ion-no-padding" style={{ marginBottom: 8 }}>
            <IonRow>
              {kpiCards.map((kpi, i) => (
                <IonCol size="6" sizeMd="4" key={i}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <IonIcon icon={kpi.icon} style={{ fontSize: 22, color: kpi.color }} />
                      <span style={{ fontSize: 10, color: kpi.color, fontWeight: 600 }}>{kpi.change}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '6px 0' }}>{kpi.value}</div>
                    <div style={{ fontSize: 11, color: '#D1D5DB' }}>{kpi.label}</div>
                  </div>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>

          {/* Quick Actions */}
          <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 12, fontWeight: 700 }}>Quick Actions</h3>
          <div className="admin-quick-actions-grid">
            {quickActions.map((action, i) => (
              <div key={i} onClick={() => history.push(action.path)}
                style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, textAlign: 'center', cursor: 'pointer', position: 'relative', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s' }}>
                <IonIcon icon={action.icon} style={{ fontSize: 24, color: '#FF6B35' }} />
                <p style={{ color: '#D1D5DB', fontSize: 11, margin: '6px 0 0' }}>{action.label}</p>
                {action.badge && (
                  <IonBadge style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, padding: '2px 6px', background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                    {action.badge}
                  </IonBadge>
                )}
              </div>
            ))}
          </div>

          {/* Revenue Chart */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ color: '#fff', margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>📈 Revenue Overview</h3>
            <p style={{ color: '#D1D5DB', fontSize: 12, margin: '0 0 16px' }}>Last 7 days</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              No data available for this period
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <span key={d} style={{ fontSize: 9, color: '#D1D5DB' }}>{d}</span>)}
            </div>
          </div>

          {/* Recent Alerts */}
          <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 12, fontWeight: 700 }}>🔔 Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 30 }}>
            {alerts.map((alert, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${alert.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IonIcon icon={alert.icon} style={{ color: alert.color, fontSize: 14 }} />
                </div>
                <span style={{ color: '#D1D5DB', fontSize: 13, flex: 1 }}>{alert.text}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, whiteSpace: 'nowrap' }}>{alert.time}</span>
              </div>
            ))}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;