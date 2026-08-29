import React from 'react';
import { IonButton, IonIcon, IonText, IonSpinner } from '@ionic/react';
import { carOutline, timerOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { Haptic } from '../services/HapticService';
import './DriverAlertOverlay.css';

const VEHICLE_LABELS: Record<string, string> = {
  boda: 'Boda Boda', economy: 'NAVIGO Go', go: 'NAVIGO Go', comfort: 'NAVIGO Comfort', xl: 'NAVIGO XL',
};

interface DriverAlertOverlayProps {
  request: any;
  isAccepting?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const DriverAlertOverlay: React.FC<DriverAlertOverlayProps> = ({ request, isAccepting, onAccept, onReject }) => {

  // Play alert sound on mount
  React.useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.loop = true;
    const playPromise = audio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => console.log('Audio playback blocked by browser'));
    }

    Haptic.alert();

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const vehicleLabel = VEHICLE_LABELS[request?.vehicleType] || request?.vehicleType || 'Ride';
  const fare = Number(request?.fare) || 0;
  const distanceKm = request?.distanceKm;

  return (
    <div className="driver-alert-overlay">
      <div className="alert-container">
        <div className="alert-visual">
          <div className="pulsing-ring"></div>
          <div className="visual-content">
            <IonIcon icon={carOutline} className="main-icon" />
          </div>
        </div>

        <div className="alert-body">
          <IonBadge color="warning" className="alert-badge">NEW REQUEST</IonBadge>
          <h1 className="alert-title">Ride Request!</h1>

          <div className="request-details">
            <div className="detail-item">
              <IonIcon icon={timerOutline} />
              <span>{distanceKm ? <><strong>{distanceKm} km</strong> away</> : 'Distance unavailable'}</span>
            </div>
            <div className="detail-item">
              <IonIcon icon={carOutline} />
              <span><strong>{vehicleLabel}</strong> Ride</span>
            </div>
            <div className="detail-item">
              <IonIcon icon={checkmarkCircleOutline} />
              <span>Earnings: <strong>{fare ? `UGX ${fare.toLocaleString()}` : 'Fetching…'}</strong></span>
            </div>
          </div>

          <div className="alert-actions">
            <IonButton
              fill="outline"
              color="danger"
              className="btn-reject"
              onClick={onReject}
              disabled={isAccepting}
            >
              <IonIcon slot="start" icon={closeCircleOutline} />
              Reject
            </IonButton>
            <IonButton
              className="btn-accept"
              onClick={onAccept}
              disabled={isAccepting}
            >
              {isAccepting ? <IonSpinner name="crescent" /> : <>Accept Ride <IonIcon slot="end" icon={checkmarkCircleOutline} /></>}
            </IonButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple IonBadge replacement since I can't import it easily here without full Ionic context
const IonBadge = ({ color, className, children }: any) => (
  <span className={`badge ${color} ${className}`}>{children}</span>
);

export default DriverAlertOverlay;
