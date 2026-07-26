import React, { useState } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonButton, IonInput } from '@ionic/react';
import { homeOutline, briefcaseOutline, addCircleOutline, starOutline, locationOutline } from 'ionicons/icons';

const DEFAULT_PLACES = [
  { id: 'home', name: 'Home', icon: homeOutline, address: 'Tap to set home address' },
  { id: 'work', name: 'Work', icon: briefcaseOutline, address: 'Tap to set work address' },
];

const CustomerSavedPlaces: React.FC = () => {
  const [places, setPlaces] = useState(DEFAULT_PLACES);
  const [editing, setEditing] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState('');

  const savePlace = (id: string) => {
    setPlaces(places.map(p => p.id === id ? { ...p, address: newAddress || p.address } : p));
    setEditing(null);
    setNewAddress('');
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle>Saved Places</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{'--background': '#080c14', '--color': '#fff8f0'} as any} className="ion-padding">
        <IonList style={{background: 'transparent'}}>
          {places.map(place => (
            <div key={place.id} style={{background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 10}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <IonIcon icon={place.icon} style={{fontSize: 24, color: '#FF6B35'}} />
                <div style={{flex: 1}}>
                  <h3 style={{color: '#fff', margin: 0}}>{place.name}</h3>
                  {editing === place.id ? (
                    <IonInput value={newAddress} placeholder="Enter address" onIonInput={e => setNewAddress(e.detail.value!)} style={{color: '#fff', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 8px', marginTop: 6}} />
                  ) : (
                    <p style={{color: 'rgba(255,248,240,0.5)', margin: '4px 0'}}>{place.address}</p>
                  )}
                </div>
                {editing === place.id ? (
                  <IonButton size="small" onClick={() => savePlace(place.id)}>Save</IonButton>
                ) : (
                  <IonButton size="small" fill="clear" onClick={() => { setEditing(place.id); setNewAddress(''); }}>Edit</IonButton>
                )}
              </div>
            </div>
          ))}
        </IonList>
        <IonButton expand="block" fill="outline" style={{'--color': '#FF6B35', marginTop: 16} as any}>
          <IonIcon icon={addCircleOutline} slot="start" /> Add New Place
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default CustomerSavedPlaces;