import React from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonBadge } from '@ionic/react';
import { carOutline, timeOutline, bicycleOutline } from 'ionicons/icons';

const MOCK_RIDES = [
  { id: '1', date: 'July 25, 2026', from: 'Kampala Road', to: 'Acacia Mall', price: 'UGX 8,500', status: 'Completed', type: 'economy' },
  { id: '2', date: 'July 24, 2026', from: 'Kololo', to: 'Ntinda', price: 'UGX 3,200', status: 'Completed', type: 'boda' },
  { id: '3', date: 'July 22, 2026', from: 'Makerere', to: 'Wandegeya', price: 'UGX 4,100', status: 'Cancelled', type: 'economy' },
];

const CustomerRideHistory: React.FC = () => {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle>Ride History</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{'--background': '#080c14', '--color': '#fff8f0'} as any} className="ion-padding">
        {MOCK_RIDES.length === 0 ? (
          <div style={{textAlign: 'center', marginTop: '40vh', color: 'rgba(255,248,240,0.5)'}}>
            <IonIcon icon={carOutline} style={{fontSize: 48}} />
            <p>No rides yet. Book your first ride!</p>
          </div>
        ) : (
          <IonList style={{background: 'transparent'}}>
            {MOCK_RIDES.map(ride => (
              <IonItem key={ride.id} style={{'--background': 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 8, color: '#fff'} as any}>
                <IonIcon icon={ride.type === 'boda' ? bicycleOutline : carOutline} slot="start" style={{color: '#FF6B35'}} />
                <IonLabel>
                  <h3 style={{color: '#fff'}}>{ride.from} → {ride.to}</h3>
                  <p style={{color: 'rgba(255,248,240,0.5)'}}>{ride.date}</p>
                </IonLabel>
                <div style={{textAlign: 'right'}}>
                  <strong style={{color: '#FF6B35'}}>{ride.price}</strong>
                  <IonBadge color={ride.status === 'Completed' ? 'success' : 'danger'} style={{display: 'block', marginTop: 4}}>{ride.status}</IonBadge>
                </div>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default CustomerRideHistory;