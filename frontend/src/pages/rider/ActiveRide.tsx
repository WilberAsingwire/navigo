import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButton, IonIcon, IonBadge, IonToast, IonAvatar,
  IonLabel, IonModal, IonNote, IonRadioGroup, IonRadio, IonItem
} from '@ionic/react';
import {
  callOutline, chatbubbleOutline, starOutline,
  cashOutline, phonePortraitOutline, checkmarkCircleOutline, walletOutline
} from 'ionicons/icons';
import ChatBox from '../../components/ChatBox';
import SOSButton from '../../components/SOSButton';
import NavigoMap from '../../components/NavigoMap';
import { processPayment, checkPaymentStatus } from '../../services/paymentService';
import './ActiveRide.css';

const MOCK_DRIVER = { name: 'John K.', rating: 4.8, vehicle: 'Toyota Prius', plate: 'UBA 123A', color: 'White', phone: '+256772000000', photo: 'https://ui-avatars.com/api/?name=John+K&background=FF6B35&color=fff&size=128' };
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
  const [fare] = useState(8500);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [driverPos, setDriverPos] = useState({ lat: 0.3500, lng: 32.5850 });
  const [remainingDist, setRemainingDist] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    if (rideStatus !== 'arriving') return;
    const interval = setInterval(() => {
      setDriverPos(prev => ({ lat: prev.lat + (0.3476 - prev.lat) * 0.08, lng: prev.lng + (32.5825 - prev.lng) * 0.08 }));
      setEta(prev => { if (prev <= 1) { clearInterval(interval); setRideStatus('arrived'); return 0; } return Math.max(1, prev - 1); });
    }, 3000);
    return () => clearInterval(interval);
  }, [rideStatus]);

  const handleCancel = () => { setShowCancelModal(false); setToastMsg('Ride cancelled'); setShowToast(true); setTimeout(() => history.push('/rider/home'), 1500); };
  const handleStartRide = () => { setRideStatus('started'); setToastMsg('🚗 Ride started!'); setShowToast(true); };
  const handleArriveDestination = () => { setRideStatus('payment_pending'); setShowPaymentModal(true); };

  const handlePaymentComplete = async () => {
    if (paymentMethod === 'cash' && !cashReceived) { setToastMsg('Please confirm cash payment'); setShowToast(true); return; }
    if (paymentMethod === 'cash') {
      const result = await processPayment(fare, '', 'cash');
      if (result.success) { setShowPaymentModal(false); setRideStatus('completed'); setToastMsg('✅ Ride completed!'); setShowToast(true); setTimeout(() => setShowRating(true), 1500); }
      return;
    }
    setIsProcessing(true);
    const userPhone = JSON.parse(localStorage.getItem('navigo_user') || '{}')?.phone || '0772000000';
    const result = await processPayment(fare, userPhone, paymentMethod);
    if (result.success) {
      setToastMsg(result.message); setShowToast(true);
      if (paymentMethod === 'card') {
  setShowPaymentModal(false);
  setRideStatus('completed');
  setShowRating(true);
  return;
}
const status = await checkPaymentStatus(result.transactionId!, paymentMethod as 'mtn' | 'airtel');
      if (status.status === 'completed') { setShowPaymentModal(false); setRideStatus('completed'); setShowRating(true); }
    } else { setToastMsg(result.message); setShowToast(true); }
    setIsProcessing(false);
  };

  const handleSubmitRating = () => { setShowRating(false); setToastMsg(`⭐ ${rating} stars! Thank you.`); setShowToast(true); setTimeout(() => history.push('/rider/home'), 2000); };

  return (
    <IonPage>
      <IonHeader className="ion-no-border"><IonToolbar><IonTitle>Active Ride</IonTitle></IonToolbar></IonHeader>
      <IonContent className="active-ride-content">
        <NavigoMap userLocation={{ lat: 0.3476, lng: 32.5825 }} driverLocation={driverPos} destination={{ lat: 0.3550, lng: 32.5850 }} height="280px" showRoute={true} driverType="car" onDistanceChange={(d, t) => { setRemainingDist(d); setRemainingTime(t); }} />
        {remainingDist > 0 && <div style={{ textAlign: 'center', color: '#4da6ff', fontSize: 13, padding: '6px 0' }}>📍 {remainingDist} km remaining • 🕐 ~{remainingTime} min</div>}
        
        <div className="driver-info-section">
          <div className="driver-card">
            <IonAvatar><img src={MOCK_DRIVER.photo} alt={MOCK_DRIVER.name} /></IonAvatar>
            <div className="driver-details"><h3>{MOCK_DRIVER.name}</h3><p><IonIcon icon={starOutline} /> {MOCK_DRIVER.rating} • {MOCK_DRIVER.vehicle}</p><p className="plate">{MOCK_DRIVER.plate} • {MOCK_DRIVER.color}</p></div>
            <div className="driver-actions">
              <IonButton fill="clear" size="small" onClick={() => window.open(`tel:${MOCK_DRIVER.phone}`, '_system')}><IonIcon icon={callOutline} slot="icon-only" /></IonButton>
              <IonButton fill="clear" size="small" onClick={() => setShowChat(true)}><IonIcon icon={chatbubbleOutline} slot="icon-only" /></IonButton>
            </div>
          </div>
        </div>

        <div className="fare-display"><div className="fare-card"><IonIcon icon={cashOutline} /><div><IonLabel>Total Fare</IonLabel><h2>UGX {fare.toLocaleString()}</h2></div><IonBadge color={paymentMethod === 'cash' ? 'warning' : 'primary'}>{paymentMethod === 'cash' ? '💵 Cash' : paymentMethod === 'mtn' ? '📱 MTN' : paymentMethod === 'airtel' ? '📱 Airtel' : '💳 Card'}</IonBadge></div></div>

        <div className="ride-actions">
          {rideStatus === 'arrived' && <IonButton expand="block" className="start-btn" onClick={handleStartRide}>Start Ride</IonButton>}
          {rideStatus === 'started' && <IonButton expand="block" className="complete-btn" onClick={handleArriveDestination}>Arrived at Destination</IonButton>}
          {(rideStatus === 'arriving' || rideStatus === 'arrived') && <><SOSButton userLocation={{ lat: 0.3150, lng: 32.5820 }} userName="Rider" /><IonButton expand="block" fill="clear" color="danger" size="small" onClick={() => setShowCancelModal(true)}>Cancel Ride</IonButton></>}
          {rideStatus === 'completed' && !showRating && <IonButton expand="block" className="rate-btn" onClick={() => setShowRating(true)}>Rate Your Driver</IonButton>}
        </div>

        <IonModal isOpen={showChat} onDidDismiss={() => setShowChat(false)}><ChatBox rideId="ride_001" currentUser={{ id: 'rider_001', name: 'You', role: 'rider' }} otherUser={{ id: 'driver_001', name: MOCK_DRIVER.name, role: 'driver', photo: MOCK_DRIVER.photo }} onClose={() => setShowChat(false)} /></IonModal>

        <IonModal isOpen={showRating} onDidDismiss={() => setShowRating(false)}>
          <div className="rating-modal"><h2>⭐ Rate Your Driver</h2><p>How was your ride?</p><div className="star-rating">{[1,2,3,4,5].map(s => <IonIcon key={s} icon={starOutline} className={`star-icon ${s<=rating?'active':''}`} onClick={()=>setRating(s)} />)}</div><IonButton expand="block" onClick={handleSubmitRating} disabled={rating===0}>Submit</IonButton></div>
        </IonModal>

        <IonModal isOpen={showPaymentModal} onDidDismiss={() => setShowPaymentModal(false)}>
          <div className="payment-modal"><h2>💳 Payment</h2><h1>UGX {fare.toLocaleString()}</h1>
            <IonRadioGroup value={paymentMethod} onIonChange={e=>setPaymentMethod(e.detail.value)}>
              <IonItem lines="none" button onClick={()=>setPaymentMethod('cash')}><IonIcon icon={cashOutline} slot="start"/><IonLabel>Cash</IonLabel><IonRadio slot="end" value="cash"/></IonItem>
              <IonItem lines="none" button onClick={()=>setPaymentMethod('mtn')}><IonIcon icon={phonePortraitOutline} slot="start"/><IonLabel>MTN Money</IonLabel><IonRadio slot="end" value="mtn"/></IonItem>
              <IonItem lines="none" button onClick={()=>setPaymentMethod('airtel')}><IonIcon icon={phonePortraitOutline} slot="start"/><IonLabel>Airtel Money</IonLabel><IonRadio slot="end" value="airtel"/></IonItem>
            </IonRadioGroup>
            {paymentMethod==='cash'&&<div className="cash-confirmation"><IonItem lines="none" button onClick={()=>setCashReceived(!cashReceived)}><IonIcon icon={cashReceived?checkmarkCircleOutline:walletOutline} slot="start" color={cashReceived?'success':'medium'}/><IonLabel>I have paid</IonLabel></IonItem></div>}
            <IonButton expand="block" onClick={handlePaymentComplete} disabled={isProcessing}>{isProcessing?'Processing...':'Confirm Payment'}</IonButton>
          </div>
        </IonModal>

        <IonModal isOpen={showCancelModal} onDidDismiss={()=>setShowCancelModal(false)}><div className="cancel-modal"><h2>Cancel?</h2><IonButton expand="block" color="danger" onClick={handleCancel}>Yes</IonButton></div></IonModal>
        <IonToast isOpen={showToast} onDidDismiss={()=>setShowToast(false)} message={toastMsg} duration={3000} position="top"/>
      </IonContent>
    </IonPage>
  );
};

export default ActiveRide;