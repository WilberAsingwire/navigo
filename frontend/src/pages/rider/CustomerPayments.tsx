import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonCard, IonCardContent, IonIcon, IonText,
  IonButton, IonList, IonItem, IonLabel, IonBadge, IonModal,
  IonInput, useIonToast, IonSegment, IonSegmentButton, IonProgressBar
} from '@ionic/react';
import {
  walletOutline, cardOutline, addOutline, cashOutline,
  phonePortraitOutline, receiptOutline
} from 'ionicons/icons';
import api from '../../services/api';
import './CustomerPayments.css';

const RiderPayments: React.FC = () => {
  const [segment, setSegment] = useState<'methods' | 'history'>('methods');
  const [showAddModal, setShowAddModal] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [presentToast] = useIonToast();

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments/wallet');
      setBalance(data.balance);
      setTransactions(data.history);
    } catch (e) {
      console.error("Wallet fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWallet(); }, []);

  const handleTopUp = async (amount: number) => {
    try {
      await api.post('/payments/topup', { amount });
      presentToast({ message: 'Top-up successful! 💰', duration: 2000, color: 'success' });
      fetchWallet();
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Top-up failed', color: 'danger', duration: 3000 });
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="payments-toolbar">
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle className="sora-font">Wallet & Payments</IonTitle>
        </IonToolbar>
        <IonToolbar className="payments-toolbar">
          <IonSegment value={segment} onIonChange={(e) => setSegment(e.detail.value as any)}>
            <IonSegmentButton value="methods"><IonLabel>Methods</IonLabel></IonSegmentButton>
            <IonSegmentButton value="history"><IonLabel>History</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="payments-bg">
        {loading && <IonProgressBar type="indeterminate" color="success" />}

        <IonCard className="wallet-card">
          <IonCardContent>
            <div className="wallet-info">
              <IonIcon icon={walletOutline} className="wallet-icon" />
              <div className="balance-text">
                <p>Available Balance</p>
                <h1 className="sora-font">{balance.toLocaleString()} <small>UGX</small></h1>
              </div>
            </div>
            <IonButton expand="block" className="topup-btn" onClick={() => handleTopUp(10000)}>
              <IonIcon icon={addOutline} slot="start" /> Top-up 10,000 UGX (Simulated)
            </IonButton>
          </IonCardContent>
        </IonCard>

        {segment === 'methods' ? (
          <IonList lines="none" className="payment-list ion-padding">
             <h3 className="sora-font" style={{ color: 'white', fontSize: '1.1rem' }}>Saved Methods</h3>
             <IonItem className="payment-item">
                <div className="method-icon-box warning"><IonIcon icon={phonePortraitOutline} /></div>
                <IonLabel><h2 style={{color: 'white'}}>MTN Mobile Money</h2><p style={{color: '#aaa'}}>0772 ••• 123</p></IonLabel>
                <IonBadge color="success">Default</IonBadge>
             </IonItem>
             <IonItem className="payment-item" onClick={() => setShowAddModal(true)}>
                <div className="method-icon-box light"><IonIcon icon={addOutline} /></div>
                <IonLabel><h2 style={{color: 'white'}}>Add New Method</h2></IonLabel>
             </IonItem>
          </IonList>
        ) : (
          <IonList lines="none" className="payment-list">
            {transactions.length > 0 ? transactions.map((t, i) => (
              <IonItem key={i} className="payment-item">
                <div className="method-icon-box light"><IonIcon icon={receiptOutline} /></div>
                <IonLabel>
                  <h2 style={{ color: 'white' }}>{t.description}</h2>
                  <p style={{ color: '#aaa' }}>{new Date(t.date).toLocaleDateString()}</p>
                </IonLabel>
                <IonText color={t.type === 'debit' ? 'danger' : 'success'}>
                  {t.type === 'debit' ? '-' : '+'}{t.amount.toLocaleString()}
                </IonText>
              </IonItem>
            )) : (
              <div className="ion-text-center ion-padding">
                <p style={{color: '#aaa'}}>No transactions yet.</p>
              </div>
            )}
          </IonList>
        )}

        <IonModal isOpen={showAddModal} onDidDismiss={() => setShowAddModal(false)}>
          <IonContent className="ion-padding">
            <h2 className="sora-font">Add Payment Method</h2>
            <IonItem>
              <IonLabel position="stacked">Provider</IonLabel>
              <IonInput placeholder="e.g. MTN, Airtel" />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Account Number</IonLabel>
              <IonInput type="tel" placeholder="07..." />
            </IonItem>
            <IonButton expand="block" className="main-btn" onClick={() => setShowAddModal(false)}>Save Method</IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RiderPayments;
