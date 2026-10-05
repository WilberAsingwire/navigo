import React, { useState, useEffect, useCallback } from 'react';
import { IonButton, IonIcon, IonModal, IonToast, IonItem, IonLabel, IonInput, IonSpinner, IonToggle } from '@ionic/react';
import { 
  warningOutline, callOutline, locationOutline, shieldCheckmarkOutline, 
  closeOutline, heartOutline, medicalOutline, flameOutline, timeOutline,
  checkmarkCircleOutline, addCircleOutline, starOutline, headsetOutline
} from 'ionicons/icons';

interface SOSButtonProps {
  userLocation?: { lat: number; lng: number };
  userName?: string;
  userPhone?: string;
  variant?: 'full' | 'compact';
}

interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  icon?: string;
  isCustom?: boolean;
}

const DEFAULT_CONTACTS: EmergencyContact[] = [
  { id: 'police', name: 'Uganda Police', number: '999', icon: shieldCheckmarkOutline },
  { id: 'ambulance', name: 'Ambulance', number: '112', icon: medicalOutline },
  { id: 'fire', name: 'Fire Brigade', number: '912', icon: flameOutline },
  { id: 'navigo', name: 'NAVIGO 24/7 Support', number: '+256800100200', icon: headsetOutline },
];

const HOSPITALS = [
  { name: 'Mulago Hospital', number: '+256414554000', distance: '2.5km' },
  { name: 'Nsambya Hospital', number: '+256414267012', distance: '3.8km' },
  { name: 'Kibuli Hospital', number: '+256414257323', distance: '4.2km' },
];

const STORAGE_KEY = 'navigo_emergency_contacts';
const LOCATION_PREF_KEY = 'navigo_sos_location_pref';

const SOSButton: React.FC<SOSButtonProps> = ({ userLocation, userName, userPhone, variant = 'full' }) => {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isActivating, setIsActivating] = useState(false);
  const [savedContacts, setSavedContacts] = useState<EmergencyContact[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [autoShareLocation, setAutoShareLocation] = useState(() => {
    try {
      const pref = localStorage.getItem(LOCATION_PREF_KEY);
      return pref !== null ? pref === 'true' : true;
    } catch { return true; }
  });

  // Persist contacts
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedContacts));
    } catch { /* noop */ }
  }, [savedContacts]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCATION_PREF_KEY, String(autoShareLocation));
    } catch { /* noop */ }
  }, [autoShareLocation]);

  const allContacts = [...DEFAULT_CONTACTS, ...savedContacts];

  const handleSOS = useCallback((contact: EmergencyContact) => {
    const locationMsg = (userLocation && autoShareLocation) 
      ? `📍 https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}` : '';
    const msg = customMessage || `🚨 EMERGENCY! ${userName || 'NAVIGO User'} needs immediate help! ${locationMsg} Contact: ${userPhone || 'Unknown'}`;
    window.open(`tel:${contact.number}`, '_system');
    setToastMsg(`Alert sent to ${contact.name} — help is on the way`);
    setShowToast(true);
    setShowModal(false);
    setIsActivating(false);
    setCountdown(0);
  }, [userLocation, autoShareLocation, customMessage, userName, userPhone]);

  const handleQuickSOS = () => {
    if (countdown > 0) return;
    setIsActivating(true);
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); handleSOS(DEFAULT_CONTACTS[0]); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSOS = () => { setIsActivating(false); setCountdown(0); };

  const addContact = () => {
    if (!newContactName || !newContactNumber) return;
    setSavedContacts([...savedContacts, { 
      id: Date.now().toString(), name: newContactName, number: newContactNumber, 
      icon: starOutline, isCustom: true 
    }]);
    setNewContactName(''); setNewContactNumber(''); setShowAddContact(false);
    setToastMsg('Emergency contact saved');
    setShowToast(true);
  };

  if (variant === 'compact') {
    return (
      <>
        <IonButton expand="block" color="danger" onClick={handleQuickSOS}
          style={{ '--border-radius': '12px', height: 44, fontWeight: 'bold', fontSize: 14 } as any}>
          {isActivating ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IonSpinner name="crescent" /> Calling in {countdown}s...
            </span>
          ) : (
            <><IonIcon icon={warningOutline} slot="start" /> 🆘 HOLD FOR SOS</>
          )}
        </IonButton>
        {isActivating && (
          <IonButton expand="block" fill="clear" size="small" color="medium" onClick={cancelSOS} style={{ marginTop: 4 }}>
            Cancel
          </IonButton>
        )}
      </>
    );
  }

  return (
    <>
      <IonButton expand="block" color="danger" onClick={() => setShowModal(true)}
        style={{ '--border-radius': '14px', height: 52, fontWeight: 'bold', fontSize: 16, margin: '10px 0', animation: 'pulse 2s infinite' } as any}>
        <IonIcon icon={warningOutline} slot="start" style={{ fontSize: 20 }} />
        🆘 EMERGENCY SOS — Tap for Help
      </IonButton>

      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <div style={{ padding: 24, background: 'var(--nav-bg-soft)', color: '#fff8f0', height: '100%', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ color: '#ff5252', margin: 0, fontSize: 22 }}>🚨 Emergency Help</h2>
            <IonButton fill="clear" onClick={() => setShowModal(false)}><IonIcon icon={closeOutline} style={{ color: '#fff' }} /></IonButton>
          </div>

          {/* Quick SOS */}
          <div style={{ background: 'rgba(255,82,82,0.1)', borderRadius: 16, padding: 20, textAlign: 'center', marginBottom: 20, border: '2px solid rgba(255,82,82,0.3)' }}>
            <IonIcon icon={warningOutline} style={{ fontSize: 48, color: '#ff5252', marginBottom: 8 }} />
            <h3 style={{ color: '#fff', margin: '0 0 4px' }}>Quick SOS — Call Police</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 16px' }}>Press and hold to immediately call Uganda Police</p>
            <IonButton expand="block" color="danger" size="large" onClick={handleQuickSOS}
              style={{ '--border-radius': 14, height: 56, fontWeight: 'bold', fontSize: 18 } as any}>
              {isActivating ? `📞 Calling in ${countdown}s...` : '📞 CALL POLICE NOW (999)'}
            </IonButton>
            {isActivating && <IonButton expand="block" fill="clear" onClick={cancelSOS} style={{ marginTop: 8 }}>Cancel</IonButton>}
          </div>

          {/* Location Sharing Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IonIcon icon={locationOutline} style={{ color: '#FF6B35' }} />
              <span style={{ fontSize: 13 }}>Share live location</span>
            </div>
            <IonToggle checked={autoShareLocation} onIonChange={e => setAutoShareLocation(e.detail.checked)} color="danger" />
          </div>

          {/* Custom Message */}
          <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 16, color: '#fff' } as any}>
            <IonLabel position="stacked" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Additional Message</IonLabel>
            <IonInput value={customMessage} onIonInput={e => setCustomMessage(e.detail.value!)} placeholder="Describe your emergency..." style={{ color: '#fff', fontSize: 14 }} />
          </IonItem>

          {/* All Contacts */}
          <h4 style={{ color: '#fff', marginBottom: 10, fontSize: 14 }}>Emergency Contacts</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {allContacts.map(contact => (
              <div key={contact.id} onClick={() => handleSOS(contact)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, cursor: 'pointer' }}>
                <IonIcon icon={contact.icon} style={{ fontSize: 22, color: 'var(--navigo-orange)' }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#fff', fontSize: 14 }}>{contact.name}</strong>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 2 }}>{contact.number}</p>
                </div>
                <IonIcon icon={callOutline} style={{ color: '#ff5252', fontSize: 20 }} />
              </div>
            ))}
          </div>

          {/* Add Contact */}
          {showAddContact ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <h5 style={{ color: '#fff', margin: '0 0 10px' }}>Add Emergency Contact</h5>
              <IonItem style={{ '--background': 'transparent', color: '#fff', marginBottom: 8 } as any}>
                <IonInput value={newContactName} onIonInput={e => setNewContactName(e.detail.value!)} placeholder="Name" style={{ color: '#fff' }} />
              </IonItem>
              <IonItem style={{ '--background': 'transparent', color: '#fff', marginBottom: 10 } as any}>
                <IonInput value={newContactNumber} onIonInput={e => setNewContactNumber(e.detail.value!)} placeholder="Phone Number" type="tel" style={{ color: '#fff' }} />
              </IonItem>
              <div style={{ display: 'flex', gap: 8 }}>
                <IonButton expand="block" size="small" onClick={addContact} style={{ '--background': '#2D6A4F', fontSize: 12 } as any}>Save</IonButton>
                <IonButton expand="block" size="small" fill="outline" onClick={() => setShowAddContact(false)} style={{ fontSize: 12 } as any}>Cancel</IonButton>
              </div>
            </div>
          ) : (
            <IonButton expand="block" fill="outline" size="small" onClick={() => setShowAddContact(true)}
              style={{ '--border-color': 'rgba(255,255,255,0.15)', '--color': '#fff', marginBottom: 16, fontSize: 13 } as any}>
              <IonIcon icon={addCircleOutline} slot="start" /> Add Personal Contact
            </IonButton>
          )}

          {/* Nearby Hospitals */}
          <h4 style={{ color: '#fff', marginBottom: 8, fontSize: 14 }}>🏥 Nearby Hospitals</h4>
          {HOSPITALS.map(h => (
            <div key={h.name} onClick={() => window.open(`tel:${h.number}`, '_system')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(45,106,79,0.08)', borderRadius: 10, padding: 10, marginBottom: 6, cursor: 'pointer' }}>
              <IonIcon icon={medicalOutline} style={{ color: '#2D6A4F', fontSize: 18 }} />
              <div style={{ flex: 1 }}>
                <span style={{ color: '#fff', fontSize: 13 }}>{h.name}</span>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2 }}>{h.distance} away</p>
              </div>
              <IonButton fill="clear" size="small" color="success"><IonIcon icon={callOutline} /></IonButton>
            </div>
          ))}
        </div>
      </IonModal>

      <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={4000} position="top" color="danger" />
    </>
  );
};

export default SOSButton;