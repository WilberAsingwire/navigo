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

interface TopupRequest {
  id: string;
  amount: number;
  provider: string;
  momoRef: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  createdAt: string;
}

interface DepositOption {
  provider: string;
  label: string;
  number: string;
  name: string;
}

const KIND_LABELS: Record<string, string> = {
  topup: 'Wallet top-up',
  ride_payment: 'Ride payment',
  payout: 'Payout',
  tip: 'Tip',
};

const TOPUP_STATUS_COLORS: Record<string, string> = {
  pending: 'warning', approved: 'success', rejected: 'danger',
};

/**
 * Real wallet screen — balance and history come from the backend.
 * Top-ups: send Mobile Money to the NAVIGO number, submit the transaction
 * ID, and the balance is credited after verification (no gateway fees).
 */
const RiderPayments: React.FC = () => {
  const { user } = useAuth();
  const [segment, setSegment] = useState<'wallet' | 'methods' | 'history'>('wallet');
  const [showTopUp, setShowTopUp] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([]);
  const [deposits, setDeposits] = useState<DepositOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [provider, setProvider] = useState('mtn');
  const [momoRef, setMomoRef] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [presentToast] = useIonToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, txRes, reqRes, infoRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/transactions').catch(() => ({ data: { transactions: [] } })),
        api.get('/wallet/topup-requests').catch(() => ({ data: { requests: [] } })),
        api.get('/wallet/payment-info').catch(() => ({ data: { deposits: [] } })),
      ]);
      if (balRes.data?.ok) setBalance(balRes.data.balance);
      setTransactions(txRes.data?.transactions || []);
      setTopupRequests(reqRes.data?.requests || []);
      const dep = infoRes.data?.deposits || [];
      setDeposits(dep);
      if (dep.length > 0) setProvider(dep[0].provider);
    } catch {
      // Offline / backend down — keep whatever we had
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (user?.phone) setSenderPhone(user.phone); }, [user]);

  const selectedDeposit = deposits.find(d => d.provider === provider) || deposits[0];

  const handleTopUp = async () => {
    const amount = parseInt(topUpAmount, 10);
    if (!amount || amount < 1000) {
      presentToast({ message: 'Minimum top-up is UGX 1,000', color: 'warning', duration: 2000 });
      return;
    }
    if (!momoRef.trim() || momoRef.trim().length < 6) {
      presentToast({ message: 'Enter the transaction ID from your Mobile Money confirmation SMS', color: 'warning', duration: 3000 });
      return;
    }
    setIsProcessing(true);
    try {
      // Free-mode top-up: the rider has already sent MoMo to the NAVIGO
      // number; this submits the transaction ID for verification. The wallet
      // is credited as soon as the deposit is confirmed.
      const res = await api.post('/wallet/topup-request', {
        amount,
        provider,
        senderPhone,
        momoRef: momoRef.trim(),
      });
      presentToast({ message: res.data?.message || 'Top-up submitted for verification!', color: 'success', duration: 4000 });
      setShowTopUp(false);
      setTopUpAmount('');
      setMomoRef('');
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

      <IonContent style={{ '--background': 'var(--nav-bg)' } as any} className="rider-payments-wrapper">
        {loading ? (
          <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}><Skeleton rows={3} /></div>
        ) : (
          <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
            {segment === 'wallet' && (
              <>
                <IonCard style={{ background: 'var(--nav-bg-raised)', borderRadius: 12, border: '1px solid var(--nav-border-strong)', marginBottom: 16 }}>
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

                {/* Top-up requests awaiting verification */}
                {topupRequests.filter(r => r.status === 'pending').length > 0 && (
                  <>
                    <h3 style={{ color: '#fff', fontSize: 13, marginBottom: 8 }}>Top-ups being verified</h3>
                    {topupRequests.filter(r => r.status === 'pending').map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: 10, marginBottom: 6 }}>
                        <IonSpinner name="dots" style={{ width: 24, height: 24, color: '#F59E0B' }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>UGX {r.amount.toLocaleString()} via {r.provider.toUpperCase()}</span>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2 }}>Ref: {r.momoRef} • {formatDate(r.createdAt)}</p>
                        </div>
                        <IonBadge color={TOPUP_STATUS_COLORS[r.status] || 'warning'} style={{ fontSize: 9 }}>Verifying</IonBadge>
                      </div>
                    ))}
                    <IonNote color="medium" style={{ display: 'block', fontSize: 10, marginBottom: 12 }}>
                      Your balance updates as soon as the deposit is confirmed — usually within a few minutes.
                    </IonNote>
                  </>
                )}
                {topupRequests.filter(r => r.status === 'rejected').slice(0, 2).map(r => (
                  <div key={r.id} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 10, marginBottom: 6 }}>
                    <span style={{ color: '#EF4444', fontSize: 12, fontWeight: 600 }}>Top-up of UGX {r.amount.toLocaleString()} could not be verified</span>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: '3px 0 0' }}>{r.reviewNote || 'Check the transaction ID and submit again.'}</p>
                  </div>
                ))}
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
                  Top up by sending Mobile Money to the NAVIGO number — your balance is credited once the deposit is verified.
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

        {/* Top-up Modal — manual MoMo deposit flow */}
        <IonModal isOpen={showTopUp} onDidDismiss={() => setShowTopUp(false)}>
          <div style={{ padding: 20, background: 'var(--nav-bg-soft)', color: '#fff', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Top Up Wallet</h2>
              <IonButton fill="clear" onClick={() => setShowTopUp(false)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 22 }} /></IonButton>
            </div>

            {deposits.length === 0 ? (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <p style={{ color: '#F59E0B', fontWeight: 700, fontSize: 14, margin: 0 }}>Top-ups are not available yet</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 6 }}>
                  The deposit numbers haven't been configured. You can still pay for every ride with cash.
                </p>
              </div>
            ) : (
              <>
                {/* Step 1 — pick network */}
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 6px' }}><strong style={{ color: '#FF6B35' }}>1.</strong> Choose your network</p>
                <div style={{ display: 'grid', gridTemplateColumns: deposits.length > 1 ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 14 }}>
                  {deposits.map(d => (
                    <button key={d.provider} onClick={() => setProvider(d.provider)}
                      style={{
                        padding: '12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                        border: provider === d.provider ? '2px solid #FF6B35' : '1px solid rgba(255,255,255,0.12)',
                        background: provider === d.provider ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.04)',
                        color: provider === d.provider ? '#FF6B35' : 'rgba(255,255,255,0.7)',
                      }}>
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* Step 2 — send the money */}
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 6px' }}><strong style={{ color: '#FF6B35' }}>2.</strong> Send the amount to this number</p>
                {selectedDeposit && (
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 14 }}>
                    <p style={{ color: '#10B981', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: 1 }}>{selectedDeposit.number}</p>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{selectedDeposit.name} • {selectedDeposit.label}</span>
                  </div>
                )}

                {/* Step 3 — submit the confirmation */}
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 6px' }}><strong style={{ color: '#FF6B35' }}>3.</strong> Enter the details from your confirmation SMS</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                  {[5000, 10000, 20000].map(v => (
                    <button key={v} onClick={() => setTopUpAmount(String(v))}
                      style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(255,107,53,0.35)', background: topUpAmount === String(v) ? 'rgba(255,107,53,0.25)' : 'rgba(255,107,53,0.08)', color: '#FF6B35', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      UGX {v.toLocaleString()}
                    </button>
                  ))}
                </div>
                <IonInput
                  type="number"
                  value={topUpAmount}
                  onIonInput={e => setTopUpAmount(e.detail.value!)}
                  placeholder="Amount you sent (minimum 1,000)"
                  style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 10, color: '#fff', '--padding-start': '12px' } as any}
                />
                <IonInput
                  value={momoRef}
                  onIonInput={e => setMomoRef(e.detail.value!)}
                  placeholder="Transaction ID (from the SMS)"
                  style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 10, color: '#fff', '--padding-start': '12px' } as any}
                />
                <IonInput
                  type="tel"
                  value={senderPhone}
                  onIonInput={e => setSenderPhone(e.detail.value!)}
                  placeholder="Number you sent from (07XXXXXXXX)"
                  style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 16, color: '#fff', '--padding-start': '12px' } as any}
                />
                <IonButton expand="block" onClick={handleTopUp} disabled={isProcessing} style={{ '--background': '#FF6B35', '--border-radius': 12, fontWeight: 700 } as any}>
                  {isProcessing ? <IonSpinner name="crescent" /> : 'Submit for Verification'}
                </IonButton>
                <IonNote color="medium" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 11 }}>
                  Your wallet is credited as soon as the deposit is verified — usually within a few minutes. No extra fees.
                </IonNote>
              </>
            )}
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RiderPayments;
