import React, { useState } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonCard, IonCardContent, IonIcon, IonBadge, IonList,
  IonItem, IonLabel, IonButton, IonGrid, IonRow, IonCol, IonModal,
  IonInput, IonToast, IonTextarea
} from '@ionic/react';
import {
  carOutline, carSportOutline, cardOutline, shieldCheckmarkOutline, timeOutline,
  cameraOutline, documentTextOutline, warningOutline, checkmarkCircleOutline,
  createOutline, closeOutline, calendarOutline, colorPaletteOutline,
  speedometerOutline, peopleOutline
} from 'ionicons/icons';
import './DriverVehicle.css';

const DriverVehicle: React.FC = () => {
  const [showEdit, setShowEdit] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [vehicle, setVehicle] = useState({
    model: 'Toyota Prius',
    plate: 'UBA 123A',
    color: 'White',
    year: '2020',
    seats: 4,
    type: 'Sedan',
    status: 'active',
    mileage: '45,000 km',
    lastService: 'June 2026',
    insuranceExpiry: 'March 2027',
    permitExpiry: 'December 2026',
  });

  const [editForm, setEditForm] = useState({ ...vehicle });

  const handleSave = () => {
    setVehicle({ ...editForm });
    setShowEdit(false);
    setToastMsg('Vehicle details updated');
    setShowToast(true);
  };

  const documents = [
    { name: 'Driving Permit', icon: cardOutline, expiry: vehicle.permitExpiry, status: 'valid', color: '#2D6A4F' },
    { name: 'Vehicle Insurance', icon: shieldCheckmarkOutline, expiry: vehicle.insuranceExpiry, status: 'valid', color: '#2D6A4F' },
    { name: 'Vehicle Registration', icon: documentTextOutline, expiry: 'June 2027', status: 'valid', color: '#2D6A4F' },
    { name: 'Roadworthiness Certificate', icon: checkmarkCircleOutline, expiry: 'September 2026', status: 'expiring', color: '#FFC107' },
  ];

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/driver/home" /></IonButtons>
          <IonTitle>Vehicle & Safety</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => { setEditForm({ ...vehicle }); setShowEdit(true); }}>
            <IonIcon icon={createOutline} style={{ color: 'var(--navigo-orange)' }} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': 'var(--nav-bg)'} as any} className="driver-vehicle-wrapper">
        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          
          {/* Status Banner */}
          <div style={{
            background: vehicle.status === 'active' ? 'rgba(45,106,79,0.1)' : 'rgba(255,193,7,0.08)',
            borderRadius: 12, padding: 16, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 12,
            border: `1px solid ${vehicle.status === 'active' ? 'rgba(45,106,79,0.2)' : 'rgba(255,193,7,0.2)'}`
          }}>
            <IonIcon icon={vehicle.status === 'active' ? shieldCheckmarkOutline : timeOutline}
              style={{ fontSize: 28, color: vehicle.status === 'active' ? '#2D6A4F' : '#FFC107' }} />
            <div>
              <h3 style={{ color: 'var(--nav-text)', margin: 0, fontSize: 15 }}>
                {vehicle.status === 'active' ? 'Verified partner' : 'Review in progress'}
              </h3>
              <p style={{ color: 'var(--nav-text-secondary)', fontSize: 11, margin: '3px 0 0' }}>
                {vehicle.status === 'active' ? 'Your documents are up to date' : 'Some documents need attention'}
              </p>
            </div>
          </div>

          {/* Vehicle Card */}
          <IonCard style={{ background: 'var(--nav-card)', borderRadius: 12, border: '1px solid var(--nav-border)', marginBottom: 16 }}>
            <IonCardContent style={{ textAlign: 'center', padding: 24 }}>
              <IonIcon icon={carSportOutline} style={{ fontSize: 44, color: 'var(--navigo-orange)', marginBottom: 10 }} />
              <h2 style={{ color: 'var(--nav-text)', margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{vehicle.model}</h2>
              <IonBadge color="warning" style={{ fontSize: 13, padding: '6px 14px', marginTop: 6 }}>{vehicle.plate}</IonBadge>
              
              <IonGrid style={{ marginTop: 16 }}>
                <IonRow>
                  <IonCol size="6"><div style={{ color: 'var(--nav-text-secondary)', fontSize: 10 }}>Color</div><div style={{ color: 'var(--nav-text)', fontSize: 13 }}>{vehicle.color}</div></IonCol>
                  <IonCol size="6"><div style={{ color: 'var(--nav-text-secondary)', fontSize: 10 }}>Year</div><div style={{ color: 'var(--nav-text)', fontSize: 13 }}>{vehicle.year}</div></IonCol>
                  <IonCol size="6"><div style={{ color: 'var(--nav-text-secondary)', fontSize: 10 }}>Seats</div><div style={{ color: 'var(--nav-text)', fontSize: 13 }}>{vehicle.seats}</div></IonCol>
                  <IonCol size="6"><div style={{ color: 'var(--nav-text-secondary)', fontSize: 10 }}>Type</div><div style={{ color: 'var(--nav-text)', fontSize: 13 }}>{vehicle.type}</div></IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>

          {/* Vehicle Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: 'var(--nav-card-soft)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <IonIcon icon={speedometerOutline} style={{ color: '#4da6ff', fontSize: 20, marginBottom: 4 }} />
              <p style={{ color: 'var(--nav-text)', fontSize: 14, fontWeight: 600, margin: 2 }}>{vehicle.mileage}</p>
              <span style={{ color: 'var(--nav-text-dim)', fontSize: 9 }}>Mileage</span>
            </div>
            <div style={{ background: 'var(--nav-card-soft)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <IonIcon icon={calendarOutline} style={{ color: '#FFC107', fontSize: 20, marginBottom: 4 }} />
              <p style={{ color: 'var(--nav-text)', fontSize: 14, fontWeight: 600, margin: 2 }}>{vehicle.lastService}</p>
              <span style={{ color: 'var(--nav-text-dim)', fontSize: 9 }}>Last Service</span>
            </div>
          </div>

          {/* Documents */}
          <h3 style={{ color: 'var(--nav-text)', fontSize: 14, marginBottom: 10 }}>Documents</h3>
          {documents.map(doc => (
            <div key={doc.name} style={{
              display: 'flex', alignItems: 'center', gap: 12, background: 'var(--nav-card-soft)',
              borderRadius: 12, padding: 12, marginBottom: 8
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${doc.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IonIcon icon={doc.icon} style={{ color: doc.color, fontSize: 18 }} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ color: 'var(--nav-text)', fontSize: 13 }}>{doc.name}</span>
                <p style={{ color: 'var(--nav-text-dim)', fontSize: 10, margin: 2 }}>Expires: {doc.expiry}</p>
              </div>
              <IonBadge color={doc.status === 'valid' ? 'success' : 'warning'} style={{ fontSize: 9 }}>
                {doc.status}
              </IonBadge>
              <IonIcon icon={cameraOutline} style={{ color: 'var(--nav-text-dim)', fontSize: 16 }} />
            </div>
          ))}

          {/* Safety Reminder */}
          <div style={{ background: 'rgba(255,193,7,0.05)', borderRadius: 12, padding: 12, marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,193,7,0.1)' }}>
            <IonIcon icon={warningOutline} style={{ color: '#FFC107', fontSize: 20 }} />
            <p style={{ color: 'var(--nav-text-secondary)', fontSize: 11, margin: 0 }}>Keep your documents updated to avoid account suspension. Upload new documents before expiry.</p>
          </div>
        </div>

        {/* Edit Modal */}
        <IonModal isOpen={showEdit} onDidDismiss={() => setShowEdit(false)}>
          <div style={{ padding: 20, background: 'var(--nav-bg-soft)', color: 'var(--nav-text)', height: '100%', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Edit Vehicle</h2>
              <IonButton fill="clear" onClick={() => setShowEdit(false)}><IonIcon icon={closeOutline} style={{ color: 'var(--nav-text)', fontSize: 22 }} /></IonButton>
            </div>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 10, color: 'var(--nav-text)' } as any}>
              <IonLabel position="stacked">Model</IonLabel>
              <IonInput value={editForm.model} onIonInput={e => setEditForm({ ...editForm, model: e.detail.value! })} />
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 10, color: 'var(--nav-text)' } as any}>
              <IonLabel position="stacked">Plate Number</IonLabel>
              <IonInput value={editForm.plate} onIonInput={e => setEditForm({ ...editForm, plate: e.detail.value! })} />
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 10, color: 'var(--nav-text)' } as any}>
              <IonLabel position="stacked">Color</IonLabel>
              <IonInput value={editForm.color} onIonInput={e => setEditForm({ ...editForm, color: e.detail.value! })} />
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 10, color: 'var(--nav-text)' } as any}>
              <IonLabel position="stacked">Year</IonLabel>
              <IonInput value={editForm.year} onIonInput={e => setEditForm({ ...editForm, year: e.detail.value! })} />
            </IonItem>
            <IonButton expand="block" onClick={handleSave} style={{ '--background': 'var(--navigo-orange)', '--border-radius': 12, marginTop: 16, fontWeight: 700 } as any}>
              Save Changes
            </IonButton>
          </div>
        </IonModal>

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={2000} color="success" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default DriverVehicle;