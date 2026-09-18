import React, { useState, useEffect, useMemo } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonIcon, IonText, IonButton, IonProgressBar,
  IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
  IonLabel, IonBadge, IonSpinner
} from '@ionic/react';
import {
  trendingUpOutline, arrowDownOutline, receiptOutline,
  chevronDownCircleOutline, walletOutline, cashOutline,
  statsChartOutline, timeOutline, checkmarkCircleOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import './DriverEarnings.css';

interface WalletTx {
  id: string;
  kind: 'topup' | 'ride_payment' | 'payout' | 'tip';
  amount: number;
  note: string;
  rideId?: string;
  createdAt: string;
}

/**
 * Real driver earnings — balance, trip income and trip count all come
 * from the backend (wallet transactions + driver profile).
 */
const DriverEarnings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'payouts'>('overview');

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, txRes, profRes] = await Promise.all([
        api.get('/wallet/balance').catch(() => null),
        api.get('/wallet/transactions').catch(() => null),
        api.get('/drivers/profile').catch(() => null),
      ]);
      if (balRes?.data?.ok) setBalance(balRes.data.balance);
      setTransactions(txRes?.data?.transactions || []);
      setProfile(profRes?.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Driver income = payout + tip transactions from ride settlement
  const earnings = useMemo(() => transactions.filter(t => t.kind === 'payout' || t.kind === 'tip'), [transactions]);

  const sumSince = (days: number) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return earnings.filter(t => new Date(t.createdAt).getTime() >= cutoff).reduce((s, t) => s + t.amount, 0);
  };

  const todayEarnings = sumSince(1);
  const thisWeek = sumSince(7);
  const totalEarnings = earnings.reduce((s, t) => s + t.amount, 0);

  const weeklyData = useMemo(() => {
    const days: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const amount = earnings
        .filter(t => {
          const ts = new Date(t.createdAt).getTime();
          return ts >= dayStart && ts < dayEnd;
        })
        .reduce((s, t) => s + t.amount, 0);
      days.push({ day: d.toLocaleDateString('en', { weekday: 'narrow' }), amount });
    }
    return days;
  }, [earnings]);

  const maxAmount = Math.max(...weeklyData.map(d => d.amount), 1);
  const totalTrips = profile?.profile?.totalTrips ?? 0;
  const rating = profile?.profile?.rating ?? 5;

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border" style={{ '--background': '#080c14' } as any}>
          <IonToolbar style={{ '--background': '#080c14', '--color': '#fff' }}>
            <IonButtons slot="start"><IonBackButton defaultHref="/driver/home" style={{ color: '#fff' }} /></IonButtons>
            <IonTitle style={{ color: '#fff' }}>Earnings</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="driver-earnings-container driver-earnings-wrapper" style={{ '--background': 'var(--nav-bg)' } as any}>
          <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}><Skeleton rows={4} /></div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{ '--background': '#080c14' } as any}>
        <IonToolbar style={{ '--background': '#080c14', '--color': '#fff' }}>
          <IonButtons slot="start"><IonBackButton defaultHref="/driver/home" style={{ color: '#fff' }} /></IonButtons>
          <IonTitle style={{ color: '#fff' }}>Earnings</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="driver-earnings-container driver-earnings-wrapper" style={{ '--background': 'var(--nav-bg)' } as any}>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { loadData(); setTimeout(() => e.target.complete(), 800); }}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          {/* Balance Card */}
          <div className="earnings-balance-card">
            <IonIcon icon={walletOutline} className="balance-icon" />
            <p className="balance-label">Available Balance</p>
            <h1 className="balance-amount">{balance === null ? 'UGX —' : `UGX ${balance.toLocaleString()}`}</h1>
            <div className="payout-actions">
              <IonButton expand="block" disabled className="payout-btn">
                <IonIcon icon={arrowDownOutline} slot="start" /> Request Payout
              </IonButton>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '8px 0 0' }}>Payouts to Mobile Money are coming soon</p>
          </div>

          {/* Quick Stats */}
          <div className="earnings-stats-grid">
            {[
              { label: 'Today', value: `UGX ${(todayEarnings / 1000).toFixed(0)}K`, icon: timeOutline, color: '#FF6B35' },
              { label: 'This Week', value: `UGX ${(thisWeek / 1000).toFixed(0)}K`, icon: trendingUpOutline, color: '#4da6ff' },
              { label: 'Total', value: `UGX ${(totalEarnings / 1000).toFixed(0)}K`, icon: statsChartOutline, color: '#2D6A4F' },
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
                  <div className="chart-bar" style={{ height: `${Math.max((d.amount / maxAmount) * 100, d.amount > 0 ? 8 : 2)}%`, opacity: 0.85 }} />
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
              <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Earnings ({earnings.length} trips)</h3>
              {earnings.length === 0 ? (
                <EmptyState
                  icon={<IonIcon icon={receiptOutline} style={{ fontSize: 26 }} />}
                  title="No earnings yet"
                  subtitle="Complete a wallet ride and your 90% share will appear here instantly."
                />
              ) : (
                earnings.slice(0, 20).map(trip => (
                  <div key={trip.id} className="earnings-history-card">
                    <div className="history-header">
                      <div className="history-rider-info">
                        <IonIcon icon={receiptOutline} style={{ color: '#FF6B35' }} />
                        <div>
                          <span className="history-rider-name">Trip earnings</span>
                          <p className="history-ride-meta">{trip.rideId || 'Ride'}</p>
                        </div>
                      </div>
                      <span className="history-amount">+UGX {trip.amount.toLocaleString()}</span>
                    </div>
                    <div className="history-footer">
                      <span>{new Date(trip.createdAt).toLocaleDateString('en-UG', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="history-net-earning">After 10% NAVIGO commission</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <div className="payouts-section">
              <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Payout History</h3>
              <EmptyState
                icon={<IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 26 }} />}
                title="No payouts yet"
                subtitle="Payouts to Mobile Money are coming soon. Your balance keeps accumulating in the meantime."
              />
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total Trips', value: totalTrips, icon: receiptOutline },
                { label: 'Avg Rating', value: Number(rating).toFixed(1), icon: trendingUpOutline },
                { label: 'You Keep', value: '90%', icon: cashOutline },
                { label: 'Payout Method', value: 'Coming soon', icon: arrowDownOutline },
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
