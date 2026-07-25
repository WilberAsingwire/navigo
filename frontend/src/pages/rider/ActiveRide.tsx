import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButton, IonIcon, IonBadge, IonToast, IonAvatar,
  IonChip, IonLabel, IonModal, IonText, IonNote,
  IonRadioGroup, IonRadio, IonItem
} from '@ionic/react';
import {
  callOutline, chatbubbleOutline, starOutline,
  shieldCheckmarkOutline, closeOutline, mapOutline,
  locationOutline, navigateOutline, timeOutline,
  cashOutline, phonePortraitOutline, cardOutline,
  checkmarkCircleOutline, walletOutline
} from 'ionicons/icons';
import ChatBox from '../../components/ChatBox';
import './ActiveRide.css';

const MOCK_DRIVER = {
  name: 'John K.',
  rating: 4.8,
  vehicle: 'Toyota Prius',
  plate: 'UBA 123A',
  color: 'White',
  phone: '+256772000000',
  photo: 'https://ui-avatars.com/api/?name=John+K&background=FF6B35&color=fff&size=128',
};

type RideStatus = 'arriving' | 'arrived' | 'started' | 'payment_pending' | 'completed';
type PaymentMethod = 'cash' | 'mtn' | 'airtel' | 'card';

const ActiveRide: React.FC = () => {
  const history = useHistory();
  const [rideStatus, setRideStatus] = useState<RideStatus>('arriving');
  const [eta, setEta] = useState(3);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [fare, setFare] = useState(8500);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

  // Simulate driver getting closer
  useEffect(() => {
    if (rideStatus !== 'arriving') return;
    const interval = setInterval(() => {
      setEta(prev => {
        if (prev <= 1) { clearInterval(interval); setRideStatus('arrived'); return 0; }
        return prev - 1;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [rideStatus]);

  const handleCall = () => window.open(`tel:${MOCK_DRIVER.phone}`, '_system');

  const handleCancel = () => {
    setShowCancelModal(false);
    setToastMsg('Ride cancelled');
    setShowToast(true);
    setTimeout(() => history.push('/rider/home'), 1500);
  };

  const handleStartRide = () => {
    setRideStatus('started');
    setToastMsg('🚗 Ride started! Enjoy your trip.');
    setShowToast(true);
  };

  const handleArriveDestination = () => {
    setRideStatus('payment_pending');
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = () => {
    if (paymentMethod === 'cash' && !cashReceived) {
      setToastMsg('Please confirm cash payment was received');
      setShowToast(true);
      return;
    }
    setShowPaymentModal(false);
    setRideStatus('completed');
    setToastMsg('✅ Payment confirmed! Ride completed.');
    setShowToast(true);
    setTimeout(() => setShowRating(true), 1500);
  };

  const handleSubmitRating = () => {
    setShowRating(false);
    setToastMsg(`⭐ ${rating} star rating submitted! Thank you.`);
    setShowToast(true);
    setTimeout(() => history.push('/rider/home'), 2000);
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case 'arriving': return `Driver arriving in ${eta} min`;
      case 'arrived': return 'Driver has arrived!';
      case 'started': return 'Trip in progress...';
      case 'payment_pending': return 'Payment pending...';
      case 'completed': return 'Trip completed ✅';
    }
  };

  const getStatusColor = () => {
    switch (rideStatus) {
      case 'arriving': return 'warning';
      case 'arrived': return 'success';
      case 'started': return 'primary';
      case 'payment_pending': return 'warning';
      case 'completed': return 'medium';
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Active Ride</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="active-ride-content">
        {/* Map */}
        <div className="ride-map">
          <div className="map-placeholder">
            <IonIcon icon={mapOutline} className="map-bg-icon" />
            <div className="map-overlay">
              <div className="driver-marker">
                <IonAvatar className="driver-avatar-marker">
                  <img src={MOCK_DRIVER.photo} alt={MOCK_DRIVER.name} />
                </IonAvatar>
                <div className="pulse-ring" />
              </div>
              <div className="route-line" />
              <div className="rider-marker">
                <div className="rider-dot" />
              </div>
            </div>
            <div className="map-status-badge">
              <IonBadge color={getStatusColor()}>{getStatusText()}</IonBadge>
            </div>
          </div>
        </div>

        {/* Driver Info */}
        <div className="driver-info-section">
          <div className="driver-card">
            <IonAvatar>
              <img src={MOCK_DRIVER.photo} alt={MOCK_DRIVER.name} />
            </IonAvatar>
            <div className="driver-details">
              <h3>{MOCK_DRIVER.name}</h3>
              <p><IonIcon icon={starOutline} /> {MOCK_DRIVER.rating} • {MOCK_DRIVER.vehicle}</p>
              <p className="plate">{MOCK_DRIVER.plate} • {MOCK_DRIVER.color}</p>
            </div>
            <div className="driver-actions">
              <IonButton fill="clear" size="small" onClick={handleCall}>
                <IonIcon icon={callOutline} slot="icon-only" />
              </IonButton>
              <IonButton fill="clear" size="small" onClick={() => setShowChat(true)}>
                <IonIcon icon={chatbubbleOutline} slot="icon-only" />
              </IonButton>
            </div>
          </div>
        </div>

        {/* Fare Display */}
        <div className="fare-display">
          <div className="fare-card">
            <IonIcon icon={cashOutline} />
            <div>
              <IonLabel>Total Fare</IonLabel>
              <h2>UGX {fare.toLocaleString()}</h2>
            </div>
            <IonBadge color={paymentMethod === 'cash' ? 'warning' : 'primary'}>
              {paymentMethod === 'cash' ? '💵 Cash' : paymentMethod === 'mtn' ? '📱 MTN' : paymentMethod === 'airtel' ? '📱 Airtel' : '💳 Card'}
            </IonBadge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ride-actions">
          {rideStatus === 'arrived' && (
            <IonButton expand="block" className="start-btn" onClick={handleStartRide}>
              Start Ride
            </IonButton>
          )}
          {rideStatus === 'started' && (
            <IonButton expand="block" className="complete-btn" onClick={handleArriveDestination}>
              Arrived at Destination
            </IonButton>
          )}
          {(rideStatus === 'arriving' || rideStatus === 'arrived') && (
            <>
              <IonButton expand="block" className="safety-btn" fill="outline">
                <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                Emergency
              </IonButton>
              <IonButton expand="block" fill="clear" color="danger" size="small" onClick={() => setShowCancelModal(true)}>
                Cancel Ride
              </IonButton>
            </>
          )}
          {rideStatus === 'completed' && !showRating && (
            <IonButton expand="block" className="rate-btn" onClick={() => setShowRating(true)}>
              Rate Your Driver
            </IonButton>
          )}
        </div>

        {/* Chat Modal */}
        <IonModal isOpen={showChat} onDidDismiss={() => setShowChat(false)}>
          <ChatBox
            rideId="ride_001"
            currentUser={{
              id: 'rider_001',
              name: 'You',
              role: 'rider'
            }}
            otherUser={{
              id: 'driver_001',
              name: MOCK_DRIVER.name,
              role: 'driver',
              photo: MOCK_DRIVER.photo
            }}
            onClose={() => setShowChat(false)}
          />
        </IonModal>

        {/* Rating Modal */}
        <IonModal isOpen={showRating} onDidDismiss={() => setShowRating(false)}>
          <div className="rating-modal">
            <h2>⭐ Rate Your Driver</h2>
            <p>How was your ride with {MOCK_DRIVER.name}?</p>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map(star => (
                <IonIcon
                  key={star}
                  icon={starOutline}
                  className={`star-icon ${star <= rating ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
            <IonButton expand="block" onClick={handleSubmitRating} disabled={rating === 0}>
              Submit Rating
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setShowRating(false)}>
              Skip
            </IonButton>
          </div>
        </IonModal>

        {/* Payment Modal */}
        <IonModal isOpen={showPaymentModal} onDidDismiss={() => setShowPaymentModal(false)}>
          <div className="payment-modal">
            <h2>💳 Payment</h2>
            <div className="payment-fare-display">
              <h1>UGX {fare.toLocaleString()}</h1>
              <IonNote>Total fare for this trip</IonNote>
            </div>

            <h4>Select Payment Method</h4>
            <IonRadioGroup value={paymentMethod} onIonChange={e => setPaymentMethod(e.detail.value)}>
              <IonItem lines="none" className="payment-radio-item" button onClick={() => setPaymentMethod('cash')}>
                <IonIcon icon={cashOutline} slot="start" className="pay-icon cash-icon" />
                <IonLabel>Cash</IonLabel>
                <IonRadio slot="end" value="cash" />
              </IonItem>
              <IonItem lines="none" className="payment-radio-item" button onClick={() => setPaymentMethod('mtn')}>
                <IonIcon icon={phonePortraitOutline} slot="start" className="pay-icon mtn-icon" />
                <IonLabel>MTN Mobile Money</IonLabel>
                <IonRadio slot="end" value="mtn" />
              </IonItem>
              <IonItem lines="none" className="payment-radio-item" button onClick={() => setPaymentMethod('airtel')}>
                <IonIcon icon={phonePortraitOutline} slot="start" className="pay-icon airtel-icon" />
                <IonLabel>Airtel Money</IonLabel>
                <IonRadio slot="end" value="airtel" />
              </IonItem>
            </IonRadioGroup>

            {/* Cash Confirmation */}
            {paymentMethod === 'cash' && (
              <div className="cash-confirmation">
                <div className="cash-notice">
                  <IonIcon icon={cashOutline} />
                  <p>Please pay <strong>UGX {fare.toLocaleString()}</strong> directly to the driver.</p>
                </div>
                <IonItem lines="none" className="cash-checkbox-item" button onClick={() => setCashReceived(!cashReceived)}>
                  <IonIcon 
                    icon={cashReceived ? checkmarkCircleOutline : walletOutline} 
                    slot="start" 
                    color={cashReceived ? 'success' : 'medium'} 
                  />
                  <IonLabel>I have paid the driver</IonLabel>
                  <IonIcon 
                    icon={checkmarkCircleOutline} 
                    slot="end" 
                    color={cashReceived ? 'success' : 'medium'}
                    style={{ opacity: cashReceived ? 1 : 0.3 }}
                  />
                </IonItem>
              </div>
            )}

            <IonButton expand="block" className="confirm-payment-btn" onClick={handlePaymentComplete}>
              <IonIcon icon={checkmarkCircleOutline} slot="start" />
              Confirm Payment
            </IonButton>
          </div>
        </IonModal>

        {/* Cancel Modal */}
        <IonModal isOpen={showCancelModal} onDidDismiss={() => setShowCancelModal(false)}>
          <div className="cancel-modal">
            <h2>Cancel Ride?</h2>
            <p>Are you sure you want to cancel this ride?</p>
            <IonButton expand="block" color="danger" onClick={handleCancel}>Yes, Cancel</IonButton>
            <IonButton expand="block" fill="outline" onClick={() => setShowCancelModal(false)}>No, Keep Ride</IonButton>
          </div>
        </IonModal>

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} position="top" />
      </IonContent>
    </IonPage>
  );
};

export default ActiveRide;