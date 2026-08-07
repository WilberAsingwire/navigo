import React, { useState } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonButton, IonAvatar,
  IonModal, IonInput, IonToggle, IonToast, IonBadge, IonSpinner
} from '@ionic/react';
import {
  personOutline, phonePortraitOutline, mailOutline, logOutOutline,
  shieldCheckmarkOutline, createOutline, closeOutline, checkmarkCircleOutline,
  cardOutline, starOutline, carOutline, giftOutline, locationOutline,
  notificationsOutline, moonOutline, lockClosedOutline, helpCircleOutline,
  informationCircleOutline, trashOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import { useHistory } from 'react-router-dom';
import axios from 'axios';

const Profile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const history = useHistory();
  const [showEdit, setShowEdit] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const BASE_URL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
      const token = localStorage.getItem('navigo_token');
      await axios.put(`${BASE_URL}/api/users/update`,
        { name: editName, email: editEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      updateUser({ name: editName, email: editEmail });
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

  const stats = [
    { label: 'Total Rides', value: '45', icon: carOutline },
    { label: 'Rating', value: '4.8 ⭐', icon: starOutline },
    { label: 'Points', value: '280', icon: giftOutline },
  ];

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle>Profile</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => { setEditName(user?.name || ''); setEditEmail(user?.email || ''); setShowEdit(true); }}>
            <IonIcon icon={createOutline} style={{ color: '#FF6B35' }} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <div style={{ padding: 16, maxWidth: 500, margin: '0 auto' }}>
          
          {/* Avatar Section */}
          <div style={{ textAlign: 'center', marginBottom: 20, paddingTop: 10 }}>
            <IonAvatar style={{ width: 88, height: 88, margin: '0 auto 12px', border: '3px solid #FF6B35' }}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Rider')}&background=FF6B35&color=fff&size=128`} alt="Profile" />
            </IonAvatar>
            <h2 style={{ color: '#fff', margin: '8px 0 2px', fontSize: 20 }}>{user?.name || 'Rider'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>
              {user?.role === 'rider' ? '🚗 Rider' : user?.role === 'driver' ? '🚗 Driver' : '🏍️ Motorist'} • {user?.phone || 'No phone'}
            </p>
            {user?.verificationStatus === 'approved' && (
              <IonBadge color="success" style={{ marginTop: 6 }}>✅ Verified</IonBadge>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <IonIcon icon={s.icon} style={{ color: '#FF6B35', fontSize: 18, marginBottom: 4 }} />
                <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 2 }}>{s.value}</p>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Account Info */}
          <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Account Information</h3>
          <IonList style={{ background: 'transparent' }}>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any}>
              <IonIcon icon={personOutline} slot="start" style={{ color: '#FF6B35', fontSize: 18 }} />
              <IonLabel>
                <h3 style={{ color: '#fff', fontSize: 13, margin: 0 }}>Full Name</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 2 }}>{user?.name || 'Not set'}</p>
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

          {/* Settings */}
          <h3 style={{ color: '#fff', fontSize: 14, margin: '20px 0 10px' }}>Settings</h3>
          <IonList style={{ background: 'transparent' }}>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any}>
              <IonIcon icon={notificationsOutline} slot="start" style={{ color: '#FF6B35', fontSize: 18 }} />
              <IonLabel>Push Notifications</IonLabel>
              <IonToggle checked={notifications} onIonChange={e => setNotifications(e.detail.checked)} color="success" />
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any}>
              <IonIcon icon={moonOutline} slot="start" style={{ color: '#FF6B35', fontSize: 18 }} />
              <IonLabel>Dark Mode</IonLabel>
              <IonToggle checked={darkMode} onIonChange={e => setDarkMode(e.detail.checked)} color="success" />
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any} button onClick={() => history.push('/rider/support')}>
              <IonIcon icon={helpCircleOutline} slot="start" style={{ color: '#FF6B35', fontSize: 18 }} />
              <IonLabel>Help & Support</IonLabel>
            </IonItem>
            <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6, color: '#fff' } as any} button>
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

export default Profile;