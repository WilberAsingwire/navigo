import React, { useState } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonCard, IonCardContent, IonIcon, IonText,
  IonButton, IonList, IonItem, IonLabel, IonBadge, IonModal,
  IonInput, useIonToast, IonSegment, IonSegmentButton, IonProgressBar,
  IonRadioGroup, IonRadio
} from '@ionic/react';
import {
  walletOutline, cardOutline, addOutline, cashOutline,
  phonePortraitOutline, receiptOutline, checkmarkCircleOutline,
  closeOutline, trashOutline, shieldCheckmarkOutline
} from 'ionicons/icons';
import './CustomerPayments.css';

const MOCK_TRANSACTIONS = [
  { id: '1', description: 'Ride to Acacia Mall', date: '2026-07-26', amount: 8500, type: 'debit' },
  { id: '2', description: 'Top-up via MTN Money', date: '2026-07-25', amount: 50000, type: 'credit' },
  { id: '3', description: 'Ride to Uganda Road', date: '2026-07-25', amount: 3200, type: 'debit' },
  { id: '4', description: 'Referral Bonus', date: '2026-07-24', amount: 5000, type: 'credit' },
  { id: '5', description: 'Ride to Entebbe Road', date: '2026-07-23', amount: 12000, type: 'debit' },
];

const SAVED_METHODS = [
  { id: 'mtn1', type: 'mtn', name: 'MTN Mobile Money', number: '0772****123', isDefault: true, icon: '📱' },
  { id: 'airtel1', type: 'airtel', name: 'Airtel Money', number: '0753****456', isDefault: false, icon: '📱' },
];

const RiderPayments: React.FC = () => {
  const [segment, setSegment] = useState<'methods' | 'history'>('methods');
  const [showAddModal, setShowAddModal] = useState(false);
  const [balance] = useState(45000);
  const [transactions] = useState(MOCK_TRANSACTIONS);
  const [savedMethods, setSavedMethods] = useState(SAVED_METHODS);
  const [newProvider, setNewProvider] = useState<'mtn' | 'airtel'>('mtn');
  const [newNumber, setNewNumber] = useState('');
  const [loading] = useState(false);
  const [presentToast] = useIonToast();

  const handleAddMethod = () => {
    if (!newNumber || newNumber.length < 10) {
      presentToast({ message: 'Please enter a valid phone number', color: 'warning', duration: 2000 });
      return;
    }
    const newMethod = {
      id: `${newProvider}_${Date.now()}`,
      type: newProvider,
      name: newProvider === 'mtn' ? 'MTN Mobile Money' : 'Airtel Money',
      number: newNumber.slice(0, 4) + '****' + newNumber.slice(-3),
      isDefault: false,
      icon: '📱'
    };
    setSavedMethods([...savedMethods, newMethod]);
    setShowAddModal(false);
    setNewNumber('');
    presentToast({ message: 'Payment method added! ✅', color: 'success', duration: 2000 });
  };

  const removeMethod = (id: string) => {
    setSavedMethods(savedMethods.filter(m => m.id !== id));
    presentToast({ message: 'Payment method removed', color: 'medium', duration: 1500 });
  };

  const setDefault = (id: string) => {
    setSavedMethods(savedMethods.map(m => ({ ...m, isDefault: m.id === id })));
    presentToast({ message: 'Default payment method updated', color: 'success', duration: 1500 });
  };

  const handleTopUp = (amount: number) => {
    presentToast({ message: `Top-up of UGX ${amount.toLocaleString()} initiated! Check your phone for prompt.`, color: 'success', duration: 3000 });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#080c14'} as any}>
        <IonToolbar style={{'--background': '#080c14', '--color': '#fff'} as any}>
          <IonButtons slot="start"><IonBackButton defaultHref="/customer/home" style={{color: '#fff'}} /></IonButtons>
          <IonTitle style={{color: '#fff'}}>Wallet & Payments</IonTitle>
        </IonToolbar>
        <IonToolbar style={{'--background': '#080c14'} as any}>
          <IonSegment value={segment} onIonChange={(e) => setSegment(e.detail.value as any)}>
            <IonSegmentButton value="methods"><IonLabel style={{ fontSize: 12, color: '#D1D5DB' }}>Methods</IonLabel></IonSegmentButton>
            <IonSegmentButton value="history"><IonLabel style={{ fontSize: 12, color: '#D1D5DB' }}>History</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="payments-container customer-payments-wrapper" style={{'--background': 'var(--nav-bg)'} as any}>
        {loading && <IonProgressBar type="indeterminate" color="warning" />}

        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          {/* Balance Card */}
          <div className="wallet-balance-card">
            <div style={{ textAlign: 'center', padding: '0 22px' }}>
              <IonIcon icon={walletOutline} className="wallet-icon" />
              <p className="wallet-label">NAVIGO Wallet Balance</p>
              <h1 className="wallet-amount">UGX {balance.toLocaleString()}</h1>
              <div className="topup-actions">
                <IonButton expand="block" size="small" onClick={() => handleTopUp(10000)}
                  className="topup-btn btn-orange">
                  + UGX 10,000
                </IonButton>
                <IonButton expand="block" size="small" onClick={() => handleTopUp(50000)}
                  className="topup-btn btn-green">
                  + UGX 50,000
                </IonButton>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '16px 0 0' }}>You'll receive a prompt on your phone to confirm</p>
            </div>
          </div>

          {segment === 'methods' ? (
            <>
              <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>💳 Saved Payment Methods</h3>
              {savedMethods.map(method => (
                <div key={method.id} onClick={() => setDefault(method.id)}
                  className={`payment-method-card ${method.isDefault ? 'default' : ''}`}>
                  <span className="method-icon">{method.icon}</span>
                  <div className="method-details">
                    <h4>{method.name}</h4>
                    <p>{method.number}</p>
                  </div>
                  {method.isDefault && <IonBadge color="success" style={{ fontSize: 9 }}>Default</IonBadge>}
                  <IonButton fill="clear" size="small" color="danger" onClick={(e) => { e.stopPropagation(); removeMethod(method.id); }}>
                    <IonIcon icon={trashOutline} />
                  </IonButton>
                </div>
              ))}
              <IonButton expand="block" fill="outline" onClick={() => setShowAddModal(true)}
                style={{ '--border-color': 'rgba(255,255,255,0.12)', '--color': '#fff', '--border-radius': 16, marginTop: 8, fontSize: 13, height: 48 } as any}>
                <IonIcon icon={addOutline} slot="start" /> Add Mobile Money
              </IonButton>
              <div className="security-banner">
                <IonIcon icon={shieldCheckmarkOutline} style={{ color: '#2D6A4F', fontSize: 16 }} />
                <p>Your payment info is encrypted and secure. We never store your full card details.</p>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>📋 Transaction History</h3>
              {transactions.map(t => (
                <div key={t.id} className="transaction-card">
                  <div className={`transaction-icon ${t.type === 'credit' ? 'icon-credit' : 'icon-debit'}`}>
                    <IonIcon icon={t.type === 'credit' ? addOutline : receiptOutline} style={{ fontSize: 14 }} />
                  </div>
                  <div className="transaction-info">
                    <h4>{t.description}</h4>
                    <p>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <span className={`transaction-amount ${t.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}>
                    {t.type === 'credit' ? '+' : '-'}UGX {t.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Add Method Modal */}
        <IonModal isOpen={showAddModal} onDidDismiss={() => setShowAddModal(false)}>
          <div className="glass-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="modal-title">Add Mobile Money</h2>
              <IonButton fill="clear" onClick={() => setShowAddModal(false)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 22 }} /></IonButton>
            </div>
            <p className="modal-subtitle">Select provider and enter your phone number</p>

            <IonRadioGroup value={newProvider} onIonChange={e => setNewProvider(e.detail.value)}>
              <IonItem className="modal-input-item" lines="none">
                <IonLabel>MTN Mobile Money</IonLabel>
                <IonRadio slot="start" value="mtn" />
              </IonItem>
              <IonItem className="modal-input-item" lines="none">
                <IonLabel>Airtel Money</IonLabel>
                <IonRadio slot="start" value="airtel" />
              </IonItem>
            </IonRadioGroup>

            <IonItem className="modal-input-item">
              <IonLabel position="stacked">Phone Number</IonLabel>
              <IonInput type="tel" value={newNumber} onIonInput={e => setNewNumber(e.detail.value!)} placeholder="0772000000" maxlength={12} />
            </IonItem>

            <IonButton expand="block" onClick={handleAddMethod} className="payment-add-btn">
              <IonIcon icon={checkmarkCircleOutline} slot="start" /> Add & Verify
            </IonButton>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RiderPayments;