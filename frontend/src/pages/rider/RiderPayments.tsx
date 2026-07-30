import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonCard, IonCardContent, IonIcon, IonButton, IonList,
  IonItem, IonLabel, IonBadge, IonModal, IonInput, IonSegment, IonSegmentButton,
  IonRadioGroup, IonRadio, useIonToast, IonNote, IonSpinner
} from '@ionic/react';
import {
  walletOutline, addOutline, phonePortraitOutline, cardOutline,
  cashOutline, receiptOutline, checkmarkCircleOutline, closeOutline,
  trashOutline, shieldCheckmarkOutline, arrowDownOutline, arrowUpOutline,
  refreshOutline, timeOutline
} from 'ionicons/icons';
import { getWalletBalance, topUpWallet, getTransactionHistory } from '../../services/paymentService';
import './RiderPayments.css';

const RiderPayments: React.FC = () => {
  const [segment, setSegment] = useState<'wallet' | 'methods' | 'history'>('wallet');
  const [showTopUp, setShowTopUp] = useState(false);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpProvider, setTopUpProvider] = useState<'mtn' | 'airtel'>('mtn');
  const [topUpPhone, setTopUpPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [presentToast] = useIonToast();
  const [savedMethods] = useState([
    { id: 'mtn1', type: 'mtn', name: 'MTN Mobile Money', number: '0772****123', isDefault: true, icon: '📱' },
    { id: 'airtel1', type: 'airtel', name: 'Airtel Money', number: '0753****456', isDefault: false, icon: '📱' },
    { id: 'cash1', type: 'cash', name: 'Cash', number: 'Pay directly', isDefault: false, icon: '💵' },
  ]);

  const loadData = async () => {
    setLoading(true);
    const wallet = await getWalletBalance();
    setBalance(wallet.balance);
    const history = await getTransactionHistory();
    setTransactions(history);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleTopUp = async () => {
    const amount = parseInt(topUpAmount);
    if (!amount || amount < 1000) {
      presentToast({ message: 'Minimum top-up is UGX 1,000', color: 'warning', duration: 2000 });
      return;
    }
    if (!topUpPhone || topUpPhone.length < 10) {
      presentToast({ message: 'Enter a valid phone number', color: 'warning', duration: 2000 });
      return;
    }
    setIsProcessing(true);
    const result = await topUpWallet(amount, topUpPhone, topUpProvider);
    if (result.success) {
      presentToast({ message: result.message, color: 'success', duration: 3000 });
      setShowTopUp(false);
      setTopUpAmount('');
      loadData();
    } else {
      presentToast({ message: result.message, color: 'danger', duration: 3000 });
    }
    setIsProcessing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle>Wallet & Payments</IonTitle>
          <IonButton slot="end" fill="clear" onClick={loadData}><IonIcon icon={refreshOutline} style={{ color: '#FF6B35' }} /></IonButton>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={segment} onIonChange={e => setSegment(e.detail.value as any)}>
            <IonSegmentButton value="wallet"><IonLabel style={{ fontSize: 11, color: '#fff' }}>💰 Wallet</IonLabel></IonSegmentButton>
            <IonSegmentButton value="methods"><IonLabel style={{ fontSize: 11, color: '#fff' }}>💳 Methods</IonLabel></IonSegmentButton>
            <IonSegmentButton value="history"><IonLabel style={{ fontSize: 11, color: '#fff' }}>📋 History</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        {loading && <div style={{ textAlign: 'center', padding: 40 }}><IonSpinner name="crescent" color="warning" /></div>}

        {!loading && (
          <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
            
            {segment === 'wallet' && (
              <>
                <IonCard style={{ background: 'linear-gradient(135deg, #1B4965, #0d2137)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
                  <IonCardContent style={{ textAlign: 'center', padding: 24 }}>
                    <IonIcon icon={walletOutline} style={{ fontSize: 36, color: '#FF6B35', marginBottom: 8 }} />
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>Available Balance</p>
                    <h1 style={{ color: '#fff', fontSize: 40, fontWeight: 800, margin: '8px 0' }}>UGX {balance.toLocaleString()}</h1>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <IonButton expand="block" onClick={() => setShowTopUp(true)} style={{ '--background': '#FF6B35', '--border-radius': 12, fontWeight: 700 } as any}>
                        <IonIcon icon={addOutline} slot="start" /> Top Up
                      </IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Cashback', value: '5%', icon: arrowDownOutline },
                    { label: 'Pending', value: 'UGX 0', icon: timeOutline },
                    { label: 'Saved', value: 'UGX 2,500', icon: shieldCheckmarkOutline },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                      <IonIcon icon={s.icon} style={{ color: '#FF6B35', fontSize: 18, marginBottom: 4 }} />
                      <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 2 }}>{s.value}</p>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {segment === 'methods' && (
              <>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>💳 Payment Methods</h3>
                {savedMethods.map(m => (
                  <div key={m.id} style={{ background: m.isDefault ? 'rgba(45,106,79,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, border: m.isDefault ? '1px solid rgba(45,106,79,0.2)' : '1px solid transparent' }}>
                    <span style={{ fontSize: 24 }}>{m.icon}</span>
                    <div style={{ flex: 1 }}><span style={{ color: '#fff', fontSize: 13 }}>{m.name}</span><p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2 }}>{m.number}</p></div>
                    {m.isDefault && <IonBadge color="success" style={{ fontSize: 9 }}>Default</IonBadge>}
                  </div>
                ))}
                <IonButton expand="block" fill="outline" onClick={() => setShowAddMethod(true)} style={{ '--border-color': 'rgba(255,255,255,0.12)', '--color': '#fff', '--border-radius': 12, marginTop: 8 } as any}>
                  <IonIcon icon={addOutline} slot="start" /> Add Method
                </IonButton>
              </>
            )}

            {segment === 'history' && (
              <>
                <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>📋 Transaction History</h3>
                {transactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
                    <IonIcon icon={receiptOutline} style={{ fontSize: 40 }} />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  transactions.map((t: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, marginBottom: 6 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.type === 'credit' ? 'rgba(45,106,79,0.15)' : 'rgba(232,93,117,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IonIcon icon={t.type === 'credit' ? arrowDownOutline : arrowUpOutline} style={{ color: t.type === 'credit' ? '#2D6A4F' : '#E85D75', fontSize: 14 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: '#fff', fontSize: 12 }}>{t.description}</span>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, margin: 2 }}>{formatDate(t.date)}</p>
                      </div>
                      <span style={{ color: t.type === 'credit' ? '#00e676' : '#ff5252', fontWeight: 700, fontSize: 13 }}>
                        {t.type === 'credit' ? '+' : '-'}UGX {t.amount.toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}

        {/* Top-up Modal */}
        <IonModal isOpen={showTopUp} onDidDismiss={() => setShowTopUp(false)}>
          <div style={{ padding: 20, background: '#0d1117', color: '#fff', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Top Up Wallet</h2>
              <IonButton fill="clear" onClick={() => setShowTopUp(false)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 22 }} /></IonButton>
            </div>
            <IonRadioGroup value={topUpProvider} onIonChange={e => setTopUpProvider(e.detail.value)}>
              <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 8, color: '#fff' } as any} lines="none"><IonLabel>MTN Mobile Money</IonLabel><IonRadio slot="start" value="mtn" /></IonItem>
              <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 12, color: '#fff' } as any} lines="none"><IonLabel>Airtel Money</IonLabel><IonRadio slot="start" value="airtel" /></IonItem>
            </IonRadioGroup>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 10, color: '#fff' } as any}><IonLabel position="stacked">Amount (UGX)</IonLabel><IonInput type="number" value={topUpAmount} onIonInput={e => setTopUpAmount(e.detail.value!)} placeholder="Minimum 1,000" /></IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 16, color: '#fff' } as any}><IonLabel position="stacked">Phone Number</IonLabel><IonInput type="tel" value={topUpPhone} onIonInput={e => setTopUpPhone(e.detail.value!)} placeholder="0772000000" /></IonItem>
            <IonButton expand="block" onClick={handleTopUp} disabled={isProcessing} style={{ '--background': '#FF6B35', '--border-radius': 12, fontWeight: 700 } as any}>
              {isProcessing ? <IonSpinner name="crescent" /> : 'Confirm Top Up'}
            </IonButton>
            <IonNote color="medium" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 11 }}>You'll receive a prompt on your phone to confirm</IonNote>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RiderPayments;