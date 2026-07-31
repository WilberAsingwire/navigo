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

  const userData = { name: user?.name || 'Rider', stats: { totalRides: 5, rating: 4.8 } };

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const handleRefresh = (event: any) => { setTimeout(() => { event.target.complete(); }, 800); };

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#080c14'} as any}>
        <IonToolbar style={{'--background': '#080c14'}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}>
            <div>
              <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 700 }}>Hello, {userData.name.split(' ')[0]} 👋</h2>
              <p style={{ color: '#D1D5DB', margin: 4, fontSize: 13 }}>Ready for your next ride?</p>
            </div>
            <IonAvatar onClick={() => history.push('/rider/profile')} style={{ width: 40, height: 40, marginRight: 8, cursor: 'pointer' }}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Rider')}&background=FF6B35&color=fff&size=64`} alt="profile" />
            </IonAvatar>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>
        {loading && <IonProgressBar type="indeterminate" color="warning" />}

        <div style={{ padding: 12, maxWidth: 500, margin: '0 auto' }}>
          <LoyaltyCard points={280} tier="silver" />

          <IonGrid className="ion-no-padding">
            <IonRow>
              <IonCol size="6">
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, textAlign: 'center', marginBottom: 8 }}>
                  <IonIcon icon={carOutline} style={{ color: '#FF6B35', fontSize: 20, marginBottom: 4 }} />
                  <h3 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 700 }}>{userData.stats.totalRides}</h3>
                  <p style={{ color: '#D1D5DB', fontSize: 11, margin: 2 }}>Total Rides</p>
                </div>
              </IonCol>
              <IonCol size="6">
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, textAlign: 'center', marginBottom: 8 }}>
                  <IonIcon icon={starOutline} style={{ color: '#FF6B35', fontSize: 20, marginBottom: 4 }} />
                  <h3 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 700 }}>{userData.stats.rating}</h3>
                  <p style={{ color: '#D1D5DB', fontSize: 11, margin: 2 }}>Your Rating</p>
                </div>
              </IonCol>
            </IonRow>
          </IonGrid>

          <IonButton expand="block" onClick={() => history.push('/rider/book')}
            style={{'--background': '#FF6B35', '--background-activated': '#e55a2a', '--border-radius': 14, fontWeight: 700, height: 50, fontSize: 15, marginBottom: 14} as any}>
            <IonIcon icon={carOutline} slot="start" />
            Request a Ride
            <span style={{ fontSize: 11, opacity: 0.8, marginLeft: 8 }}>Cars & Boda nearby</span>
          </IonButton>

          <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10, fontWeight: 700 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'History', icon: timeOutline, path: '/rider/history' },
              { label: 'Places', icon: locationOutline, path: '/rider/places' },
              { label: 'Wallet', icon: walletOutline, path: '/rider/payments' },
              { label: 'Book', icon: carOutline, path: '/rider/book' },
            ].map(item => (
              <div key={item.label} onClick={() => history.push(item.path)} style={{ textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                  <IonIcon icon={item.icon} style={{ color: '#FF6B35', fontSize: 20 }} />
                </div>
                <span style={{ color: '#D1D5DB', fontSize: 10 }}>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>Drivers Around You</h3>
            <span onClick={() => history.push('/rider/book')} style={{ color: '#FF6B35', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 8 }}>View Map</span>
          </div>

          {nearbyDrivers.map((driver, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <IonAvatar style={{ width: 38, height: 38 }}>
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=FF6B35&color=fff&size=64`} alt={driver.name} />
              </IonAvatar>
              <div style={{ flex: 1 }}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{driver.name}</span>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2 }}>
                  <IonIcon icon={driver.type === 'car' ? carOutline : bicycleOutline} style={{ fontSize: 12, marginRight: 4 }} />
                  {driver.vehicle}
                </p>
              </div>
              <span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>{driver.distance}km</span>
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RiderDashboard;