import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonCard, IonCardContent, IonIcon, IonButton,
  IonBadge, IonModal, IonInput, IonSegment, IonSegmentButton,
  IonLabel, useIonToast, IonNote, IonSpinner
} from '@ionic/react';
import {
  walletOutline, addOutline, receiptOutline,
  closeOutline, arrowDownOutline, arrowUpOutline,
  refreshOutline, cashOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import './RiderPayments.css';

interface WalletTx {
  id: string;
  kind: 'topup' | 'ride_payment' | 'payout' | 'tip';
  amount: number;
  note: string;
  reference?: string;
  rideId?: string;
  createdAt: string;
}

const KIND_LABELS: Record<string, string> = {
  topup: 'Wallet top-up',
  ride_payment: 'Ride payment',
  payout: 'Payout',
  tip: 'Tip',
};

/**
 * Real wallet screen — balance and history come from the backend,
 * top-ups go through the payment-verification flow.
 */
const RiderPayments: React.FC = () => {
  const { user } = useAuth();
  const [segment, setSegment] = useState<'wallet' | 'methods' | 'history'>('wallet');
  const [showTopUp, setShowTopUp] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [presentToast] = useIonToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, txRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/transactions').catch(() => ({ data: { transactions: [] } })),
      ]);
      if (balRes.data?.ok) setBalance(balRes.data.balance);
      setTransactions(txRes.data?.transactions || []);
    } catch {
      // Offline / backend down — keep whatever we had
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleTopUp = async () => {
    const amount = parseInt(topUpAmount, 10);
    if (!amount || amount < 1000) {
      presentToast({ message: 'Minimum top-up is UGX 1,000', color: 'warning', duration: 2000 });
      return;
    }
    setIsProcessing(true);
    try {
      // Gateway-verified top-up: the backend checks this reference with the
      // payment provider before crediting the wallet.
      const reference = `NAV-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const res = await api.post('/wallet/topup', {
        amount,
        paymentReference: reference,
        provider: 'mtn',
        phone: user?.phone,
      });
      presentToast({ message: res.data?.message || 'Top-up successful!', color: 'success', duration: 3000 });
      setShowTopUp(false);
      setTopUpAmount('');
      loadData();
    } catch (e: any) {
      presentToast({
        message: e.response?.data?.message || 'Top-up failed. Try again.',
        color: 'danger',
        duration: 4000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const totalTopups = transactions.filter(t => t.kind === 'topup').reduce((s, t) => s + t.amount, 0);
  const totalSpent = transactions.filter(t => t.kind === 'ride_payment').reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/customer/home" /></IonButtons>
          <IonTitle>Wallet & Payments</IonTitle>
          <IonButton slot="end" fill="clear" onClick={loadData}><IonIcon icon={refreshOutline} style={{ color: '#FF6B35' }} /></IonButton>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={segment} onIonChange={e => setSegment(e.detail.value as any)}>
            <IonSegmentButton value="wallet"><IonLabel style={{ fontSize: 11, color: '#fff' }}>Wallet</IonLabel></IonSegmentButton>
            <IonSegmentButton value="methods"><IonLabel style={{ fontSize: 11, color: '#fff' }}>Payment</IonLabel></IonSegmentButton>
            <IonSegmentButton value="history"><IonLabel style={{ fontSize: 11, color: '#fff' }}>History</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#080c14' } as any}>
        {loading ? (
          <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}><Skeleton rows={3} /></div>
        ) : (
          <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
            {segment === 'wallet' && (
              <>
                <IonCard style={{ background: 'linear-gradient(135deg, #1B4965, #0d2137)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
                  <IonCardContent style={{ textAlign: 'center', padding: 24 }}>
                    <IonIcon icon={walletOutline} style={{ fontSize: 36, color: '#FF6B35', marginBottom: 8 }} />
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>Available Balance</p>
                    <h1 style={{ color: '#fff', fontSize: 40, fontWeight: 800, margin: '8px 0' }}>
                      {balance === null ? '—' : `UGX ${balance.toLocaleString()}`}
                    </h1>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <IonButton expand="block" onClick={() => setShowTopUp(true)} style={{ '--background': '#FF6B35', '--border-radius': 12, fontWeight: 700 } as any}>
                        <IonIcon icon={addOutline} slot="start" /> Top Up
                      </IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <IonIcon icon={arrowDownOutline} style={{ color: '#2D6A4F', fontSize: 18, marginBottom: 4 }} />
                    <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 2 }}>UGX {totalTopups.toLocaleString()}</p>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Total topped up</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <IonIcon icon={arrowUpOutline} style={{ color: '#E85D75', fontSize: 18, marginBottom: 4 }} />
                    <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 2 }}>UGX {totalSpent.toLocaleString()}</p>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Spent on rides</span>
                  </div>
                </div>
              </>
            )}

            {segment === 'methods' && (
              <>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>How you pay</h3>
                <div style={{ background: 'rgba(45,106,79,0.08)', borderRadius: 12, padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(45,106,79,0.25)' }}>
                  <IonIcon icon={walletOutline} style={{ fontSize: 24, color: '#FF6B35' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>NAVIGO Wallet</span>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 2 }}>
                      {user?.phone || 'Your number'} • Top up via Mobile Money
                    </p>
                  </div>
                  <IonBadge color="success" style={{ fontSize: 9 }}>Active</IonBadge>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IonIcon icon={cashOutline} style={{ fontSize: 24, color: '#10B981' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Cash</span>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 2 }}>Pay the driver directly at the end of the ride</p>
                  </div>
                </div>
                <IonNote color="medium" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 11 }}>
                  Wallet top-ups are verified with the payment provider before your balance updates.
                </IonNote>
              </>
            )}

            {segment === 'history' && (
              <>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Transaction History</h3>
                {transactions.length === 0 ? (
                  <EmptyState
                    icon={<IonIcon icon={receiptOutline} style={{ fontSize: 26 }} />}
                    title="No transactions yet"
                    subtitle="Top-ups and ride payments will appear here."
                    actionLabel="Top up wallet"
                    onAction={() => setShowTopUp(true)}
                  />
                ) : (
                  transactions.map(t => {
                    const isCredit = t.amount >= 0;
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, marginBottom: 6 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: isCredit ? 'rgba(45,106,79,0.15)' : 'rgba(232,93,117,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IonIcon icon={isCredit ? arrowDownOutline : arrowUpOutline} style={{ color: isCredit ? '#2D6A4F' : '#E85D75', fontSize: 14 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: '#fff', fontSize: 12 }}>{KIND_LABELS[t.kind] || t.kind}</span>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, margin: 2 }}>{formatDate(t.createdAt)}</p>
                        </div>
                        <span style={{ color: isCredit ? '#00e676' : '#ff5252', fontWeight: 700, fontSize: 13 }}>
                          {isCredit ? '+' : '−'}UGX {Math.abs(t.amount).toLocaleString()}
                        </span>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        )}

        {/* Top-up Modal */}
        <IonModal isOpen={showTopUp} onDidDismiss={() => setShowTopUp(false)}>
          <div style={{ padding: 20, background: 'var(--nav-bg-soft)', color: '#fff', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Top Up Wallet</h2>
              <IonButton fill="clear" onClick={() => setShowTopUp(false)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 22 }} /></IonButton>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[2000, 5000, 10000].map(v => (
                <button key={v} onClick={() => setTopUpAmount(String(v))}
                  style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(255,107,53,0.35)', background: 'rgba(255,107,53,0.08)', color: '#FF6B35', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  UGX {v.toLocaleString()}
                </button>
              ))}
            </div>
            <IonInput
              type="number"
              value={topUpAmount}
              onIonInput={e => setTopUpAmount(e.detail.value!)}
              placeholder="Amount (minimum 1,000)"
              style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 16, color: '#fff' } as any}
            />
            <IonButton expand="block" onClick={handleTopUp} disabled={isProcessing} style={{ '--background': '#FF6B35', '--border-radius': 12, fontWeight: 700 } as any}>
              {isProcessing ? <IonSpinner name="crescent" /> : 'Confirm Top Up'}
            </IonButton>
            <IonNote color="medium" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 11 }}>
              You'll receive a Mobile Money prompt on {user?.phone || 'your phone'} to confirm
            </IonNote>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RiderPayments;
