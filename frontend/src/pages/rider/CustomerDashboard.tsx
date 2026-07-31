import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle,
  IonGrid, IonRow, IonCol, IonCard, IonCardContent,
  IonIcon, IonButton, IonAvatar, IonProgressBar, IonRefresher, IonRefresherContent
} from '@ionic/react';
import {
  carOutline, timeOutline,
  starOutline, walletOutline, locationOutline,
  arrowForwardOutline, bicycleOutline, chevronDownCircleOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoyaltyCard from '../../components/LoyaltyCard';
import './CustomerDashboard.css';

const RiderDashboard: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [nearbyDrivers] = useState([
    { id: '1', name: 'John K.', vehicle: 'Toyota Prius', type: 'car', distance: '0.5' },
    { id: '2', name: 'Sarah M.', vehicle: 'Bajaj Boxer', type: 'bike', distance: '1.2' },
    { id: '3', name: 'Peter O.', vehicle: 'Toyota Hiace', type: 'car', distance: '2.0' },
  ]);

  const userData = {
    name: user?.name || 'Rider',
    stats: { totalRides: 5, rating: 4.8 }
  };

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const handleRefresh = (event: any) => {
    setTimeout(() => { setLoading(false); event.target.complete(); }, 1000);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="dashboard-toolbar">
          <div className="header-content ion-padding-horizontal">
            <div className="user-greeting">
              <h2 className="sora-font">Hello, {userData.name.split(' ')[0]} 👋</h2>
              <p>Ready for your next ride?</p>
            </div>
            <div className="header-actions">
              <IonAvatar className="header-avatar" onClick={() => history.push('/rider/profile')}style={{marginRight: 12}}>
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Rider')}&background=FF6B35&color=fff&size=64`} alt="profile" />
              </IonAvatar>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding dashboard-bg">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        {loading && <IonProgressBar type="indeterminate" color="success" />}

        <LoyaltyCard points={280} tier="silver" />

        <IonGrid className="ion-no-padding">
          <IonRow>
            <IonCol size="6">
              <div className="stat-box">
                <IonIcon icon={carOutline} color="primary" />
                <h3>{userData.stats.totalRides}</h3>
                <p>Total Rides</p>
              </div>
            </IonCol>
            <IonCol size="6">
              <div className="stat-box">
                <IonIcon icon={starOutline} color="warning" />
                <h3>{userData.stats.rating}</h3>
                <p>Your Rating</p>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>

        <div className="booking-section ion-margin-vertical">
         <IonButton expand="block" onClick={() => history.push('/rider/book')}
  style={{'--background': '#FF6B35', '--background-activated': '#e55a2a', '--border-radius': 14, fontWeight: 700, height: 52, fontSize: 15, margin: '12px 0'} as any}>
            <div className="btn-content">
              <div className="text">
                <span className="title">Request a Ride</span>
                <span className="subtitle">Cars and Boda-Bodas nearby</span>
              </div>
              <IonIcon icon={arrowForwardOutline} />
            </div>
          </IonButton>
        </div>

        <h3 className="section-title sora-font">Quick Actions</h3>
        <IonGrid>
          <IonRow>
            <IonCol size="4">
              <div className="action-item" onClick={() => history.push('/rider/history')}>
                <div className="icon-box"><IonIcon icon={timeOutline} /></div>
                <p>History</p>
              </div>
            </IonCol>
            <IonCol size="4">
              <div className="action-item" onClick={() => history.push('/rider/places')}>
                <div className="icon-box"><IonIcon icon={locationOutline} /></div>
                <p>Places</p>
              </div>
            </IonCol>
            <IonCol size="4">
              <div className="action-item" onClick={() => history.push('/rider/payments')}>
                <div className="icon-box"><IonIcon icon={walletOutline} /></div>
                <p>Wallet</p>
              </div>
            </IonCol>
            <IonCol size="4">
  <div className="action-item" onClick={() => history.push('/rider/book')}>
    <div className="icon-box"><IonIcon icon={carOutline} /></div>
    <p>Book Ride</p>
  </div>
</IonCol>
          </IonRow>
        </IonGrid>

        <div className="nearby-header ion-margin-top">
          <h3 className="section-title sora-font">Drivers Around You</h3>
          <span className="view-all" onClick={() => history.push('/rider/book')} style={{color: '#FF6B35', fontWeight: 600}}>View Map</span>
        </div>

        <div className="nearby-scroll">
          {nearbyDrivers.map((driver, i) => (
            <IonCard key={i} className="driver-mini-card">
              <IonCardContent>
                <IonAvatar className="mini-avatar">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=FF6B35&color=fff&size=64`} alt="driver" />
                </IonAvatar>
                <div className="driver-info">
                  <h6>{driver.name}</h6>
                  <div className="vehicle-row">
                    <IonIcon icon={driver.type === 'car' ? carOutline : bicycleOutline} />
                    <span>{driver.vehicle}</span>
                  </div>
                </div>
                <div className="dist-badge">{driver.distance}km</div>
              </IonCardContent>
            </IonCard>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RiderDashboard;