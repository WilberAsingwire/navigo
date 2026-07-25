import React, { useState } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonAvatar, IonItem, IonLabel, IonIcon, IonList,
  IonToggle, IonButton, IonBadge, useIonActionSheet
} from '@ionic/react';
import {
  locationOutline, cardOutline, moonOutline, logOutOutline, shieldCheckmarkOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

const Profile: React.FC = () => {
  const history = useHistory();
  const { user, logout } = useAuth();
  const [present] = useIonActionSheet();
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleDarkMode = (checked: boolean) => {
    setIsDarkMode(checked);
    document.body.classList.toggle('dark', checked);
  };

  const handleLogout = () => {
    present({
      header: 'Ready to leave?',
      buttons: [
        { text: 'Logout', role: 'destructive', handler: () => {
          logout();
          history.push('/login');
        }},
        { text: 'Cancel', role: 'cancel' }
      ]
    });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="profile-toolbar">
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle className="sora-font">My Profile</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding profile-bg">
        <div className="user-header ion-text-center">
          <IonAvatar className="profile-avatar">
            <img src={user?.avatar || `https://i.pravatar.cc/150?u=${user?.id}`} alt="user" />
          </IonAvatar>
          <h2 className="sora-font">{user?.name || 'User Name'}</h2>
          <IonBadge color="success"><IonIcon icon={shieldCheckmarkOutline} /> Verified Rider</IonBadge>
        </div>

        <IonList lines="none" className="profile-list ion-margin-top">
          <IonItem button onClick={() => history.push('/rider/places')} className="profile-item">
            <IonIcon icon={locationOutline} slot="start" />
            <IonLabel>Saved Places</IonLabel>
          </IonItem>
          <IonItem button onClick={() => history.push('/rider/payments')} className="profile-item">
            <IonIcon icon={cardOutline} slot="start" />
            <IonLabel>Wallet & Payments</IonLabel>
          </IonItem>
          <IonItem className="profile-item">
            <IonIcon icon={moonOutline} slot="start" />
            <IonLabel>Dark Mode</IonLabel>
            <IonToggle slot="end" color="success" checked={isDarkMode} onIonChange={e => toggleDarkMode(e.detail.checked)} />
          </IonItem>
        </IonList>

        <div className="ion-padding-top">
          <IonButton expand="block" fill="clear" color="medium" onClick={handleLogout}>
            <IonIcon icon={logOutOutline} slot="start" /> Logout
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Profile;
