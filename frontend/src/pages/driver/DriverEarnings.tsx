import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, 
  IonBackButton, IonGrid, IonRow, IonCol, IonCard, IonCardContent, 
  IonIcon, IonText, IonButton, IonList, IonProgressBar, 
  IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, 
  IonLabel, IonBadge, IonSpinner
} from '@ionic/react';
import { 
  trendingUpOutline, arrowDownOutline, receiptOutline, calendarOutline, 
  chevronDownCircleOutline, walletOutline, cashOutline, cardOutline,
  statsChartOutline, timeOutline, checkmarkCircleOutline
} from 'ionicons/icons';
import './DriverEarnings.css';

const MOCK_EARNINGS = {
  balance: 125000,
  totalEarnings: 1580000,
  thisWeek: 320000,
  todayEarnings: 85000,
  totalTrips: 156,
  avgRating: 4.8,
  recentTrips: [
    { _id: '1', passengerName: 'Alice N.', date: '2026-07-26', fare: 8500, type: 'NAVIGO Go', from: 'Kololo', to: 'Acacia Mall' },
    { _id: '2', passengerName: 'Peter O.', date: '2026-07-26', fare: 3200, type: 'Boda Boda', from: 'Ntinda', to: 'Kampala Rd' },
    { _id: '3', passengerName: 'Sarah K.', date: '2026-07-25', fare: 12000, type: 'Comfort', from: 'Makerere', to: 'Entebbe Rd' },
    { _id: '4', passengerName: 'James M.', date: '2026-07-25', fare: 5500, type: 'NAVIGO Go', from: 'Wandegeya', to: 'Old Taxi Park' },
    { _id: '5', passengerName: 'Grace B.', date: '2026-07-24', fare: 4500, type: 'Boda Boda', from: 'Bugolobi', to: 'Industrial Area' },
  ],
  payouts: [
    { _id: 'p1', amount: 200000, date: '2026-07-20', method: 'MTN Mobile Money', status: 'completed' },
    { _id: 'p2', amount: 150000, date: '2026-07-13', method: 'Airtel Money', status: 'completed' },
  ]
};

const DriverEarnings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [earningsData] = useState(MOCK_EARNINGS);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'payouts'>('overview');

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const weeklyData = [
    { day: 'Mon', amount: 45000 }, { day: 'Tue', amount: 62000 }, { day: 'Wed', amount: 38000 },
    { day: 'Thu', amount: 71000 }, { day: 'Fri', amount: 55000 }, { day: 'Sat', amount: 49000 }, { day: 'Sun', amount: 0 },
  ];

  const maxAmount = Math.max(...weeklyData.map(d => d.amount));

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#080c14'} as any}>
        <IonToolbar style={{'--background': '#080c14', '--color': '#fff'} as any}>
          <IonButtons slot="start"><IonBackButton defaultHref="/driver/home" style={{color: '#fff'}} /></IonButtons>
          <IonTitle style={{color: '#fff'}}>Earnings</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="driver-earnings-container">
        <IonRefresher slot="fixed" onIonRefresh={(e) => { setTimeout(() => e.target.complete(), 1000); }}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        {loading && <IonProgressBar type="indeterminate" color="warning" />}

        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          {/* Balance Card */}
          <div className="earnings-balance-card">
            <IonIcon icon={walletOutline} className="balance-icon" />
            <p className="balance-label">Available Balance</p>
            <h1 className="balance-amount">UGX {earningsData.balance.toLocaleString()}</h1>
            <div className="payout-actions">
              <IonButton expand="block" disabled={earningsData.balance < 50000} className="payout-btn">
                <IonIcon icon={arrowDownOutline} slot="start" /> Request Payout
              </IonButton>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '8px 0 0' }}>Minimum payout: UGX 50,000</p>
          </div>

          {/* Quick Stats */}
          <div className="earnings-stats-grid">
            {[
              { label: 'Today', value: `UGX ${(earningsData.todayEarnings/1000).toFixed(0)}K`, icon: timeOutline, color: '#FF6B35' },
              { label: 'This Week', value: `UGX ${(earningsData.thisWeek/1000).toFixed(0)}K`, icon: trendingUpOutline, color: '#4da6ff' },
              { label: 'Total', value: `UGX ${(earningsData.totalEarnings/1000000).toFixed(1)}M`, icon: statsChartOutline, color: '#2D6A4F' },
            ].map(s => (
              <div key={s.label} className="earnings-stat-card">
                <IonIcon icon={s.icon} className="stat-icon" style={{ color: s.color }} />
                <p className="stat-value">{s.value}</p>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Weekly Chart */}
          <div className="earnings-chart-card">
            <h4 className="chart-title">📊 This Week</h4>
            <div className="chart-container">
              {weeklyData.map((d, i) => (
                <div key={i} className="chart-bar-wrapper">
                  <div className="chart-bar" style={{ height: `${(d.amount / maxAmount) * 100}%`, opacity: d.day === 'Sun' ? 0.3 : 0.8 }} />
                  <span className="chart-day-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <IonSegment value={activeTab} onIonChange={e => setActiveTab(e.detail.value as any)} style={{ marginBottom: 14 }}>
            <IonSegmentButton value="overview"><IonLabel style={{ fontSize: 11, color: '#fff' }}>Overview</IonLabel></IonSegmentButton>
            <IonSegmentButton value="history"><IonLabel style={{ fontSize: 11, color: '#fff' }}>History</IonLabel></IonSegmentButton>
            <IonSegmentButton value="payouts"><IonLabel style={{ fontSize: 11, color: '#fff' }}>Payouts</IonLabel></IonSegmentButton>
          </IonSegment>

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="history-section">
              <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Recent Trips ({earningsData.totalTrips} total)</h3>
              {earningsData.recentTrips.map(trip => (
                <div key={trip._id} className="earnings-history-card">
                  <div className="history-header">
                    <div className="history-rider-info">
                      <IonIcon icon={receiptOutline} style={{ color: '#FF6B35' }} />
                      <div>
                        <span className="history-rider-name">{trip.passengerName}</span>
                        <p className="history-ride-meta">{trip.type} • {trip.from} → {trip.to}</p>
                      </div>
                    </div>
                    <span className="history-amount">+UGX {trip.fare.toLocaleString()}</span>
                  </div>
                  <div className="history-footer">
                    <span>{new Date(trip.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span className="history-net-earning">You earned: UGX {(trip.fare * 0.85).toLocaleString()} (85%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <div className="payouts-section">
              <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Payout History</h3>
              {earningsData.payouts.map(payout => (
                <div key={payout._id} className="earnings-payout-card">
                  <div className="payout-icon">
                    <IonIcon icon={checkmarkCircleOutline} />
                  </div>
                  <div className="payout-info">
                    <h4>UGX {payout.amount.toLocaleString()}</h4>
                    <p>{payout.method} • {new Date(payout.date).toLocaleDateString()}</p>
                  </div>
                  <IonBadge color="success" style={{ fontSize: 9 }}>Completed</IonBadge>
                </div>
              ))}
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total Trips', value: earningsData.totalTrips, icon: receiptOutline },
                { label: 'Avg Rating', value: earningsData.avgRating, icon: trendingUpOutline },
                { label: 'You Keep', value: '85%', icon: cashOutline },
                { label: 'Payout Method', value: 'MTN Money', icon: cardOutline },
              ].map(s => (
                <div key={s.label} className="earnings-overview-card">
                  <IonIcon icon={s.icon} className="overview-icon" />
                  <p className="overview-value">{s.value}</p>
                  <span className="overview-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DriverEarnings;