import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle,
  IonGrid, IonRow, IonCol, IonCard, IonCardContent,
  IonIcon, IonButton, IonAvatar, IonProgressBar, IonRefresher, IonRefresherContent
} from '@ionic/react';
import {
  notificationsOutline, carOutline, timeOutline,
  starOutline, walletOutline, locationOutline,
  arrowForwardOutline, bicycleOutline, chevronDownCircleOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoyaltyCard from '../../components/LoyaltyCard';
import api from '../../services/api';
import './CustomerDashboard.css';

const RiderDashboard: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async (event?: any) => {
    try {
      const { data: userProfile } = await api.get('/users/profile');
      setUserData(userProfile);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const { data: drivers } = await api.get(`/rides/nearby?lat=${latitude}&lng=${longitude}`);
          setNearbyDrivers(drivers);
        },
        (error) => {
          console.error("Location Error:", error);
          api.get('/rides/nearby?lat=0.3476&lng=32.5825').then(res => setNearbyDrivers(res.data));
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );

    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
      if (event) event.target.complete();
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="dashboard-toolbar">
          <div className="header-content ion-padding-horizontal">
            <div className="user-greeting">
              <h2 className="sora-font">Hello, {userData?.name?.split(' ')[0] || user?.name || 'User'} 👋</h2>
              <p>Ready for your next ride?</p>
            </div>
            <div className="header-actions">
               <IonAvatar className="header-avatar" onClick={() => history.push('/profile')}>
                  <img src={userData?.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user?.name || 'Rider') + "&background=FF6B35&color=fff&size=64"} alt="profile" />
               </IonAvatar>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding dashboard-bg">
        <IonRefresher slot="fixed" onIonRefresh={fetchDashboardData}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        {loading && <IonProgressBar type="indeterminate" color="success" />}

        {/* ZAWADI LOYALTY CARD */}
        <LoyaltyCard points={280} tier="silver" />

        <IonGrid className="ion-no-padding">
          <IonRow>
            <IonCol size="6">
              <div className="stat-box">
                <IonIcon icon={carOutline} color="primary" />
                <h3>{userData?.stats?.totalRides || 0}</h3>
                <p>Total Rides</p>
              </div>
            </IonCol>
            <IonCol size="6">
              <div className="stat-box">
                <IonIcon icon={starOutline} color="warning" />
                <h3>{userData?.stats?.rating || 5.0}</h3>
                <p>Your Rating</p>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>

        <div className="booking-section ion-margin-vertical">
          <IonButton expand="block" className="book-now-btn" onClick={() => history.push('/rider/book')}>
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
          </IonRow>
        </IonGrid>

        <div className="nearby-header ion-margin-top">
          <h3 className="section-title sora-font">Drivers Around You</h3>
          <span className="view-all" onClick={() => history.push('/rider/book')}>View Map</span>
        </div>

        <div className="nearby-scroll">
          {nearbyDrivers.map((driver, i) => (
            <IonCard key={i} className="driver-mini-card">
              <IonCardContent>
                <IonAvatar className="mini-avatar">
                  <img src={`https://i.pravatar.cc/150?u=${driver.id}`} alt="driver" />
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