import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { carOutline, timerOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { Haptic } from '../services/HapticService';
import './DriverAlertOverlay.css';

interface DriverAlertOverlayProps {
  request: any;
  onAccept: () => void;
  onReject: () => void;
  isAccepting?: boolean;
  error?: string | null;
}

const VEHICLE_LABELS: Record<string, string> = {
  boda: 'Boda Boda', go: 'NAVIGO Go', economy: 'NAVIGO Go', comfort: 'NAVIGO Comfort', xl: 'NAVIGO XL',
};

const DriverAlertOverlay: React.FC<DriverAlertOverlayProps> = ({ request, onAccept, onReject, isAccepting = false, error = null }) => {

  // Play alert sound on mount
  React.useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.loop = true;
    audio.play().catch(e => console.log('Audio playback blocked by browser'));

    Haptic.alert();

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

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
            {request?.pickup?.address && (
              <div className="detail-item">
                <IonIcon icon={timerOutline} />
                <span>Pickup: <strong>{request.pickup.address}</strong></span>
              </div>
            )}
            <div className="detail-item">
              <IonIcon icon={carOutline} />
              <span><strong>{VEHICLE_LABELS[(request?.vehicleType || '').toLowerCase()] || 'NAVIGO'}</strong> ride</span>
            </div>
            {request?.fare != null && (
              <div className="detail-item">
                <IonIcon icon={checkmarkCircleOutline} />
                <span>Fare: <strong>UGX {Number(request.fare).toLocaleString()}</strong></span>
              </div>
            )}
          </div>

          {error && (
            <div style={{ color: '#EF4444', fontSize: 13, fontWeight: 600, margin: '8px 0', textAlign: 'center' }}>
              {error}
            </div>
          )}

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
              disabled={isAccepting || !!error}
            >
              {isAccepting ? 'Accepting…' : 'Accept Ride'} <IonIcon slot="end" icon={checkmarkCircleOutline} />
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
