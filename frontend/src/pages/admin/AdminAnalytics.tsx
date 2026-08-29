import React, { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonGrid, IonRow, IonCol, IonCard, IonCardContent,
  IonIcon, IonSpinner, IonText, IonButton
} from '@ionic/react';
import {
  trendingUpOutline, peopleOutline, walletOutline,
  starOutline, analyticsOutline, arrowUpOutline,
  downloadOutline, refreshOutline
} from 'ionicons/icons';
import api from '../../services/api';
import './AdminAnalytics.css';

interface AnalyticsStats {
  totalRides: number;
  totalRevenue: number;
  activeDrivers: number;
  avgRating: number;
  monthlyGrowth: number;
}

interface DailyStats {
  date: string;
  count: number;
}

const AdminAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [dailyData, setDailyData] = useState<DailyStats[]>([]);
  const [topDrivers, setTopDrivers] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // These endpoints are designed to return synthesized analytics data
      const [statsRes, dailyRes, topRes] = await Promise.all([
        api.get('/admin/analytics/summary'),
        api.get('/admin/analytics/daily'),
        api.get('/admin/analytics/top-drivers')
      ]);

      setStats(statsRes.data);
      setDailyData(dailyRes.data);
      setTopDrivers(topRes.data);
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <IonPage>
        <IonContent className="analytics-loading">
          <div className="loading-center">
            <IonSpinner name="crescent" color="warning" />
            <p>Analyzing Ecosystem Data…</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Simple CSS bar chart calculation
  const maxRides = Math.max(...dailyData.map(d => d.count), 1);

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#1A1A1A'} as any}>
        <IonToolbar style={{'--background': '#1A1A1A', '--color': '#fff'} as any}>
          <IonTitle style={{color: '#fff'}}>Business Intelligence</IonTitle>
          <div slot="end" style={{display: 'flex', gap: 8}}>
            <IonButton fill="clear" onClick={fetchAnalytics}>
              <IonIcon icon={refreshOutline} style={{color: '#FF6B35'}} />
            </IonButton>
            <IonButton fill="clear" onClick={() => window.print()}>
              <IonIcon icon={downloadOutline} style={{color: '#FF6B35'}} />
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="analytics-container" style={{'--background': '#080c14'} as any}>
        <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>

          <div className="analytics-header">
            <div>
              <h2 style={{ color: '#fff', margin: 0 }}>Market Overview</h2>
              <p style={{ color: '#94A3B8', fontSize: 13 }}>Real-time performance tracking for Kampala</p>
            </div>
            <div className="growth-badge">
              <IonIcon icon={trendingUpOutline} />
              <span>+{stats?.monthlyGrowth}% this month</span>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(255,107,53,0.1)', color: '#FF6B35' }}>
                <IonIcon icon={peopleOutline} />
              </div>
              <div className="kpi-data">
                <span className="kpi-value">{stats?.totalRides.toLocaleString()}</span>
                <span className="kpi-label">Total Rides</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676' }}>
                <IonIcon icon={walletOutline} />
              </div>
              <div className="kpi-data">
                <span className="kpi-value">UGX {stats?.totalRevenue.toLocaleString()}</span>
                <span className="kpi-label">Total Revenue</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(66,133,244,0.1)', color: '#4285F4' }}>
                <IonIcon icon={analyticsOutline} />
              </div>
              <div className="kpi-data">
                <span className="kpi-value">{stats?.activeDrivers}</span>
                <span className="kpi-label">Active Drivers</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(255,193,7,0.1)', color: '#FFC107' }}>
                <IonIcon icon={starOutline} />
              </div>
              <div className="kpi-data">
                <span className="kpi-value">{stats?.avgRating}</span>
                <span className="kpi-label">Avg Rating</span>
              </div>
            </div>
          </div>

          {/* Ride Volume Chart */}
          <div className="chart-section">
            <h3 className="section-title">Daily Ride Volume</h3>
            <div className="bar-chart">
              {dailyData.map((d, i) => (
                <div key={i} className="bar-container">
                  <div
                    className="bar"
                    style={{ height: `${(d.count / maxRides) * 100}%` }}
                  >
                    <span className="bar-value">{d.count}</span>
                  </div>
                  <span className="bar-label">{d.date.split('-')[2]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performers */}
          <div className="performers-section">
            <h3 className="section-title">Top Performing Drivers</h3>
            <div className="performers-list">
              {topDrivers.map((driver, i) => (
                <div key={driver.id} className="performer-item">
                  <div className="performer-info">
                    <span className="rank">{i + 1}</span>
                    <div className="performer-details">
                      <span className="performer-name">{driver.fullName}</span>
                      <span className="performer-meta">{driver.vehicleType} • {driver.city || 'Kampala'}</span>
                    </div>
                  </div>
                  <div className="performer-stats">
                    <div className="stat-item">
                      <span className="stat-val">{driver.completedRides}</span>
                      <span className="stat-lbl">Rides</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-val" style={{ color: '#00e676' }}>UGX {driver.earnings.toLocaleString()}</span>
                      <span className="stat-lbl">Earned</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminAnalytics;
