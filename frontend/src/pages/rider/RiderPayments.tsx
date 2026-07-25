import React, { useState } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonBackButton, IonItem, IonLabel, IonInput,
  IonButton, IonIcon, IonBadge, IonToast, IonList,
  IonRadioGroup, IonRadio, IonCard, IonCardContent, IonNote
} from '@ionic/react';
import {
  phonePortraitOutline, cashOutline, cardOutline,
  walletOutline, addCircleOutline, checkmarkCircleOutline,
  trashOutline, shieldCheckmarkOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import './RiderPayments.css';

interface PaymentMethod {
  id: string;
  type: 'mtn' | 'airtel' | 'cash' | 'card';
  name: string;
  icon: string;
  number?: string;
  cardLast4?: string;
  isDefault: boolean;
}

const RiderPayments: React.FC = () => {
  const { user } = useAuth();
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showAddMobile, setShowAddMobile] = useState(false);
  const [mobileProvider, setMobileProvider] = useState<'mtn' | 'airtel'>('mtn');
  const [mobileNumber, setMobileNumber] = useState('');

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: 'cash', type: 'cash', name: 'Cash', icon: cashOutline, isDefault: true },
    { id: 'mtn1', type: 'mtn', name: 'MTN Mobile Money', icon: phonePortraitOutline, number: '0772000000', isDefault: false },
    { id: 'airtel1', type: 'airtel', name: 'Airtel Money', icon: phonePortraitOutline, number: '0753000000', isDefault: false },
  ]);

  const addMobileMoney = () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      setToastMsg('Please enter a valid phone number');
      setShowToast(true);
      return;
    }

    const newMethod: PaymentMethod = {
      id: `${mobileProvider}_${Date.now()}`,
      type: mobileProvider,
      name: mobileProvider === 'mtn' ? 'MTN Mobile Money' : 'Airtel Money',
      icon: phonePortraitOutline,
      number: mobileNumber,
      isDefault: false
    };

    setPaymentMethods([...paymentMethods, newMethod]);
    setShowAddMobile(false);
    setMobileNumber('');
    setToastMsg(`${newMethod.name} added successfully!`);
    setShowToast(true);
  };

  const removeMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(m => m.id !== id));
    setToastMsg('Payment method removed');
    setShowToast(true);
  };

  const setDefault = (id: string) => {
    setPaymentMethods(paymentMethods.map(m => ({
      ...m,
      isDefault: m.id === id
    })));
    setToastMsg('Default payment method updated');
    setShowToast(true);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/rider/home" />
          </IonButtons>
          <IonTitle>Payment Methods</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="payments-content">
        <div className="payments-container">
          {/* Balance Card */}
          <IonCard className="balance-card">
            <IonCardContent>
              <div className="balance-header">
                <IonIcon icon={walletOutline} />
                <h3>NAVIGO Wallet</h3>
              </div>
              <h1 className="balance-amount">UGX 0</h1>
              <IonButton size="small" fill="clear" className="add-funds-btn">
                <IonIcon icon={addCircleOutline} slot="start" />
                Add Funds
              </IonButton>
            </IonCardContent>
          </IonCard>

          {/* Saved Methods */}
          <h3>Saved Payment Methods</h3>
          
          <IonList className="payment-list">
            {paymentMethods.map(method => (
              <IonItem key={method.id} className="payment-item" button onClick={() => setDefault(method.id)}>
                <IonIcon icon={method.icon} slot="start" className="payment-icon" />
                <IonLabel>
                  <h3>{method.name}</h3>
                  {method.number && <p>{method.number}</p>}
                  {method.cardLast4 && <p>•••• {method.cardLast4}</p>}
                </IonLabel>
                {method.isDefault && (
                  <IonBadge color="success" slot="end">
                    <IonIcon icon={checkmarkCircleOutline} /> Default
                  </IonBadge>
                )}
                {(method.type === 'mtn' || method.type === 'airtel') && (
                  <IonButton 
                    fill="clear" 
                    color="danger" 
                    slot="end" 
                    onClick={(e) => { e.stopPropagation(); removeMethod(method.id); }}
                  >
                    <IonIcon icon={trashOutline} />
                  </IonButton>
                )}
              </IonItem>
            ))}
          </IonList>

          {/* Add Mobile Money */}
          {!showAddMobile ? (
            <IonButton expand="block" fill="outline" className="add-method-btn" onClick={() => setShowAddMobile(true)}>
              <IonIcon icon={addCircleOutline} slot="start" />
              Add Mobile Money
            </IonButton>
          ) : (
            <div className="add-mobile-form">
              <h4>Add Mobile Money</h4>
              
              <IonRadioGroup value={mobileProvider} onIonChange={e => setMobileProvider(e.detail.value)}>
                <IonItem lines="none" className="radio-item">
                  <IonLabel>MTN Mobile Money</IonLabel>
                  <IonRadio slot="start" value="mtn" />
                </IonItem>
                <IonItem lines="none" className="radio-item">
                  <IonLabel>Airtel Money</IonLabel>
                  <IonRadio slot="start" value="airtel" />
                </IonItem>
              </IonRadioGroup>

              <IonItem className="mobile-input">
                <IonIcon icon={phonePortraitOutline} slot="start" />
                <IonLabel position="stacked">Phone Number</IonLabel>
                <IonInput
                  type="tel"
                  value={mobileNumber}
                  onIonInput={e => setMobileNumber(e.detail.value!)}
                  placeholder="0772000000"
                />
              </IonItem>

              <IonNote color="medium" className="mobile-note">
                You'll receive a prompt on your phone to confirm each payment
              </IonNote>

              <div className="form-buttons">
                <IonButton expand="block" onClick={addMobileMoney}>
                  <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                  Add & Verify
                </IonButton>
                <IonButton expand="block" fill="clear" onClick={() => setShowAddMobile(false)}>
                  Cancel
                </IonButton>
              </div>
            </div>
          )}

          {/* Payment Security Note */}
          <div className="security-note">
            <IonIcon icon={shieldCheckmarkOutline} />
            <p>Your payment information is secure. We use encryption for all transactions.</p>
          </div>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMsg}
          duration={3000}
          position="top"
          color="success"
        />
      </IonContent>
    </IonPage>
  );
};

export default RiderPayments;