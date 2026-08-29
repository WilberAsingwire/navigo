import React from 'react';
import { IonButton, IonIcon, IonText } from '@ionic/react';
import { carOutline, timerOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { Haptic } from '../services/HapticService';
import './DriverAlertOverlay.css';

interface DriverAlertOverlayProps {
  request: any;
  onAccept: () => void;
  onReject: () => void;
}

const DriverAlertOverlay: React.FC<DriverAlertOverlayProps> = ({ request, onAccept, onReject }) => {

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
            <div className="detail-item">
              <IonIcon icon={timerOutline} />
              <span>Starts in <strong>{request?.duration || '2'} mins</strong></span>
            </div>
            <div className="detail-item">
              <IonIcon icon={carOutline} />
              <span><strong>{request?.vehicleType || 'Boda'}</strong> Ride</span>
            </div>
            <div className="detail-item">
              <IonIcon icon={checkmarkCircleOutline} />
              <span>Earnings: <strong>UGX {request?.fare || '8,500'}</strong></span>
            </div>
          </div>

          <div className="alert-actions">
            <IonButton
              fill="outline"
              color="danger"
              className="btn-reject"
              onClick={onReject}
            >
              <IonIcon slot="start" icon={closeCircleOutline} />
              Reject
            </IonButton>
            <IonButton
              className="btn-accept"
              onClick={onAccept}
            >
              Accept Ride <IonIcon slot="end" icon={checkmarkCircleOutline} />
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
