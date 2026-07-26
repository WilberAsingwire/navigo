import React, { useState } from 'react';
import { IonButton, IonIcon, IonModal, IonToast, IonItem, IonLabel, IonInput } from '@ionic/react';
import { warningOutline, callOutline, locationOutline, shieldCheckmarkOutline, sendOutline } from 'ionicons/icons';

interface SOSButtonProps {
  userLocation?: { lat: number; lng: number };
  userName?: string;
  userPhone?: string;
}

const EMERGENCY_CONTACTS = [
  { name: 'Uganda Police', number: '999', emoji: '🚔' },
  { name: 'Ambulance', number: '112', emoji: '🚑' },
  { name: 'NAVIGO Support', number: '+256800100200', emoji: '🛡️' },
];

const SOSButton: React.FC<SOSButtonProps> = ({ userLocation, userName, userPhone }) => {
  const [showModal, setShowModal] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleSOS = (contact?: typeof EMERGENCY_CONTACTS[0]) => {
    const number = contact?.number || '999';
    const locationMsg = userLocation 
      ? `📍 My location: https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}` 
      : '';
    const message = customMessage || `🚨 EMERGENCY! ${userName || 'NAVIGO User'} needs help! ${locationMsg} Phone: ${userPhone || 'Unknown'}`;
    
    window.open(`tel:${number}`, '_system');
    setToastMsg(`🚨 Alert sent to ${contact?.name || 'Police'}! Help is on the way.`);
    setShowToast(true);
    setShowModal(false);
  };

  return (
    <>
      <IonButton 
        expand="block" 
        color="danger" 
        style={{ '--border-radius': '12px', height: 50, fontWeight: 'bold', fontSize: 16, margin: '8px 0' } as any}
        onClick={() => setShowModal(true)}
      >
        <IonIcon icon={warningOutline} slot="start" />
        🆘 EMERGENCY SOS
      </IonButton>

      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <div style={{ padding: 24, background: '#111', color: '#fff8f0', height: '100%' }}>
          <h2 style={{ color: '#ff5252', textAlign: 'center', marginBottom: 8 }}>🚨 Emergency Alert</h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,248,240,0.6)', fontSize: 14, marginBottom: 20 }}>
            Select who to contact immediately
          </p>

          {userLocation && (
            <div style={{ background: 'rgba(255,82,82,0.1)', borderRadius: 12, padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IonIcon icon={locationOutline} style={{ color: '#ff5252', fontSize: 20 }} />
              <span style={{ fontSize: 12 }}>📍 Location will be shared</span>
            </div>
          )}

          <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 8, color: '#fff' } as any}>
            <IonLabel position="stacked" style={{ color: 'rgba(255,248,240,0.7)' }}>Custom Message (optional)</IonLabel>
            <IonInput 
              value={customMessage} 
              onIonInput={e => setCustomMessage(e.detail.value!)} 
              placeholder="e.g., I'm at Acacia Mall, need help!" 
              style={{ color: '#fff' }}
            />
          </IonItem>

          {EMERGENCY_CONTACTS.map(contact => (
            <IonButton 
              key={contact.number}
              expand="block" 
              color="danger" 
              fill="outline"
              style={{ '--border-radius': 10, marginBottom: 8 } as any}
              onClick={() => handleSOS(contact)}
            >
              {contact.emoji} {contact.name} — {contact.number}
            </IonButton>
          ))}

          <IonButton expand="block" fill="clear" onClick={() => setShowModal(false)} style={{ marginTop: 8 }}>
            Cancel
          </IonButton>
        </div>
      </IonModal>

      <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={4000} position="top" color="danger" />
    </>
  );
};

export default SOSButton;