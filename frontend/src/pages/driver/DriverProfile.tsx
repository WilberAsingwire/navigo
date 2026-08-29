import React, { useState } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonButton, IonAvatar,
  IonModal, IonInput, IonToast, IonBadge, IonSpinner
} from '@ionic/react';
import {
  personOutline, phonePortraitOutline, mailOutline, logOutOutline,
  createOutline, closeOutline, checkmarkCircleOutline,
  carOutline, documentTextOutline, helpCircleOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import InitialsAvatar from '../../components/InitialsAvatar';
import api from '../../services/api';

/**
 * Driver equivalent of the rider Profile screen — until now drivers had no
 * way to edit their name/email or sign out of the app at all (Profile.tsx
 * only renders for rider/customer routes). Reuses the same /users/update
 * endpoint, which is role-agnostic.
 */
const DriverProfile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const history = useHistory();
  const [showEdit, setShowEdit] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.put('/users/update', { fullName: editName, email: editEmail });
      updateUser({ fullName: editName, email: editEmail });
      setShowEdit(false);
      setToastMsg('Profile updated successfully! ✅');
      setShowToast(true);
    } catch (err: any) {
      setToastMsg(err.response?.data?.message || 'Failed to update profile');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  const statusLabel =
    user?.verificationStatus === 'approved' ? '✅ Verified' :
    user?.verificationStatus === 'pending' ? '⏳ Pending Review' :
    user?.verificationStatus === 'rejected' ? '❌ Rejected' : 'Not Submitted';
  const statusColor =
    user?.verificationStatus === 'approved' ? 'success' :
    user?.verificationStatus === 'pending' ? 'warning' :
    user?.verificationStatus === 'rejected' ? 'danger' : 'medium';

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{ '--background': '#080c14' } as any}>
        <IonToolbar style={{ '--background': '#080c14', '--color': '#fff' } as any}>
          <IonButtons slot="start"><IonBackButton defaultHref="/driver/home" style={{ color: '#fff' }} /></IonButtons>
          <IonTitle style={{ color: '#fff' }}>Profile</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => { setEditName(user?.fullName || ''); setEditEmail(user?.email || ''); setShowEdit(true); }}>
            <IonIcon icon={createOutline} style={{ color: '#FF6B35' }} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#080c14' } as any}>
        <div style={{ padding: 16, maxWidth: 500, margin: '0 auto' }}>
          {/* Avatar Section */}
          <div style={{ textAlign: 'center', marginBottom: 20, paddingTop: 10 }}>
            <div style={{ width: 88, height: 88, margin: '0 auto 12px', border: '3px solid #FF6B35', borderRadius: '50%', overflow: 'hidden' }}>
              <InitialsAvatar name={user?.fullName || 'D'} size={88} />
            </div>
            <h2 style={{ color: '#fff', margin: '8px 0 2px', fontSize: 20 }}>{user?.fullName || 'Driver'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>🏍️ Driver • {user?.phone || 'No phone'}</p>
            <IonBadge color={statusColor} style={{ marginTop: 6 }}>{statusLabel}</IonBadge>
          </div>

          {/* Account Info */}
          <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Account Information</h3>
          <IonList style={{ background: 'transparent' }}>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any}>
              <IonIcon icon={personOutline} slot="start" style={{ color: '#FF6B35', fontSize: 18 }} />
              <IonLabel>
                <h3 style={{ color: '#fff', fontSize: 13, margin: 0 }}>Full Name</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 2 }}>{user?.fullName || 'Not set'}</p>
              </IonLabel>
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any}>
              <IonIcon icon={phonePortraitOutline} slot="start" style={{ color: '#FF6B35', fontSize: 18 }} />
              <IonLabel>
                <h3 style={{ color: '#fff', fontSize: 13, margin: 0 }}>Phone Number</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 2 }}>{user?.phone || 'Not set'}</p>
              </IonLabel>
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any}>
              <IonIcon icon={mailOutline} slot="start" style={{ color: '#FF6B35', fontSize: 18 }} />
              <IonLabel>
                <h3 style={{ color: '#fff', fontSize: 13, margin: 0 }}>Email</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 2 }}>{user?.email || 'Not set'}</p>
              </IonLabel>
            </IonItem>
          </IonList>

          {/* Driver-specific shortcuts */}
          <h3 style={{ color: '#fff', fontSize: 14, margin: '20px 0 10px' }}>Driver</h3>
          <IonList style={{ background: 'transparent' }}>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any} button onClick={() => history.push('/driver/vehicle')}>
              <IonIcon icon={carOutline} slot="start" style={{ color: '#FF6B35', fontSize: 18 }} />
              <IonLabel>Vehicle & Safety</IonLabel>
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any} button onClick={() => history.push('/driver/documents')}>
              <IonIcon icon={documentTextOutline} slot="start" style={{ color: '#FF6B35', fontSize: 18 }} />
              <IonLabel>Documents & Verification</IonLabel>
            </IonItem>
          </IonList>

          {/* Settings */}
          <h3 style={{ color: '#fff', fontSize: 14, margin: '20px 0 10px' }}>Settings</h3>
          <IonList style={{ background: 'transparent' }}>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any} button onClick={() => history.push('/driver/support')}>
              <IonIcon icon={helpCircleOutline} slot="start" style={{ color: '#FF6B35', fontSize: 18 }} />
              <IonLabel>Help & Support</IonLabel>
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any}>
              <IonIcon icon={informationCircleOutline} slot="start" style={{ color: '#FF6B35', fontSize: 18 }} />
              <IonLabel>About NAVIGO</IonLabel>
              <IonBadge color="medium">v1.0</IonBadge>
            </IonItem>
          </IonList>

          {/* Logout */}
          <IonButton expand="block" color="danger" fill="outline" onClick={handleLogout} style={{ marginTop: 24, '--border-radius': 12 } as any}>
            <IonIcon icon={logOutOutline} slot="start" /> Sign Out
          </IonButton>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 16 }}>NAVIGO v1.0 • Made in Uganda 🇺🇬</p>
        </div>

        {/* Edit Modal */}
        <IonModal isOpen={showEdit} onDidDismiss={() => setShowEdit(false)}>
          <div style={{ padding: 20, background: '#0d1117', color: '#fff', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Edit Profile</h2>
              <IonButton fill="clear" onClick={() => setShowEdit(false)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 22 }} /></IonButton>
            </div>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 12, color: '#fff' } as any}>
              <IonLabel position="stacked">Full Name</IonLabel>
              <IonInput value={editName} onIonInput={e => setEditName(e.detail.value!)} />
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 12, color: '#fff' } as any}>
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput value={editEmail} onIonInput={e => setEditEmail(e.detail.value!)} />
            </IonItem>
            <IonButton expand="block" onClick={handleSave} disabled={isLoading} style={{ '--background': '#FF6B35', '--border-radius': 12, fontWeight: 700, marginTop: 16 } as any}>
              {isLoading ? <IonSpinner name="crescent" /> : <><IonIcon icon={checkmarkCircleOutline} slot="start" /> Save Changes</>}
            </IonButton>
          </div>
        </IonModal>

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={2000} color="success" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default DriverProfile;
