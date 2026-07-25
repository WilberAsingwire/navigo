import React from 'react';
import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonCard, IonCardContent, IonIcon, IonBadge, IonList, IonItem, IonLabel, IonButton } from '@ionic/react';
import { carOutline, bicycleOutline, cardOutline, shieldCheckmarkOutline, timeOutline, cameraOutline } from 'ionicons/icons';
import './DriverVehicle.css';

const DriverVehicle: React.FC = () => {
  const vehicle = { model: "Toyota Corolla", plate: "UBA 123X", status: "active" };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="driver-toolbar">
          <IonButtons slot="start"><IonBackButton defaultHref="/driver/home" /></IonButtons>
          <IonTitle className="sora-font">Vehicle & Safety</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding driver-bg">
        <div className={`verification-status ${vehicle.status}`}>
          <IonIcon icon={vehicle.status === 'active' ? shieldCheckmarkOutline : timeOutline} />
          <div>
            <h3>{vehicle.status === 'active' ? 'Verified Partner' : 'Review in Progress'}</h3>
            <p>Your documents are {vehicle.status === 'active' ? 'up to date' : 'under review'}.</p>
          </div>
        </div>

        <IonCard className="vehicle-main-card">
          <IonCardContent>
            <IonIcon icon={carOutline} className="vehicle-icon" />
            <h2 className="sora-font">{vehicle.model}</h2>
            <IonBadge color="primary">{vehicle.plate}</IonBadge>
          </IonCardContent>
        </IonCard>

        <IonList lines="none" className="doc-list">
          <IonItem className="doc-item">
            <IonIcon icon={cardOutline} slot="start" color="primary" />
            <IonLabel><h4>Driving Permit</h4><p>Expires: Dec 2025</p></IonLabel>
            <IonIcon icon={cameraOutline} slot="end" color="medium" />
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default DriverVehicle;