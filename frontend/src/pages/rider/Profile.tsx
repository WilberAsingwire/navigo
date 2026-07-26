import React from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonButton, IonAvatar } from '@ionic/react';
import { personOutline, phonePortraitOutline, mailOutline, logOutOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import { useHistory } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{'--background': '#080c14', '--color': '#fff8f0'} as any} className="ion-padding">
        <div style={{textAlign: 'center', marginBottom: 24}}>
          <IonAvatar style={{width: 80, height: 80, margin: '0 auto 12px'}}>
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Rider')}&background=FF6B35&color=fff&size=128`} alt="Profile" />
          </IonAvatar>
          <h2 style={{color: '#fff', margin: '8px 0'}}>{user?.name || 'Rider'}</h2>
          <p style={{color: 'rgba(255,248,240,0.5)'}}>{user?.role || 'Rider'} • {user?.phone || 'No phone'}</p>
        </div>

        <IonList style={{background: 'transparent'}}>
          <IonItem style={{'--background': 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 8, color: '#fff'} as any}>
            <IonIcon icon={personOutline} slot="start" style={{color: '#FF6B35'}} />
            <IonLabel>Edit Profile</IonLabel>
          </IonItem>
          <IonItem style={{'--background': 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 8, color: '#fff'} as any}>
            <IonIcon icon={shieldCheckmarkOutline} slot="start" style={{color: '#FF6B35'}} />
            <IonLabel>Security</IonLabel>
          </IonItem>
          <IonItem style={{'--background': 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 8, color: '#fff'} as any}>
            <IonIcon icon={phonePortraitOutline} slot="start" style={{color: '#FF6B35'}} />
            <IonLabel>Phone: {user?.phone || 'Not set'}</IonLabel>
          </IonItem>
          {user?.email && (
            <IonItem style={{'--background': 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 8, color: '#fff'} as any}>
              <IonIcon icon={mailOutline} slot="start" style={{color: '#FF6B35'}} />
              <IonLabel>Email: {user.email}</IonLabel>
            </IonItem>
          )}
        </IonList>

        <IonButton expand="block" color="danger" fill="outline" onClick={() => { logout(); history.push('/login'); }} style={{marginTop: 30}}>
          <IonIcon icon={logOutOutline} slot="start" /> Sign Out
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Profile;