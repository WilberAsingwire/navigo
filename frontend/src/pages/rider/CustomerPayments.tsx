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
  { id: '3', description: 'Ride to Kampala Road', date: '2026-07-25', amount: 3200, type: 'debit' },
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
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle>Wallet & Payments</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={segment} onIonChange={(e) => setSegment(e.detail.value as any)}>
            <IonSegmentButton value="methods"><IonLabel style={{ fontSize: 12 }}>Methods</IonLabel></IonSegmentButton>
            <IonSegmentButton value="history"><IonLabel style={{ fontSize: 12 }}>History</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        {loading && <IonProgressBar type="indeterminate" color="warning" />}

        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          {/* Balance Card */}
          <IonCard style={{ background: 'linear-gradient(135deg, #1B4965, #0d2137)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
            <IonCardContent style={{ textAlign: 'center', padding: 22 }}>
              <IonIcon icon={walletOutline} style={{ fontSize: 30, color: '#FF6B35', marginBottom: 6 }} />
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>NAVIGO Wallet Balance</p>
              <h1 style={{ color: '#fff', fontSize: 34, fontWeight: 800, margin: '6px 0' }}>
                UGX {balance.toLocaleString()}
              </h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <IonButton expand="block" size="small" onClick={() => handleTopUp(10000)} 
                  style={{ '--background': '#FF6B35', '--border-radius': 10, fontSize: 12, fontWeight: 600 } as any}>
                  + UGX 10,000
                </IonButton>
                <IonButton expand="block" size="small" onClick={() => handleTopUp(50000)} 
                  style={{ '--background': '#2D6A4F', '--border-radius': 10, fontSize: 12, fontWeight: 600 } as any}>
                  + UGX 50,000
                </IonButton>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '8px 0 0' }}>You'll receive a prompt on your phone to confirm</p>
            </IonCardContent>
          </IonCard>

          {segment === 'methods' ? (
            <>
              <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>💳 Saved Payment Methods</h3>
              {savedMethods.map(method => (
                <div key={method.id} onClick={() => setDefault(method.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, background: method.isDefault ? 'rgba(45,106,79,0.08)' : 'rgba(255,255,255,0.03)',
                    borderRadius: 12, padding: 12, marginBottom: 8, cursor: 'pointer',
                    border: method.isDefault ? '1px solid rgba(45,106,79,0.2)' : '1px solid transparent'
                  }}>
                  <span style={{ fontSize: 24 }}>{method.icon}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#fff', fontSize: 13 }}>{method.name}</span>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2 }}>{method.number}</p>
                  </div>
                  {method.isDefault && <IonBadge color="success" style={{ fontSize: 9 }}>Default</IonBadge>}
                  <IonButton fill="clear" size="small" color="danger" onClick={(e) => { e.stopPropagation(); removeMethod(method.id); }}>
                    <IonIcon icon={trashOutline} />
                  </IonButton>
                </div>
              ))}
              <IonButton expand="block" fill="outline" onClick={() => setShowAddModal(true)}
                style={{ '--border-color': 'rgba(255,255,255,0.12)', '--color': '#fff', '--border-radius': 12, marginTop: 8, fontSize: 13 } as any}>
                <IonIcon icon={addOutline} slot="start" /> Add Mobile Money
              </IonButton>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 10 }}>
                <IonIcon icon={shieldCheckmarkOutline} style={{ color: '#2D6A4F', fontSize: 16 }} />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0 }}>Your payment info is encrypted and secure. We never store your full card details.</p>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>📋 Transaction History</h3>
              {transactions.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)',
                  borderRadius: 10, padding: 10, marginBottom: 6
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.type === 'credit' ? 'rgba(45,106,79,0.15)' : 'rgba(232,93,117,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IonIcon icon={t.type === 'credit' ? addOutline : receiptOutline} style={{ color: t.type === 'credit' ? '#2D6A4F' : '#E85D75', fontSize: 14 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#fff', fontSize: 12 }}>{t.description}</span>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, margin: 2 }}>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <span style={{ color: t.type === 'credit' ? '#00e676' : '#ff5252', fontWeight: 700, fontSize: 13 }}>
                    {t.type === 'credit' ? '+' : '-'}UGX {t.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Add Method Modal */}
        <IonModal isOpen={showAddModal} onDidDismiss={() => setShowAddModal(false)}>
          <div style={{ padding: 20, background: '#0d1117', color: '#fff', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Add Mobile Money</h2>
              <IonButton fill="clear" onClick={() => setShowAddModal(false)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 22 }} /></IonButton>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 }}>Select provider and enter your phone number</p>
            
            <IonRadioGroup value={newProvider} onIonChange={e => setNewProvider(e.detail.value)}>
              <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 8, color: '#fff' } as any} lines="none">
                <IonLabel>MTN Mobile Money</IonLabel>
                <IonRadio slot="start" value="mtn" />
              </IonItem>
              <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 12, color: '#fff' } as any} lines="none">
                <IonLabel>Airtel Money</IonLabel>
                <IonRadio slot="start" value="airtel" />
              </IonItem>
            </IonRadioGroup>

            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 16, color: '#fff' } as any}>
              <IonLabel position="stacked">Phone Number</IonLabel>
              <IonInput type="tel" value={newNumber} onIonInput={e => setNewNumber(e.detail.value!)} placeholder="0772000000" maxlength={12} />
            </IonItem>

            <IonButton expand="block" onClick={handleAddMethod} style={{ '--background': '#FF6B35', '--border-radius': 12, fontWeight: 700 } as any}>
              <IonIcon icon={checkmarkCircleOutline} slot="start" /> Add & Verify
            </IonButton>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RiderPayments;