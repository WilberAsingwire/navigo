import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButton, IonIcon, IonBadge, IonToast, IonAvatar,
  IonModal, IonSpinner
} from '@ionic/react';
import {
  callOutline, chatbubbleOutline, starOutline,
  cashOutline, checkmarkCircleOutline, closeOutline,
  shieldCheckmarkOutline, locationOutline, flagOutline,
  carOutline, paperPlaneOutline, navigateOutline
} from 'ionicons/icons';
import ChatBox from '../../components/ChatBox';
import SOSButton from '../../components/SOSButton';
import NavigoMap from '../../components/NavigoMap';
import EmptyState from '../../components/EmptyState';
import InitialsAvatar from '../../components/InitialsAvatar';
import socketService from '../../services/socketService';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './ActiveRide.css';

interface Ride {
  id: string;
  status: 'requested' | 'accepted' | 'arrived' | 'ongoing' | 'completed' | 'cancelled';
  serviceType: 'ride' | 'delivery';
  vehicleType: string;
  fareFinal: number;
  tip?: number;
  pickup: { address: string; lat: number; lng: number };
  destination: { address: string; lat: number; lng: number };
  packageDetails?: string;
  receiverName?: string;
  receiverPhone?: string;
  requestedAt: string;
}

const VEHICLE_LABELS: Record<string, string> = {
  boda: 'Boda Boda', go: 'NAVIGO Go', economy: 'NAVIGO Go', comfort: 'NAVIGO Comfort', xl: 'NAVIGO XL',
};

/**
 * Real active-ride screen: pulls the rider's current ride from the API,
 * tracks the driver live over the socket, and lets the rider cancel or rate.
 */
const ActiveRide: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ride, setRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<any>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [tip, setTip] = useState(0);
  const [isTipping, setIsTipping] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const rideIdRef = useRef<string | null>(null);

  const loadRide = async () => {
    try {
      const res = await api.get('/rides/active');
      if (res.data.ride) {
        setRide(res.data.ride);
        setDriver(res.data.driver || null);
        const driverLat = Number(res.data.driver?.currentLat);
        const driverLng = Number(res.data.driver?.currentLng);
        if (Number.isFinite(driverLat) && Number.isFinite(driverLng)) {
          setDriverPos({ lat: driverLat, lng: driverLng });
        }
        rideIdRef.current = res.data.ride.id;
      } else {
        setRide(null);
      }
    } catch (e) {
      console.error('Failed to load active ride:', e);
      setRide(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRide();
  }, []);

  // Live driver tracking + status updates + cancellations.
  // The socket is primary; REST is a 10s safety net when the connection drops.
  useEffect(() => {
    if (!user) return;
    const socket = socketService.connect(user.id);
    const joinRide = () => {
      if (rideIdRef.current) socket.emit('join-ride-room', { rideId: rideIdRef.current });
    };
    joinRide();

    const onStatus = (data: { rideId: string; status: string }) => {
      if (data.rideId !== rideIdRef.current) return;
      setRide(prev => (prev ? { ...prev, status: data.status as Ride['status'] } : prev));
      if (data.status === 'accepted') { setToastMsg('Your driver has accepted'); setShowToast(true); }
      if (data.status === 'arrived') { setToastMsg('Your driver has arrived at pickup'); setShowToast(true); }
      if (data.status === 'ongoing') { setToastMsg('Your ride has started'); setShowToast(true); }
      if (data.status === 'completed') { setToastMsg('Ride completed'); setShowToast(true); }
    };

    const onLocation = (data: { rideId?: string; lat: number; lng: number }) => {
      if (data.rideId && data.rideId !== rideIdRef.current) return;
      const lat = Number(data.lat);
      const lng = Number(data.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) setDriverPos({ lat, lng });
    };

    const onCancelled = (data: { rideId: string; message: string }) => {
      if (data.rideId !== rideIdRef.current) return;
      setToastMsg(data.message); setShowToast(true);
      setTimeout(() => history.push('/customer/home'), 2200);
    };

    socket.on('connect', joinRide);
    socket.on('status-changed', onStatus);
    socket.on('location-updated', onLocation);
    socket.on('ride-cancelled', onCancelled);

    const fallbackTimer = window.setInterval(async () => {
      if (socket.connected || !rideIdRef.current) return;
      try {
        const res = await api.get('/rides/active');
        const nextRide = res.data?.ride;
        if (nextRide?.id === rideIdRef.current) {
          setRide(prev => (prev ? { ...prev, status: nextRide.status } : prev));
          const lat = Number(res.data?.driver?.currentLat);
          const lng = Number(res.data?.driver?.currentLng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) setDriverPos({ lat, lng });
        }
      } catch { /* keep last known state */ }
    }, 10000);

    return () => {
      socket.off('connect', joinRide);
      socket.off('status-changed', onStatus);
      socket.off('location-updated', onLocation);
      socket.off('ride-cancelled', onCancelled);
      window.clearInterval(fallbackTimer);
    };
  }, [user, history, ride?.id]);
  const handleTip = async (amount: number) => {
    if (!ride) return;
    setIsTipping(true);
    try {
      const res = await api.post(`/rides/${ride.id}/tip`, { amount });
      setTip(amount);
      setToastMsg(`Tip of UGX ${amount.toLocaleString()} sent`);
      setShowToast(true);
    } catch (e: any) {
      setToastMsg(e.response?.data?.message || 'Failed to send tip');
      setShowToast(true);
    } finally {
      setIsTipping(false);
    }
  };

  const handleCancel = async () => {
    if (!ride || cancelling) return;
    setCancelling(true);
    try {
      await api.post(`/rides/${ride.id}/cancel`);
      setToastMsg('Ride cancelled');
      setShowToast(true);
      setTimeout(() => history.push('/customer/home'), 1500);
    } catch (e: any) {
      setToastMsg(e.response?.data?.message || 'Could not cancel the ride');
      setShowToast(true);
      setCancelling(false);
    }
  };

  const openNavigation = () => {
    if (!ride || !driverPos) return;
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${driverPos.lat},${driverPos.lng}&destination=${ride.destination.lat},${ride.destination.lng}`, '_blank');
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent style={{ '--background': 'var(--nav-bg)' } as any} className="active-ride-wrapper">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
            <IonSpinner name="crescent" color="warning" />
            <p style={{ color: 'var(--nav-text-secondary)' }}>Loading your ride…</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!ride) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border" style={{ '--background': '#080c14' } as any}>
          <IonToolbar style={{ '--background': '#080c14', '--color': '#fff' }}>
            <IonTitle style={{ color: 'var(--nav-text)' }}>My Ride</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent style={{ '--background': 'var(--nav-bg)' } as any} className="active-ride-wrapper">
          <EmptyState
            icon={<IonIcon icon={carOutline} style={{ fontSize: 26 }} />}
            title="No active ride"
            subtitle="Once you book a ride it will show up here with live driver tracking."
            actionLabel="Book a ride"
            onAction={() => history.push('/customer/book')}
          />
        </IonContent>
      </IonPage>
    );
  }

  const isDelivery = ride.serviceType === 'delivery';
  const phase = ride.status;
  const driverName = driver?.fullName || 'Your driver';
  const vehicleLabel = VEHICLE_LABELS[ride.vehicleType] || ride.vehicleType;
  const canCancel = ['requested', 'accepted', 'arrived'].includes(phase);

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{ '--background': '#080c14' } as any}>
        <IonToolbar style={{ '--background': '#080c14', '--color': '#fff' }}>
          <IonTitle style={{ color: 'var(--nav-text)' }}>
            {isDelivery ? 'My Delivery' : 'My Ride'}
          </IonTitle>
          <IonBadge
            slot="end"
            color={phase === 'completed' ? 'success' : phase === 'cancelled' ? 'danger' : phase === 'ongoing' ? 'primary' : 'warning'}
            style={{ marginRight: 10, textTransform: 'capitalize' }}
          >
            {phase === 'requested' ? 'Matching' : phase === 'completed' ? 'Completed' : phase}
          </IonBadge>
        </IonToolbar>
      </IonHeader>

      <IonContent className="active-ride-content active-ride-wrapper" style={{ '--background': 'var(--nav-bg)' } as any}>
        <div style={{ height: '280px', width: '100%', position: 'relative' }}>
          <NavigoMap
            userLocation={ride.pickup}
            pickupLocation={ride.pickup}
            driverLocation={['accepted', 'arrived', 'ongoing'].includes(phase) ? driverPos : null}
            routeOrigin={driverPos}
            destination={phase === 'accepted' ? ride.pickup : phase === 'ongoing' ? ride.destination : null}
            height="280px"
            showRoute={!!driverPos && (phase === 'accepted' || phase === 'ongoing')}
            driverType={(ride.vehicleType as any) || 'go'}
            followUser={false}
            showNearbyDrivers={phase === 'requested'}
          />
          <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 1000 }}>
            <IonButton color="light" size="small" onClick={openNavigation}>
              <IonIcon icon={navigateOutline} slot="start" /> Navigate
            </IonButton>
          </div>
        </div>

        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          {/* Driver card (once assigned) */}
          {(driver || phase !== 'requested') && (
            <div className="driver-card">
              <IonAvatar style={{ width: 48, height: 48 }}>
                <InitialsAvatar name={driverName} size={48} />
              </IonAvatar>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: 'var(--nav-text)', margin: 0, fontSize: 15 }}>{driverName}</h3>
                <p style={{ color: 'var(--nav-text-secondary)', margin: '2px 0 0', fontSize: 12 }}>
                  {driver?.plate ? `${driver.plate} • ` : ''}{vehicleLabel}
                  {driver?.rating ? ` · ${Number(driver.rating).toFixed(1)}★` : ''}
                </p>
              </div>
              {driver?.phone && (
                <IonButton fill="clear" size="small" onClick={() => window.open(`tel:${driver.phone}`)}>
                  <IonIcon icon={callOutline} style={{ color: 'var(--navigo-orange)', fontSize: 20 }} />
                </IonButton>
              )}
              <IonButton fill="clear" size="small" onClick={() => setShowChat(true)}>
                <IonIcon icon={chatbubbleOutline} style={{ color: 'var(--navigo-orange)', fontSize: 20 }} />
              </IonButton>
            </div>
          )}

          {phase === 'requested' && (
            <div style={{ textAlign: 'center', padding: '10px 0 14px' }}>
              <IonIcon icon={carOutline} style={{ fontSize: 36, color: 'var(--navigo-orange)', marginBottom: 8 }} />
              <h3 style={{ color: 'var(--nav-text)', margin: '0 0 4px' }}>Finding your driver…</h3>
              <p style={{ color: 'var(--nav-text-secondary)', fontSize: 13, margin: 0 }}>We're alerting available drivers near you.</p>
            </div>
          )}

          {/* Delivery receiver info */}
          {isDelivery && (
            <div style={{ background: 'rgba(77,166,255,0.08)', border: '1px solid rgba(77,166,255,0.25)', borderRadius: 12, padding: 12, marginBottom: 12, display: 'flex', gap: 10 }}>
              <IonIcon icon={paperPlaneOutline} style={{ color: '#4DA6FF', fontSize: 20 }} />
              <div>
                <p style={{ color: 'var(--nav-text)', margin: 0, fontSize: 13, fontWeight: 600 }}>
                  Delivering: {ride.packageDetails || 'Package'}
                </p>
                <p style={{ color: 'var(--nav-text-secondary)', margin: '2px 0 0', fontSize: 12 }}>
                  To: {ride.receiverName || '—'} {ride.receiverPhone ? `• ${ride.receiverPhone}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Route */}
          <div className="route-card">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2D6A4F', border: '2px solid #fff' }} />
                <div style={{ width: 2, height: 26, background: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--navigo-orange)', border: '2px solid #fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 10 }}>
                  <p style={{ color: 'var(--nav-text-secondary)', margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Pickup</p>
                  <p style={{ color: 'var(--nav-text)', margin: '2px 0 0', fontSize: 14 }}>{ride.pickup.address}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--nav-text-secondary)', margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{isDelivery ? 'Deliver to' : 'Destination'}</p>
                  <p style={{ color: 'var(--nav-text)', margin: '2px 0 0', fontSize: 14 }}>{ride.destination.address}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--nav-text-secondary)', margin: 0, fontSize: 10 }}>Fare</p>
                <p style={{ color: 'var(--navigo-orange)', margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>UGX {ride.fareFinal?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Status-driven actions */}
          {phase === 'ongoing' && (
            <div className="tip-banner">
              <p style={{ color: 'var(--navigo-orange)', margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>Support your driver</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {[1000, 2000, 5000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => handleTip(amt)}
                    disabled={isTipping}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,107,53,0.4)',
                      background: tip === amt ? 'var(--navigo-orange)' : 'transparent',
                      color: tip === amt ? '#fff' : 'var(--navigo-orange)',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {isTipping && tip === amt ? <IonSpinner name="crescent" style={{ width: 12, height: 12 }} /> : `UGX ${amt / 1000}k`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'completed' && (
            <div style={{ textAlign: 'center', padding: '6px 0 12px' }}>
              <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 44, color: '#10B981' }} />
              <h3 style={{ color: 'var(--nav-text)' }}>Ride completed</h3>
              <p style={{ color: 'var(--nav-text-secondary)', fontSize: 13 }}>Paid: UGX {ride.fareFinal?.toLocaleString()}</p>
              {!showRating && (
                <IonButton expand="block" color="warning" onClick={() => setShowRating(true)} style={{ borderRadius: 12 }}>
                  <IonIcon icon={starOutline} slot="start" /> Rate your driver
                </IonButton>
              )}
            </div>
          )}

          {phase === 'cancelled' && (
            <div style={{ textAlign: 'center', padding: '6px 0 12px' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: 44, color: '#EF4444' }} />
              <h3 style={{ color: 'var(--nav-text)' }}>Ride cancelled</h3>
              <IonButton expand="block" fill="outline" color="light" onClick={() => history.push('/customer/home')} style={{ borderRadius: 12 }}>
                Back to home
              </IonButton>
            </div>
          )}

          <SOSButton
            userLocation={driverPos || { lat: ride.pickup.lat, lng: ride.pickup.lng }}
            userName={user?.fullName || 'Customer'}
            userPhone={user?.phone}
            variant="compact"
          />

          {canCancel && (
            <IonButton expand="block" fill="clear" color="danger" onClick={handleCancel} disabled={cancelling} style={{ borderRadius: 12 }}>
              {cancelling ? <IonSpinner name="crescent" /> : 'Cancel ride'}
            </IonButton>
          )}
        </div>

        {/* Chat with real ride data */}
        <IonModal isOpen={showChat} onDidDismiss={() => setShowChat(false)}>
          <ChatBox
            rideId={ride.id}
            currentUser={{ id: user?.id || '', name: user?.fullName || 'You', role: 'customer' }}
            otherUser={{ id: driver?.id || '', name: driverName, role: 'driver' }}
            onClose={() => setShowChat(false)}
          />
        </IonModal>

        {/* Rating */}
        <IonModal isOpen={showRating} onDidDismiss={() => setShowRating(false)}>
          <div style={{ padding: 24, background: 'var(--nav-bg-soft)', color: 'var(--nav-text)', height: '100%', textAlign: 'center' }}>
            <h2 style={{ margin: '12px 0 4px' }}>Rate {driverName.split(' ')[0]}</h2>
            <p style={{ color: 'var(--nav-text-secondary)', fontSize: 13 }}>How was your {isDelivery ? 'delivery' : 'ride'}?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '20px 0' }}>
              {[1, 2, 3, 4, 5].map(s => (
                <IonIcon
                  key={s}
                  icon={starOutline}
                  style={{ fontSize: 36, color: s <= rating ? '#FFC107' : 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
                  onClick={() => setRating(s)}
                />
              ))}
            </div>
            <IonButton expand="block" color="warning" onClick={async () => {
              if (!ride || rating === 0) return;
              try {
                await api.post(`/rides/${ride.id}/rate`, { rating, tip });
                setToastMsg('Thanks for rating!');
                setShowToast(true);
                setShowRating(false);
                setTimeout(() => history.push('/customer/home'), 1500);
              } catch (e: any) {
                setToastMsg(e.response?.data?.message || 'Failed to submit rating');
                setShowToast(true);
              }
            }} disabled={rating === 0} style={{ borderRadius: 12 } as any}>
              Submit rating
            </IonButton>
            <IonButton expand="block" fill="clear" color="medium" style={{ marginTop: 8 }} onClick={() => history.push('/customer/home')}>
              Skip
            </IonButton>
          </div>
        </IonModal>

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} position="top" />
      </IonContent>
    </IonPage>
  );
};

export default ActiveRide;
