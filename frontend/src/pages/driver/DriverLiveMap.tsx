import React, { useEffect, useRef, useState } from 'react';
import { IonButton, IonContent, IonIcon, IonPage, IonSpinner, IonText, IonTitle, IonToolbar } from '@ionic/react';
import { arrowBackOutline, locateOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import NavigoMap from '../../components/NavigoMap';
import api from '../../services/api';
import socketService from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';

const isValid = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const DriverLiveMap: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const socket = socketService.connect(user.id);

    if (!('geolocation' in navigator)) {
      setError('This device does not provide location services.');
      return;
    }

    const onSuccess = (p: GeolocationPosition) => {
      const lat = p.coords.latitude;
      const lng = p.coords.longitude;
      if (!isValid(lat, lng)) return;
      setPosition({ lat, lng });
      setError('');
      api.post('/drivers/location', { lat, lng }).catch(() => { /* map still works locally */ });
    };

    const onError = (e: GeolocationPositionError) => {
      if (e.code === e.PERMISSION_DENIED) {
        setError('Location permission is disabled. Enable location access to show your position.');
      } else {
        setError('Unable to get your current location. Try again.');
      }
    };

    watchRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      void socket;
    };
  }, [user]);

  return (
    <IonPage>
      <IonToolbar style={{ '--background': '#080c14', '--color': '#fff' } as any}>
        <IonButton slot="start" fill="clear" onClick={() => history.goBack()} aria-label="Back">
          <IonIcon icon={arrowBackOutline} />
        </IonButton>
        <IonTitle>Live Map</IonTitle>
      </IonToolbar>

      <IonContent fullscreen style={{ '--background': '#080c14' } as any}>
        <div style={{ position: 'relative', height: 'calc(100vh - 56px)', minHeight: 420 }}>
          <NavigoMap
            userLocation={position}
            height="100%"
            showRoute={false}
            showNearbyDrivers={false}
            followUser={true}
            showControls={true}
            error={error || undefined}
          />

          {!position && !error && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{
                padding: '14px 18px', borderRadius: 12,
                background: 'rgba(8,12,20,.9)', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <IonSpinner name="crescent" color="warning" />
                <IonText>Getting your location…</IonText>
              </div>
            </div>
          )}

          <IonButton
            color="light"
            style={{ position: 'absolute', right: 14, bottom: 18, zIndex: 1100 }}
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(
                p => {
                  if (isValid(p.coords.latitude, p.coords.longitude)) {
                    setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
                    setError('');
                  }
                },
                () => setError('Location permission or GPS signal is unavailable.'),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
              );
            }}
          >
            <IonIcon icon={locateOutline} slot="start" />
            Recenter
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DriverLiveMap;
