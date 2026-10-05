import React, { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonIcon, IonCard, IonCardContent, IonBadge,
  IonSegment, IonSegmentButton, IonLabel, useIonToast, IonSpinner, IonRefresher, IonRefresherContent,
  useIonAlert
} from '@ionic/react';
import {
  walletOutline, checkmarkCircleOutline, closeCircleOutline,
  chevronDownCircleOutline, phonePortraitOutline, timeOutline, arrowDownCircleOutline
} from 'ionicons/icons';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import './AdminSupport.css';

interface Payout {
  id: string;
  amount: number;
  provider: string;
  phone: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userName?: string;
  createdAt: string;
  completedAt?: string;
  note?: string;
}

interface TopupRequest {
  id: string;
  userId: string;
  amount: number;
  provider: string;
  momoRef: string;
  senderPhone: string;
  status: 'pending' | 'approved' | 'rejected';
  userName?: string;
  phone?: string;
  reviewNote?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'warning',
  processing: 'primary',
  completed: 'success',
  approved: 'success',
  failed: 'danger',
  rejected: 'danger',
};

const AdminPayouts: React.FC = () => {
  const [view, setView] = useState<'payouts' | 'topups'>('payouts');
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [topupFilter, setTopupFilter] = useState('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();

  const load = async () => {
    setLoading(true);
    try {
      if (view === 'payouts') {
        const res = await api.get('/admin/payouts', {
          params: filter !== 'all' ? { status: filter } : {}
        });
        setPayouts(res.data?.payouts || []);
      } else {
        const res = await api.get('/wallet/admin/topup-requests', {
          params: topupFilter !== 'all' ? { status: topupFilter } : {}
        });
        setTopups(res.data?.requests || []);
      }
    } catch {
      if (view === 'payouts') setPayouts([]); else setTopups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter, topupFilter, view]);

  const markPaid = async (p: Payout) => {
    setBusyId(p.id);
    try {
      const res = await api.post(`/admin/payouts/${p.id}/complete`, {
        note: `Sent via NAVIGO ${p.provider.toUpperCase()} wallet`
      });
      presentToast({ message: res.data?.message || 'Marked as paid', color: 'success', duration: 2500 });
      load();
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Failed', color: 'danger', duration: 2500 });
    } finally {
      setBusyId(null);
    }
  };

  const rejectPayout = (p: Payout) => {
    presentAlert({
      header: 'Reject payout?',
      message: `UGX ${p.amount.toLocaleString()} will be refunded to ${p.userName || 'the driver'}'s wallet.`,
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason (e.g. wrong number)' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject & refund',
          role: 'destructive',
          handler: async (data) => {
            setBusyId(p.id);
            try {
              const res = await api.post(`/admin/payouts/${p.id}/reject`, { reason: data?.reason });
              presentToast({ message: res.data?.message || 'Payout rejected and refunded', color: 'success', duration: 2500 });
              load();
            } catch (e: any) {
              presentToast({ message: e.response?.data?.message || 'Failed', color: 'danger', duration: 2500 });
            } finally {
              setBusyId(null);
            }
          }
        },
      ],
    });
  };

  const approveTopup = async (t: TopupRequest) => {
    setBusyId(t.id);
    try {
      const res = await api.post(`/wallet/admin/topup-requests/${t.id}/approve`);
      presentToast({ message: res.data?.message || 'Top-up approved & credited', color: 'success', duration: 2500 });
      load();
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Failed', color: 'danger', duration: 2500 });
    } finally {
      setBusyId(null);
    }
  };

  const rejectTopup = (t: TopupRequest) => {
    presentAlert({
      header: 'Reject top-up?',
      message: `The user's wallet will NOT be credited. Reject only if no matching deposit of UGX ${t.amount.toLocaleString()} was received.`,
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason shown to the user' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          role: 'destructive',
          handler: async (data) => {
            setBusyId(t.id);
            try {
              const res = await api.post(`/wallet/admin/topup-requests/${t.id}/reject`, { reason: data?.reason });
              presentToast({ message: res.data?.message || 'Top-up rejected', color: 'success', duration: 2500 });
              load();
            } catch (e: any) {
              presentToast({ message: e.response?.data?.message || 'Failed', color: 'danger', duration: 2500 });
            } finally {
              setBusyId(null);
            }
          }
        },
      ],
    });
  };

  const pending = payouts.filter(p => p.status === 'pending' || p.status === 'processing');
  const pendingTopups = topups.filter(t => t.status === 'pending');

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" /></IonButtons>
          <IonTitle>Money</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': 'var(--nav-bg)' } as any} className="admin-container">
        <IonRefresher slot="fixed" onIonRefresh={(e) => { load(); setTimeout(() => e.target.complete(), 800); }}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        <div style={{ padding: 14, maxWidth: 700, margin: '0 auto' }}>
          <IonSegment value={view} onIonChange={e => setView(e.detail.value as any)} style={{ marginBottom: 14 }}>
            <IonSegmentButton value="payouts"><IonLabel style={{ fontSize: 12 }}>Driver Payouts</IonLabel></IonSegmentButton>
            <IonSegmentButton value="topups"><IonLabel style={{ fontSize: 12 }}>Wallet Top-ups</IonLabel></IonSegmentButton>
          </IonSegment>

          {loading ? (
            <Skeleton rows={4} />
          ) : view === 'payouts' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <p style={{ color: '#F59E0B', margin: 0, fontSize: 24, fontWeight: 800 }}>{pending.length}</p>
                  <span style={{ color: 'var(--nav-text-secondary)', fontSize: 11 }}>Awaiting payout</span>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <p style={{ color: '#10B981', margin: 0, fontSize: 24, fontWeight: 800 }}>
                    UGX {payouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0).toLocaleString()}
                  </p>
                  <span style={{ color: 'var(--nav-text-secondary)', fontSize: 11 }}>Total paid out</span>
                </div>
              </div>

              <IonSegment value={filter} onIonChange={e => setFilter(String(e.detail.value))} style={{ marginBottom: 14 }}>
                <IonSegmentButton value="all"><IonLabel style={{ fontSize: 11 }}>All</IonLabel></IonSegmentButton>
                <IonSegmentButton value="pending"><IonLabel style={{ fontSize: 11 }}>Pending</IonLabel></IonSegmentButton>
                <IonSegmentButton value="processing"><IonLabel style={{ fontSize: 11 }}>Processing</IonLabel></IonSegmentButton>
                <IonSegmentButton value="completed"><IonLabel style={{ fontSize: 11 }}>Completed</IonLabel></IonSegmentButton>
              </IonSegment>

              {payouts.length === 0 ? (
                <EmptyState
                  icon={<IonIcon icon={walletOutline} style={{ fontSize: 26 }} />}
                  title="No payouts here"
                  subtitle="Driver payout requests will appear in this queue."
                />
              ) : (
                payouts.map(p => (
                  <IonCard key={p.id} style={{ background: 'var(--nav-card-soft)', borderRadius: 12, marginBottom: 10, border: '1px solid var(--nav-border)' }}>
                    <IonCardContent style={{ padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IonIcon icon={phonePortraitOutline} style={{ color: 'var(--navigo-orange)', fontSize: 20 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ color: 'var(--nav-text)', margin: 0, fontSize: 14 }}>{p.userName || 'Driver'}</h4>
                            <IonBadge color={STATUS_COLORS[p.status]} style={{ fontSize: 9, textTransform: 'uppercase' }}>{p.status}</IonBadge>
                          </div>
                          <p style={{ color: 'var(--nav-text-secondary)', margin: '3px 0 0', fontSize: 12 }}>
                            UGX {p.amount.toLocaleString()} → {p.provider.toUpperCase()} {p.phone}
                          </p>
                          <p style={{ color: 'var(--nav-text-dim)', margin: '2px 0 0', fontSize: 10 }}>
                            <IonIcon icon={timeOutline} style={{ fontSize: 10, verticalAlign: 'middle' }} /> {new Date(p.createdAt).toLocaleString('en-UG')}
                            {p.note ? ` • ${p.note}` : ''}
                          </p>
                        </div>
                      </div>
                      {(p.status === 'pending' || p.status === 'processing') && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button
                            onClick={() => markPaid(p)}
                            disabled={busyId === p.id}
                            style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#10B981', color: '#04120c', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          >
                            {busyId === p.id ? <IonSpinner name="crescent" /> : <IonIcon icon={checkmarkCircleOutline} />}
                            Mark as paid
                          </button>
                          <button
                            onClick={() => rejectPayout(p)}
                            disabled={busyId === p.id}
                            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          >
                            <IonIcon icon={closeCircleOutline} /> Reject
                          </button>
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                ))
              )}
            </>
          ) : (
            <>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 14 }}>
                <p style={{ color: '#F59E0B', margin: 0, fontSize: 24, fontWeight: 800 }}>{pendingTopups.length}</p>
                <span style={{ color: 'var(--nav-text-secondary)', fontSize: 11 }}>Top-ups awaiting verification</span>
              </div>

              <IonSegment value={topupFilter} onIonChange={e => setTopupFilter(String(e.detail.value))} style={{ marginBottom: 14 }}>
                <IonSegmentButton value="pending"><IonLabel style={{ fontSize: 11 }}>Pending</IonLabel></IonSegmentButton>
                <IonSegmentButton value="approved"><IonLabel style={{ fontSize: 11 }}>Approved</IonLabel></IonSegmentButton>
                <IonSegmentButton value="rejected"><IonLabel style={{ fontSize: 11 }}>Rejected</IonLabel></IonSegmentButton>
                <IonSegmentButton value="all"><IonLabel style={{ fontSize: 11 }}>All</IonLabel></IonSegmentButton>
              </IonSegment>

              {topups.length === 0 ? (
                <EmptyState
                  icon={<IonIcon icon={arrowDownCircleOutline} style={{ fontSize: 26 }} />}
                  title="No top-up requests"
                  subtitle="When a user sends MoMo to the NAVIGO number and submits the transaction ID, it appears here."
                />
              ) : (
                topups.map(t => (
                  <IonCard key={t.id} style={{ background: 'var(--nav-card-soft)', borderRadius: 12, marginBottom: 10, border: '1px solid var(--nav-border)' }}>
                    <IonCardContent style={{ padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ color: 'var(--nav-text)', margin: 0, fontSize: 14 }}>{t.userName || 'User'}</h4>
                        <IonBadge color={STATUS_COLORS[t.status]} style={{ fontSize: 9, textTransform: 'uppercase' }}>{t.status}</IonBadge>
                      </div>
                      <p style={{ color: 'var(--nav-text-secondary)', margin: '6px 0 0', fontSize: 13, fontWeight: 600 }}>
                        UGX {t.amount.toLocaleString()} via {t.provider.toUpperCase()}
                      </p>
                      <p style={{ color: 'var(--nav-text-dim)', margin: '3px 0 0', fontSize: 11 }}>
                        Ref: <strong style={{ color: 'var(--navigo-orange)' }}>{t.momoRef}</strong> • Sent from {t.senderPhone}
                      </p>
                      <p style={{ color: 'var(--nav-text-dim)', margin: '2px 0 0', fontSize: 10 }}>
                        <IonIcon icon={timeOutline} style={{ fontSize: 10, verticalAlign: 'middle' }} /> {new Date(t.createdAt).toLocaleString('en-UG')}
                        {t.reviewNote ? ` • ${t.reviewNote}` : ''}
                      </p>
                      {t.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button
                            onClick={() => approveTopup(t)}
                            disabled={busyId === t.id}
                            style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#10B981', color: '#04120c', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          >
                            {busyId === t.id ? <IonSpinner name="crescent" /> : <IonIcon icon={checkmarkCircleOutline} />}
                            Deposit received — credit wallet
                          </button>
                          <button
                            onClick={() => rejectTopup(t)}
                            disabled={busyId === t.id}
                            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          >
                            <IonIcon icon={closeCircleOutline} /> Reject
                          </button>
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                ))
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminPayouts;
