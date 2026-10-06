import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle,
  IonButton, IonIcon, IonBadge, IonToast, IonAvatar,
  IonModal, IonSpinner, IonNote
} from '@ionic/react';
import {
  flagOutline, locationOutline, checkmarkCircleOutline, callOutline,
  chatbubbleEllipsesOutline, navigateOutline, closeOutline,
  cashOutline, timeOutline, starOutline,
  mapOutline, paperPlaneOutline, carOutline
} from 'ionicons/icons';
import InitialsAvatar from '../../components/InitialsAvatar';
import EmptyState from '../../components/EmptyState';
import { useHistory } from 'react-router-dom';
import NavigoMap from '../../components/NavigoMap';
import SOSButton from '../../components/SOSButton';
import ChatBox from '../../components/ChatBox';
import socketService from '../../services/socketService';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './DriverActiveRide.css';

interface Ride {
  id: string;
  status: 'accepted' | 'arrived' | 'ongoing' | 'completed' | 'cancelled';
  serviceType: 'ride' | 'delivery';
  vehicleType: string;
  fareFinal: number;
  distanceKm?: number;
  durationMin?: number;
  pickup: { address: string; lat: number; lng: number };
  destination: { address: string; lat: number; lng: number };
  packageDetails?: string;
  receiverName?: string;
  receiverPhone?: string;
}

const VEHICLE_LABELS: Record<string, string> = {
  boda: 'Boda Boda', go: 'NAVIGO Go', economy: 'NAVIGO Go', comfort: 'NAVIGO Comfort', xl: 'NAVIGO XL',
};

const PHASE_TITLES: Record<string, string> = {
  accepted: 'Heading to Pickup',
  arrived: 'At Pickup',
  ongoing: 'Trip in Progress',
  completed: 'Trip Completed',
  cancelled: 'Trip Cancelled',
};

/**
 * Real driver trip screen: current ride from the API, shares the driver's
 * live location over the socket, and drives the accepted → arrived →
 * ongoing → completed lifecycle (which also triggers settlement).
 */
const DriverActiveRide: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ride, setRide] = useState<Ride | null>(null);
  const [rider, setRider] = useState<any>(null);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [sendingStatus, setSendingStatus] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const rideIdRef = useRef<string | null>(null);

  const loadRide = async () => {
    try {
      const res = await api.get('/rides/active');
      if (res.data.ride && res.data.isDriver) {
        setRide(res.data.ride);
        setRider(res.data.rider || null);
        rideIdRef.current = res.data.ride.id;
      } else {
        setRide(null);
      }
    } catch (e) {
      console.error('Failed to load active trip:', e);
      setRide(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRide();
  }, []);

  // Share live location while a trip is active
  useEffect(() => {
    if (!ride || !user) return;
    if (['completed', 'cancelled'].includes(ride.status)) return;
    if (!('geolocation' in navigator)) return;

    const socket = socketService.connect(user.id);
    if (rideIdRef.current) {
      socket.emit('join-ride-room', { rideId: rideIdRef.current });
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        setPos([p.coords.latitude, p.coords.longitude]);
        if (rideIdRef.current) {
          socket.emit('update-location', {
            rideId: rideIdRef.current,
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            userId: user.id,
          });
        }
      },
      () => { /* location unavailable — trip still works without live tracking */ },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [ride?.id, ride?.status, user]);

  // Rider cancellations while on this screen
  useEffect(() => {
    if (!user) return;
    const socket = socketService.connect(user.id);
    const onCancelled = (data: { rideId: string; message: string }) => {
      if (data.rideId !== rideIdRef.current) return;
      setToastMsg(data.message);
      setShowToast(true);
      setRide(prev => (prev ? { ...prev, status: 'cancelled' } : prev));
    };
    socket.on('ride-cancelled', onCancelled);
    return () => socket.off('ride-cancelled', onCancelled);
  }, [user]);

  const sendStatus = (status: 'arrived' | 'ongoing' | 'completed') => {
    if (!ride || sendingStatus) return;
    const socket = socketService.getSocket();
    if (!socket) {
      setToastMsg('Not connected to the server');
      setShowToast(true);
      return;
    }
    setSendingStatus(true);
    socket.emit('update-status', { rideId: ride.id, status });
    setRide(prev => (prev ? { ...prev, status } : prev));
    setSendingStatus(false);

    if (status === 'completed') {
      setToastMsg('Trip completed — settling payment');
      setShowToast(true);
      setTimeout(() => history.push('/driver/home'), 2600);
    }
  };

  const openNavigation = () => {
    if (!ride) return;
    const from = pos || [ride.pickup.lat, ride.pickup.lng];
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${from[0]},${from[1]}&destination=${ride.destination.lat},${ride.destination.lng}`, '_blank');
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent style={{ '--background': 'var(--nav-bg)' } as any} className="driver-active-wrapper">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
            <IonSpinner name="crescent" color="warning" />
            <p style={{ color: 'var(--nav-text-secondary)' }}>Loading trip details…</p>
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
            <IonTitle style={{ color: 'var(--nav-text)' }}>Active Trip</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent style={{ '--background': 'var(--nav-bg)' } as any} className="driver-active-wrapper">
          <EmptyState
            icon={<IonIcon icon={carOutline} style={{ fontSize: 26 }} />}
            title="No active trip"
            subtitle="When you accept a ride it will show up here with navigation and trip controls."
            actionLabel="Go online"
            onAction={() => history.push('/driver/home')}
          />
        </IonContent>
      </IonPage>
    );
  }

  const phase = ride.status;
  const isDelivery = ride.serviceType === 'delivery';
  const riderName = rider?.fullName || 'Customer';
  const fare = ride.fareFinal || 0;
  const commission = Math.round(fare * 0.1);
  const net = fare - commission;

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{ '--background': '#080c14' } as any}>
        <IonToolbar style={{ '--background': '#080c14', '--color': '#fff' }}>
          <IonTitle style={{ color: 'var(--nav-text)' }}>{PHASE_TITLES[phase] || 'Trip'}</IonTitle>
          <IonBadge
            slot="end"
            color={phase === 'completed' ? 'success' : phase === 'cancelled' ? 'danger' : 'warning'}
            style={{ marginRight: 10, textTransform: 'capitalize' }}
          >
            {phase}
          </IonBadge>
        </IonToolbar>
      </IonHeader>

      <IonContent className="driver-active-container driver-active-wrapper" style={{ '--background': 'var(--nav-bg)' } as any}>
        {/* Map */}
        <div style={{ height: '40vh', width: '100%', position: 'relative' }}>
          <NavigoMap
            userLocation={pos ? { lat: pos[0], lng: pos[1] } : ride.pickup}
            destination={ride.destination}
            height="100%"
            showRoute={true}
            driverType={(ride.vehicleType as any) || 'go'}
            followUser={false}
          />
          <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 1000 }}>
            <IonButton color="light" size="small" onClick={openNavigation}>
              <IonIcon icon={navigateOutline} slot="start" /> Navigate
            </IonButton>
          </div>
        </div>

        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          {/* Rider Card */}
          <div className="rider-info-card" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--nav-card-soft)', border: '1px solid var(--nav-border)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <IonAvatar style={{ width: 48, height: 48 }}>
              <InitialsAvatar name={riderName} size={48} />
            </IonAvatar>
            <div className="rider-details" style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--nav-text)', margin: 0, fontSize: 15 }}>{riderName}</h3>
              <p style={{ color: 'var(--nav-text-secondary)', margin: '2px 0 0', fontSize: 12 }}>
                <IonIcon icon={starOutline} style={{ color: '#FFC107', fontSize: 12 }} /> {Number(rider?.rating || 5).toFixed(1)} • {VEHICLE_LABELS[ride.vehicleType] || ride.vehicleType}
              </p>
            </div>
            <div className="rider-actions">
              {rider?.phone && (
                <IonButton fill="clear" size="small" onClick={() => window.open(`tel:${rider.phone}`)}>
                  <IonIcon icon={callOutline} style={{ color: 'var(--navigo-orange)', fontSize: 20 }} />
                </IonButton>
              )}
              <IonButton fill="clear" size="small" onClick={() => setShowChat(true)}>
                <IonIcon icon={chatbubbleEllipsesOutline} style={{ color: 'var(--navigo-orange)', fontSize: 20 }} />
              </IonButton>
            </div>
          </div>

          {/* Delivery info */}
          {isDelivery && (
            <div style={{ background: 'rgba(77,166,255,0.08)', border: '1px solid rgba(77,166,255,0.25)', borderRadius: 12, padding: 12, marginBottom: 12, display: 'flex', gap: 10 }}>
              <IonIcon icon={paperPlaneOutline} style={{ color: '#4DA6FF', fontSize: 20 }} />
              <div>
                <p style={{ color: 'var(--nav-text)', margin: 0, fontSize: 13, fontWeight: 600 }}>
                  Delivering: {ride.packageDetails || 'Package'}
                </p>
                <p style={{ color: 'var(--nav-text-secondary)', margin: '2px 0 0', fontSize: 12 }}>
                  Hand to: {ride.receiverName || '—'} {ride.receiverPhone ? `• ${ride.receiverPhone}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Route Details */}
          <div className="route-info-card" style={{ background: 'var(--nav-card-soft)', border: '1px solid var(--nav-border)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div className="route-point" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <IonIcon icon={locationOutline} style={{ color: '#2D6A4F', fontSize: 16 }} />
              <span style={{ color: 'var(--nav-text)', fontSize: 13 }}>Pickup: {ride.pickup.address}</span>
            </div>
            <div className="route-point" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <IonIcon icon={flagOutline} style={{ color: '#E85D75', fontSize: 16 }} />
              <span style={{ color: 'var(--nav-text)', fontSize: 13 }}>{isDelivery ? 'Deliver to:' : 'Destination:'} {ride.destination.address}</span>
            </div>
          </div>

          {/* Trip Stats */}
          <div className="trip-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div className="trip-stat-card" style={{ background: 'var(--nav-card-soft)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <IonIcon icon={mapOutline} style={{ color: '#4da6ff', fontSize: 18, marginBottom: 4 }} />
              <p className="trip-stat-value" style={{ color: 'var(--nav-text)', margin: 2, fontSize: 14, fontWeight: 700 }}>{ride.distanceKm ? `${ride.distanceKm} km` : '—'}</p>
              <span className="trip-stat-label" style={{ color: 'var(--nav-text-dim)', fontSize: 9 }}>Distance</span>
            </div>
            <div className="trip-stat-card" style={{ background: 'var(--nav-card-soft)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <IonIcon icon={timeOutline} style={{ color: '#FFC107', fontSize: 18, marginBottom: 4 }} />
              <p className="trip-stat-value" style={{ color: 'var(--nav-text)', margin: 2, fontSize: 14, fontWeight: 700 }}>{ride.durationMin ? `${ride.durationMin} min` : '—'}</p>
              <span className="trip-stat-label" style={{ color: 'var(--nav-text-dim)', fontSize: 9 }}>Duration</span>
            </div>
            <div className="trip-stat-card" style={{ background: 'var(--nav-card-soft)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <IonIcon icon={cashOutline} style={{ color: '#00e676', fontSize: 18, marginBottom: 4 }} />
              <p className="trip-stat-value" style={{ color: 'var(--nav-text)', margin: 2, fontSize: 14, fontWeight: 700 }}>UGX {fare.toLocaleString()}</p>
              <span className="trip-stat-label" style={{ color: 'var(--nav-text-dim)', fontSize: 9 }}>Fare</span>
            </div>
          </div>

          {/* Earnings Breakdown */}
          <div className="earnings-card" style={{ background: 'var(--nav-bg-raised)', border: '1px solid var(--nav-border-strong)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <h4 className="earnings-title" style={{ color: 'var(--nav-text)', margin: '0 0 10px', fontSize: 14 }}>
              <IonIcon icon={cashOutline} style={{ color: 'var(--navigo-orange)' }} /> Your Earnings
            </h4>
            <div className="earnings-row" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nav-text-secondary)', fontSize: 12, marginBottom: 6 }}>
              <span>Total Fare</span><span style={{ color: 'var(--nav-text)' }}>UGX {fare.toLocaleString()}</span>
            </div>
            <div className="earnings-row" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nav-text-secondary)', fontSize: 12, marginBottom: 10 }}>
              <span>NAVIGO Commission (10%)</span><span style={{ color: '#E85D75' }}>-UGX {commission.toLocaleString()}</span>
            </div>
            <div className="earnings-total" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--nav-border-strong)', paddingTop: 10 }}>
              <span style={{ color: 'var(--nav-text)', fontWeight: 700, fontSize: 14 }}>You Earn</span>
              <span style={{ color: '#00e676', fontWeight: 800, fontSize: 16 }}>UGX {net.toLocaleString()}</span>
            </div>
          </div>

          {/* Lifecycle actions */}
          {phase === 'accepted' && (
            <IonButton expand="block" className="main-action-btn" onClick={() => sendStatus('arrived')} disabled={sendingStatus} style={{ borderRadius: 12, marginBottom: 10, fontWeight: 700 }}>
              {sendingStatus ? <IonSpinner name="crescent" /> : <IonIcon icon={checkmarkCircleOutline} slot="start" />} I have arrived
            </IonButton>
          )}
          {phase === 'arrived' && (
            <IonButton expand="block" className="main-action-btn" onClick={() => sendStatus('ongoing')} disabled={sendingStatus} style={{ borderRadius: 12, marginBottom: 10, fontWeight: 700 }}>
              {sendingStatus ? <IonSpinner name="crescent" /> : <IonIcon icon={navigateOutline} slot="start" />} Start trip
            </IonButton>
          )}
          {phase === 'ongoing' && (
            <IonButton expand="block" className="complete-action-btn" onClick={() => sendStatus('completed')} disabled={sendingStatus} style={{ borderRadius: 12, marginBottom: 10, fontWeight: 700 }}>
              {sendingStatus ? <IonSpinner name="crescent" /> : <IonIcon icon={checkmarkCircleOutline} slot="start" />} Complete trip
            </IonButton>
          )}

          {phase === 'completed' && (
            <div className="completion-state" style={{ textAlign: 'center', padding: '10px 0' }}>
              <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 48, color: '#10B981' }} />
              <h3 style={{ color: 'var(--nav-text)' }}>Trip Completed!</h3>
              <p style={{ color: 'var(--nav-text-secondary)', fontSize: 13 }}>You earned <span style={{ color: '#00e676', fontWeight: 700 }}>UGX {net.toLocaleString()}</span></p>
              <IonNote style={{ color: 'var(--nav-text-dim)' }}>Wallet payments settle automatically.</IonNote>
            </div>
          )}

          {phase === 'cancelled' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: 48, color: '#EF4444' }} />
              <h3 style={{ color: 'var(--nav-text)' }}>Trip Cancelled</h3>
              <IonButton expand="block" fill="outline" color="light" onClick={() => history.push('/driver/home')} style={{ borderRadius: 12 }}>
                Back to home
              </IonButton>
            </div>
          )}

          {['accepted', 'arrived', 'ongoing'].includes(phase) && (
            <SOSButton
              userLocation={pos ? { lat: pos[0], lng: pos[1] } : { lat: ride.pickup.lat, lng: ride.pickup.lng }}
              userName={user?.fullName || 'Driver'}
              userPhone={user?.phone}
              variant="compact"
            />
          )}
        </div>

        {/* Chat with real ride data */}
        <IonModal isOpen={showChat} onDidDismiss={() => setShowChat(false)}>
          <ChatBox
            rideId={ride.id}
            currentUser={{ id: user?.id || '', name: user?.fullName || 'You', role: 'driver' }}
            otherUser={{ id: rider?.id || '', name: riderName, role: 'customer' }}
            onClose={() => setShowChat(false)}
          />
        </IonModal>

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} position="top" />
      </IonContent>
    </IonPage>
  );
};

export default DriverActiveRide;
