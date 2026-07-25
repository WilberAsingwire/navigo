import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, 
  IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonButton, 
  IonModal, IonInput, useIonToast, IonFab, IonFabButton 
} from '@ionic/react';
import { 
  homeOutline, briefcaseOutline, locationOutline, addOutline, 
  trashOutline, heartOutline, restaurantOutline, checkmarkCircleOutline 
} from 'ionicons/icons';
import './CustomerSavedPlaces.css';

const RiderSavedPlaces: React.FC = () => {
  const [presentToast] = useIonToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [places, setPlaces] = useState<any[]>([]);
  const [newPlace, setNewPlace] = useState({ name: '', address: '', icon: 'homeOutline' });

  const fetchPlaces = async () => {
    const res = await fetch('http://localhost:5000/api/users/places', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    setPlaces(await res.json());
  };

  useEffect(() => { fetchPlaces(); }, []);

  const handleSave = async () => {
    await fetch('http://localhost:5000/api/users/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(newPlace)
    });
    setShowAddModal(false);
    fetchPlaces();
    presentToast({ message: 'Place Saved! 📍', color: 'success', duration: 2000 });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="places-toolbar">
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle className="sora-font">Saved Places</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="places-bg">
        <IonList lines="none" className="places-list ion-padding">
          {places.map(place => (
            <IonItem key={place._id} className="place-item">
              <div className="place-icon-box"><IonIcon icon={locationOutline} /></div>
              <IonLabel><h2>{place.name}</h2><p>{place.address}</p></IonLabel>
            </IonItem>
          ))}
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton color="success" onClick={() => setShowAddModal(true)}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showAddModal} onDidDismiss={() => setShowAddModal(false)}>
          <div className="ion-padding modal-content" style={{ background: '#080808', height: '100%', color: 'white' }}>
            <h2 className="sora-font">Add New Place</h2>
            <IonItem className="custom-input ion-margin-top" lines="none">
              <IonInput placeholder="Name (e.g. Home)" onIonChange={e => setNewPlace({...newPlace, name: e.detail.value!})} />
            </IonItem>
            <IonItem className="custom-input ion-margin-top" lines="none">
              <IonInput placeholder="Address (Plot, Street...)" onIonChange={e => setNewPlace({...newPlace, address: e.detail.value!})} />
            </IonItem>
            <IonButton expand="block" className="main-btn ion-margin-top" onClick={handleSave}>Save Location</IonButton>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RiderSavedPlaces;