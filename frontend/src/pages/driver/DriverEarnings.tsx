import React, { useState, useEffect, useMemo } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonIcon, IonText, IonButton, IonProgressBar,
  IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
  IonLabel, IonBadge, IonSpinner, IonModal, IonInput, useIonToast
} from '@ionic/react';
import {
  trendingUpOutline, arrowDownOutline, receiptOutline,
  chevronDownCircleOutline, walletOutline, cashOutline,
  statsChartOutline, timeOutline, checkmarkCircleOutline, closeOutline
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
const MIN_PAYOUT = 10000;

interface Payout {
  id: string;
  amount: number;
  provider: string;
  phone: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

const PAYOUT_STATUS_COLORS: Record<string, string> = {
  pending: 'warning', processing: 'primary', completed: 'success', failed: 'danger',
};

const DriverEarnings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'payouts'>('overview');
  const [showPayout, setShowPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutProvider, setPayoutProvider] = useState<'mtn' | 'airtel'>('mtn');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [presentToast] = useIonToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, txRes, profRes, poRes] = await Promise.all([
        api.get('/wallet/balance').catch(() => null),
        api.get('/wallet/transactions').catch(() => null),
        api.get('/drivers/profile').catch(() => null),
        api.get('/wallet/payouts').catch(() => null),
      ]);
      if (balRes?.data?.ok) setBalance(balRes.data.balance);
      setTransactions(txRes?.data?.transactions || []);
      setProfile(profRes?.data || null);
      setPayouts(poRes?.data?.payouts || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (user?.phone) setPayoutPhone(user.phone); }, [user]);

  const handleRequestPayout = async () => {
    const amt = parseInt(payoutAmount, 10);
    if (!amt || amt < MIN_PAYOUT) {
      presentToast({ message: `Minimum payout is UGX ${MIN_PAYOUT.toLocaleString()}`, color: 'warning', duration: 2500 });
      return;
    }
    if (balance !== null && amt > balance) {
      presentToast({ message: 'Amount exceeds your available balance', color: 'warning', duration: 2500 });
      return;
    }
    setIsRequesting(true);
    try {
      const res = await api.post('/wallet/payout', { amount: amt, provider: payoutProvider, phone: payoutPhone });
      presentToast({ message: res.data?.message || 'Payout requested!', color: 'success', duration: 3500 });
      setShowPayout(false);
      setPayoutAmount('');
      setActiveTab('payouts');
      loadData();
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Payout request failed. Try again.', color: 'danger', duration: 4000 });
    } finally {
      setIsRequesting(false);
    }
  };

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
              <IonButton
                expand="block"
                className="payout-btn"
                disabled={balance === null || balance < MIN_PAYOUT}
                onClick={() => setShowPayout(true)}
              >
                <IonIcon icon={arrowDownOutline} slot="start" /> Request Payout
              </IonButton>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '8px 0 0' }}>
              {balance !== null && balance < MIN_PAYOUT
                ? `Minimum payout is UGX ${MIN_PAYOUT.toLocaleString()} — keep earning!`
                : 'Sent to your Mobile Money — you receive the full amount, NAVIGO covers the fee'}
            </p>
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
            <h4 className="chart-title">This week</h4>
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
              {payouts.length === 0 ? (
                <EmptyState
                  icon={<IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 26 }} />}
                  title="No payouts yet"
                  subtitle={`Request a payout once your balance reaches UGX ${MIN_PAYOUT.toLocaleString()}.`}
                  actionLabel="Request payout"
                  onAction={() => setShowPayout(true)}
                />
              ) : (
                payouts.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <IonIcon icon={arrowDownOutline} style={{ color: '#FF6B35', fontSize: 18 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>UGX {p.amount.toLocaleString()}</span>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2 }}>
                        {p.provider.toUpperCase()} {p.phone} • {new Date(p.createdAt).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <IonBadge color={PAYOUT_STATUS_COLORS[p.status] || 'medium'} style={{ fontSize: 9, textTransform: 'uppercase' }}>
                      {p.status === 'pending' ? 'processing' : p.status}
                    </IonBadge>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total Trips', value: totalTrips, icon: receiptOutline },
                { label: 'Avg Rating', value: Number(rating).toFixed(1), icon: trendingUpOutline },
                { label: 'You Keep', value: '90%', icon: cashOutline },
                { label: 'Payout Method', value: 'Mobile Money', icon: arrowDownOutline },
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

        {/* Payout Request Modal */}
        <IonModal isOpen={showPayout} onDidDismiss={() => setShowPayout(false)}>
          <div style={{ padding: 20, background: 'var(--nav-bg-soft, #0d1420)', color: '#fff', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Request Payout</h2>
              <IonButton fill="clear" onClick={() => setShowPayout(false)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 22 }} /></IonButton>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 }}>
              Available: <strong style={{ color: '#10B981' }}>UGX {(balance ?? 0).toLocaleString()}</strong> • You receive the full amount — NAVIGO covers the transfer fee.
            </p>

            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Send to</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {(['mtn', 'airtel'] as const).map(p => (
                <button key={p} onClick={() => setPayoutProvider(p)}
                  style={{
                    padding: '12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    border: payoutProvider === p ? '2px solid #FF6B35' : '1px solid rgba(255,255,255,0.12)',
                    background: payoutProvider === p ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.04)',
                    color: payoutProvider === p ? '#FF6B35' : 'rgba(255,255,255,0.7)',
                  }}>
                  {p === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}
                </button>
              ))}
            </div>

            <IonInput
              type="tel"
              value={payoutPhone}
              onIonInput={e => setPayoutPhone(e.detail.value!)}
              placeholder="Mobile Money number (07XXXXXXXX)"
              style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 10, color: '#fff', '--padding-start': '12px' } as any}
            />
            <IonInput
              type="number"
              value={payoutAmount}
              onIonInput={e => setPayoutAmount(e.detail.value!)}
              placeholder={`Amount (minimum ${MIN_PAYOUT.toLocaleString()})`}
              style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 16, color: '#fff', '--padding-start': '12px' } as any}
            />

            <IonButton expand="block" onClick={handleRequestPayout} disabled={isRequesting}
              style={{ '--background': '#FF6B35', '--border-radius': 12, fontWeight: 700 } as any}>
              {isRequesting ? <IonSpinner name="crescent" /> : 'Request Payout'}
            </IonButton>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
              The amount is reserved from your balance immediately and sent to your Mobile Money — usually within a few hours. If it can't be sent, it's refunded automatically.
            </p>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default DriverEarnings;
