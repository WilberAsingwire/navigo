import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonCard, IonCardContent, IonIcon, IonBadge, IonList,
  IonItem, IonLabel, IonButton, IonGrid, IonRow, IonCol, IonModal,
  IonInput, IonToast, IonTextarea, IonSpinner
} from '@ionic/react';
import {
  carOutline, cardOutline, shieldCheckmarkOutline, timeOutline,
  cameraOutline, documentTextOutline, warningOutline, checkmarkCircleOutline,
  createOutline, closeOutline, calendarOutline, colorPaletteOutline,
  speedometerOutline, peopleOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './DriverVehicle.css';

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  boda: 'Boda Boda', go: 'NAVIGO Go', economy: 'NAVIGO Go', standard: 'NAVIGO Go', comfort: 'Comfort', xl: 'XL',
};

interface Vehicle {
  model: string;
  plate: string;
  color: string;
  year: string;
  vehicleType: string;
  status: string;
}

const DriverVehicle: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [vehicle, setVehicle] = useState<Vehicle>({
    model: '', plate: '', color: '', year: '', vehicleType: 'boda', status: 'pending',
  });
  const [editForm, setEditForm] = useState({ ...vehicle });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/drivers/profile');
        const profile = res.data?.profile || {};
        const loaded: Vehicle = {
          model: profile.model || '',
          plate: profile.plate || '',
          color: profile.color || '',
          year: profile.year || '',
          vehicleType: profile.vehicleType || 'boda',
          status: res.data?.user?.verificationStatus === 'approved' ? 'active' : 'pending',
        };
        setVehicle(loaded);
        setEditForm(loaded);
      } catch (e) {
        console.error('Failed to load vehicle profile:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!editForm.model.trim() || !editForm.plate.trim()) {
      setToastMsg('Model and plate number are required');
      setShowToast(true);
      return;
    }
    setSaving(true);
    try {
      await api.put('/drivers/vehicle', {
        model: editForm.model.trim(),
        plate: editForm.plate.trim(),
        color: editForm.color.trim(),
        year: editForm.year.trim(),
      });
      setVehicle({ ...editForm });
      setShowEdit(false);
      setToastMsg('Vehicle details updated successfully! ✅');
      setShowToast(true);
    } catch (e: any) {
      setToastMsg(e.response?.data?.message || 'Failed to update vehicle details');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  // Document expiry tracking isn't implemented yet on the backend — the
  // permit itself (uploaded at registration) is verified by an admin, but we
  // don't have per-document expiry dates to show here honestly.
  const documents = [
    { name: 'Driving Permit', icon: cardOutline, status: vehicle.status === 'active' ? 'valid' : 'pending', color: vehicle.status === 'active' ? '#2D6A4F' : '#FFC107' },
    { name: 'Vehicle Registration', icon: documentTextOutline, status: vehicle.status === 'active' ? 'valid' : 'pending', color: vehicle.status === 'active' ? '#2D6A4F' : '#FFC107' },
  ];

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonButtons slot="start"><IonBackButton defaultHref="/driver/home" /></IonButtons>
            <IonTitle>Vehicle & Safety</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent style={{ '--background': '#080c14' } as any}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><IonSpinner name="crescent" color="warning" /></div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/driver/home" /></IonButtons>
          <IonTitle>Vehicle & Safety</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => { setEditForm({ ...vehicle }); setShowEdit(true); }}>
            <IonIcon icon={createOutline} style={{ color: '#FF6B35' }} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <div style={{ padding: 14, maxWidth: 500, margin: '0 auto' }}>
          
          {/* Status Banner */}
          <div style={{
            background: vehicle.status === 'active' ? 'rgba(45,106,79,0.1)' : 'rgba(255,193,7,0.08)',
            borderRadius: 14, padding: 16, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 12,
            border: `1px solid ${vehicle.status === 'active' ? 'rgba(45,106,79,0.2)' : 'rgba(255,193,7,0.2)'}`
          }}>
            <IonIcon icon={vehicle.status === 'active' ? shieldCheckmarkOutline : timeOutline}
              style={{ fontSize: 28, color: vehicle.status === 'active' ? '#2D6A4F' : '#FFC107' }} />
            <div>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 15 }}>
                {vehicle.status === 'active' ? '✅ Verified Partner' : '⏳ Review in Progress'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '3px 0 0' }}>
                {vehicle.status === 'active' ? 'Your documents are up to date' : 'Some documents need attention'}
              </p>
            </div>
          </div>

          {/* Vehicle Card */}
          <IonCard style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', borderRadius: 18, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
            <IonCardContent style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🚗</div>
              <h2 style={{ color: '#fff', margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{vehicle.model || 'No vehicle on file'}</h2>
              <IonBadge color="warning" style={{ fontSize: 13, padding: '6px 14px', marginTop: 6 }}>{vehicle.plate || '—'}</IonBadge>

              <IonGrid style={{ marginTop: 16 }}>
                <IonRow>
                  <IonCol size="6"><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Color</div><div style={{ color: '#fff', fontSize: 13 }}>{vehicle.color || '—'}</div></IonCol>
                  <IonCol size="6"><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Year</div><div style={{ color: '#fff', fontSize: 13 }}>{vehicle.year || '—'}</div></IonCol>
                  <IonCol size="6"><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Type</div><div style={{ color: '#fff', fontSize: 13 }}>{VEHICLE_TYPE_LABELS[vehicle.vehicleType] || vehicle.vehicleType}</div></IonCol>
                  <IonCol size="6"><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Status</div><div style={{ color: '#fff', fontSize: 13, textTransform: 'capitalize' }}>{vehicle.status}</div></IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>

          {/* Documents */}
          <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>📄 Documents</h3>
          {documents.map(doc => (
            <div key={doc.name} style={{
              display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)',
              borderRadius: 12, padding: 12, marginBottom: 8
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${doc.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IonIcon icon={doc.icon} style={{ color: doc.color, fontSize: 18 }} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ color: '#fff', fontSize: 13 }}>{doc.name}</span>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2 }}>
                  {doc.status === 'valid' ? 'Verified by admin' : 'Awaiting admin review'}
                </p>
              </div>
              <IonBadge color={doc.status === 'valid' ? 'success' : 'warning'} style={{ fontSize: 9 }}>
                {doc.status}
              </IonBadge>
            </div>
          ))}

          {/* Safety Reminder */}
          <div style={{ background: 'rgba(255,193,7,0.05)', borderRadius: 12, padding: 12, marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,193,7,0.1)' }}>
            <IonIcon icon={warningOutline} style={{ color: '#FFC107', fontSize: 20 }} />
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>Keep your documents updated to avoid account suspension. Upload new documents before expiry.</p>
          </div>
        </div>

        {/* Edit Modal */}
        <IonModal isOpen={showEdit} onDidDismiss={() => setShowEdit(false)}>
          <div style={{ padding: 20, background: '#0d1117', color: '#fff', height: '100%', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Edit Vehicle</h2>
              <IonButton fill="clear" onClick={() => setShowEdit(false)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 22 }} /></IonButton>
            </div>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 10, color: '#fff' } as any}>
              <IonLabel position="stacked">Model</IonLabel>
              <IonInput value={editForm.model} onIonInput={e => setEditForm({ ...editForm, model: e.detail.value! })} />
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 10, color: '#fff' } as any}>
              <IonLabel position="stacked">Plate Number</IonLabel>
              <IonInput value={editForm.plate} onIonInput={e => setEditForm({ ...editForm, plate: e.detail.value! })} />
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 10, color: '#fff' } as any}>
              <IonLabel position="stacked">Color</IonLabel>
              <IonInput value={editForm.color} onIonInput={e => setEditForm({ ...editForm, color: e.detail.value! })} />
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 10, color: '#fff' } as any}>
              <IonLabel position="stacked">Year</IonLabel>
              <IonInput value={editForm.year} onIonInput={e => setEditForm({ ...editForm, year: e.detail.value! })} />
            </IonItem>
            <IonButton expand="block" onClick={handleSave} disabled={saving} style={{ '--background': '#FF6B35', '--border-radius': 12, marginTop: 16, fontWeight: 700 } as any}>
              {saving ? <IonSpinner name="crescent" /> : 'Save Changes'}
            </IonButton>
          </div>
        </IonModal>

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={2000} color="success" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default DriverVehicle;