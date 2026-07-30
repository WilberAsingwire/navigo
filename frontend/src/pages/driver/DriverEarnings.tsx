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
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/driver/home" /></IonButtons>
          <IonTitle>Earnings</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { setTimeout(() => e.target.complete(), 1000); }}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        {loading && <IonProgressBar type="indeterminate" color="warning" />}

        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          {/* Balance Card */}
          <IonCard style={{ background: 'linear-gradient(135deg, #1B4965, #0d2137)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
            <IonCardContent style={{ textAlign: 'center', padding: 24 }}>
              <IonIcon icon={walletOutline} style={{ fontSize: 32, color: '#FF6B35', marginBottom: 8 }} />
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>Available Balance</p>
              <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 800, margin: '8px 0' }}>
                UGX {earningsData.balance.toLocaleString()}
              </h1>
              <IonButton expand="block" disabled={earningsData.balance < 50000}
                style={{ '--background': '#FF6B35', '--border-radius': 14, fontWeight: 700, height: 44, marginTop: 8 } as any}>
                <IonIcon icon={arrowDownOutline} slot="start" /> Request Payout
              </IonButton>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '8px 0 0' }}>Minimum payout: UGX 50,000</p>
            </IonCardContent>
          </IonCard>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Today', value: `UGX ${(earningsData.todayEarnings/1000).toFixed(0)}K`, icon: timeOutline, color: '#FF6B35' },
              { label: 'This Week', value: `UGX ${(earningsData.thisWeek/1000).toFixed(0)}K`, icon: trendingUpOutline, color: '#4da6ff' },
              { label: 'Total', value: `UGX ${(earningsData.totalEarnings/1000000).toFixed(1)}M`, icon: statsChartOutline, color: '#2D6A4F' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, textAlign: 'center' }}>
                <IonIcon icon={s.icon} style={{ color: s.color, fontSize: 18, marginBottom: 4 }} />
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 2 }}>{s.value}</p>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Weekly Chart */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <h4 style={{ color: '#fff', margin: '0 0 12px', fontSize: 14 }}>📊 This Week</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
              {weeklyData.map((d, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: `${(d.amount / maxAmount) * 100}%`, background: 'linear-gradient(180deg, #FF6B35, #E85D75)', borderRadius: '4px 4px 0 0', minHeight: 4, opacity: d.day === 'Sun' ? 0.3 : 0.8 }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 4, display: 'block' }}>{d.day}</span>
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
            <div>
              <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Recent Trips ({earningsData.totalTrips} total)</h3>
              {earningsData.recentTrips.map(trip => (
                <div key={trip._id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IonIcon icon={receiptOutline} style={{ color: '#FF6B35' }} />
                      <div>
                        <span style={{ color: '#fff', fontSize: 13 }}>{trip.passengerName}</span>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 1 }}>{trip.type} • {trip.from} → {trip.to}</p>
                      </div>
                    </div>
                    <span style={{ color: '#00e676', fontWeight: 700, fontSize: 14 }}>+UGX {trip.fare.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{new Date(trip.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>You earned: UGX {(trip.fare * 0.85).toLocaleString()} (85%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <div>
              <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Payout History</h3>
              {earningsData.payouts.map(payout => (
                <div key={payout._id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(45,106,79,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={checkmarkCircleOutline} style={{ color: '#2D6A4F', fontSize: 18 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#fff', fontSize: 13 }}>UGX {payout.amount.toLocaleString()}</span>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2 }}>{payout.method} • {new Date(payout.date).toLocaleDateString()}</p>
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
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <IonIcon icon={s.icon} style={{ color: '#FF6B35', fontSize: 20, marginBottom: 6 }} />
                  <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 2 }}>{s.value}</p>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{s.label}</span>
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