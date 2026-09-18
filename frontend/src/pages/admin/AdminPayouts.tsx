import React, { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonIcon, IonCard, IonCardContent, IonBadge,
  IonSegment, IonSegmentButton, IonLabel, useIonToast, IonSpinner, IonRefresher, IonRefresherContent
} from '@ionic/react';
import {
  walletOutline, checkmarkCircleOutline, cashOutline,
  chevronDownCircleOutline, phonePortraitOutline, timeOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
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
  fullName?: string;
  createdAt: string;
  completedAt?: string;
  note?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'warning',
  processing: 'primary',
  completed: 'success',
  failed: 'danger',
};

const AdminPayouts: React.FC = () => {
  const history = useHistory();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [presentToast] = useIonToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/admin/payouts', {
        params: filter !== 'all' ? { status: filter } : {}
      });
      setPayouts(res.data?.payouts || []);
    } catch {
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const markPaid = async (p: Payout) => {
    setBusyId(p.id);
    try {
      const res = await api.post(`/auth/admin/payouts/${p.id}/complete`, {
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

  const pending = payouts.filter(p => p.status === 'pending' || p.status === 'processing');

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" /></IonButtons>
          <IonTitle>Driver Payouts</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': 'var(--nav-bg)' } as any} className="admin-container">
        <IonRefresher slot="fixed" onIonRefresh={(e) => { load(); setTimeout(() => e.target.complete(), 800); }}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        {loading ? (
          <div style={{ padding: 14 }}><Skeleton rows={4} /></div>
        ) : (
          <div style={{ padding: 14, maxWidth: 700, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                <p style={{ color: '#F59E0B', margin: 0, fontSize: 24, fontWeight: 800 }}>{pending.length}</p>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Awaiting payout</span>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                <p style={{ color: '#10B981', margin: 0, fontSize: 24, fontWeight: 800 }}>
                  UGX {payouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0).toLocaleString()}
                </p>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Total paid out</span>
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
                <IonCard key={p.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <IonCardContent style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IonIcon icon={phonePortraitOutline} style={{ color: '#FF6B35', fontSize: 20 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ color: '#fff', margin: 0, fontSize: 14 }}>{p.fullName || 'Driver'}</h4>
                          <IonBadge color={STATUS_COLORS[p.status]} style={{ fontSize: 9, textTransform: 'uppercase' }}>{p.status}</IonBadge>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: '3px 0 0', fontSize: 12 }}>
                          UGX {p.amount.toLocaleString()} → {p.provider.toUpperCase()} {p.phone}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.3)', margin: '2px 0 0', fontSize: 10 }}>
                          <IonIcon icon={timeOutline} style={{ fontSize: 10, verticalAlign: 'middle' }} /> {new Date(p.createdAt).toLocaleString('en-UG')}
                          {p.note ? ` • ${p.note}` : ''}
                        </p>
                      </div>
                    </div>
                    {(p.status === 'pending' || p.status === 'processing' || p.status === 'failed') && (
                      <button
                        onClick={() => markPaid(p)}
                        disabled={busyId === p.id}
                        style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#10B981', color: '#04120c', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        {busyId === p.id ? <IonSpinner name="crescent" /> : <IonIcon icon={checkmarkCircleOutline} />}
                        {p.status === 'failed' ? 'Retry / Mark paid' : 'Mark as paid (sent via NAVIGO MoMo)'}
                      </button>
                    )}
                  </IonCardContent>
                </IonCard>
              ))
            )}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default AdminPayouts;
