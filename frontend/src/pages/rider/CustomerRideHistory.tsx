import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, 
  IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonBadge, 
  IonModal, IonSegment, IonSegmentButton, IonProgressBar 
} from '@ionic/react';
import { IonButton } from '@ionic/react';
import { 
  locationOutline, carOutline, bicycleOutline, 
  receiptOutline, chevronForwardOutline, starOutline, timeOutline 
} from 'ionicons/icons';
import './CustomerRideHistory.css';

const RiderRideHistory: React.FC = () => {
  const [segment, setSegment] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/rides/history', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => { setRides(data); setLoading(false); });
  }, []);

  const filteredRides = rides.filter(r => segment === 'all' || r.status === segment);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="history-toolbar">
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle className="sora-font">Ride History</IonTitle>
        </IonToolbar>
        <IonToolbar className="history-toolbar">
          <IonSegment value={segment} onIonChange={(e) => setSegment(e.detail.value as any)}>
            <IonSegmentButton value="all"><IonLabel>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="completed"><IonLabel>Done</IonLabel></IonSegmentButton>
            <IonSegmentButton value="cancelled"><IonLabel>Cancelled</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="history-bg">
        {loading && <IonProgressBar type="indeterminate" color="success" />}
        
        <IonList lines="none" className="ride-list">
          {filteredRides.map(ride => (
            <IonItem key={ride._id} className="ride-item" onClick={() => setSelectedRide(ride)}>
              <div className="ride-type-icon">
                <IonIcon icon={ride.vehicleType === 'car' ? carOutline : bicycleOutline} />
              </div>
              <IonLabel>
                <div className="ride-header">
                  <h2 style={{ color: 'white' }}>{ride.destinationName}</h2>
                  <span className="ride-price">{ride.fare.toLocaleString()} <small>UGX</small></span>
                </div>
                <p style={{ color: '#666' }}>{new Date(ride.createdAt).toLocaleDateString()}</p>
              </IonLabel>
              <IonIcon icon={chevronForwardOutline} slot="end" color="medium" />
            </IonItem>
          ))}
        </IonList>

        <IonModal isOpen={!!selectedRide} onDidDismiss={() => setSelectedRide(null)}>
          {selectedRide && (
            <div className="ion-padding modal-content" style={{ background: '#080808', height: '100%', color: 'white' }}>
              <h2 className="sora-font" style={{ color: '#00e676' }}>Ride Summary</h2>
              <div className="route-box ion-margin-top">
                <p><IonIcon icon={locationOutline} color="success" /> {selectedRide.pickupName}</p>
                <div className="route-line"></div>
                <p><IonIcon icon={locationOutline} color="danger" /> {selectedRide.destinationName}</p>
              </div>
              
              <div className="fare-breakdown ion-margin-top">
                 <div className="fare-row"><span>Base Fare</span><span>{selectedRide.fare} UGX</span></div>
                 <div className="fare-row total"><span>Total Paid</span><span>{selectedRide.fare} UGX</span></div>
              </div>
              
              <IonButton expand="block" fill="clear" color="light" onClick={() => setSelectedRide(null)}>Close</IonButton>
            </div>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RiderRideHistory;