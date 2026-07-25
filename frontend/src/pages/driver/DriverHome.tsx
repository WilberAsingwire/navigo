import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle,
  IonGrid, IonRow, IonCol, IonIcon, IonText, IonButton, IonToggle
} from '@ionic/react';
import { carOutline, starOutline, leafOutline, timeOutline, walletOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './DriverHome.css';

const socket = io('http://localhost:5000');

const DriverHome: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState({ earnings: 0, rating: 0 });

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/drivers/stats');
      setStats({
        earnings: data.earnings || 0,
        rating: data.rating || 0
      });
    } catch (e) {
      console.error("Stats fetch error", e);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleStatusToggle = (online: boolean) => {
    setIsOnline(online);
    socket.emit('update_driver_status', {
      online,
      driverId: user?.id // Now using user context
    });
  };

  useEffect(() => {
    socket.on('new_ride_request', (request) => {
      if (isOnline) history.push('/driver/requests', { request });
    });
    return () => { socket.off('new_ride_request'); };
  }, [isOnline]);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="driver-toolbar">
          <div className="header-content ion-padding-horizontal">
            <h2 className="sora-font">Driver Dashboard</h2>
            <IonToggle checked={isOnline} onIonChange={e => handleStatusToggle(e.detail.checked)} color="success" />
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding driver-bg">
        <div className={`status-banner ${isOnline ? 'online' : 'offline'}`}>
          <IonIcon icon={isOnline ? leafOutline : timeOutline} />
          <IonText>{isOnline ? "You are visible to riders" : "Go online to see requests"}</IonText>
        </div>

        <IonGrid className="ion-no-padding ion-margin-top">
          <IonRow>
            <IonCol size="6"><div className="kpi-box"><IonIcon icon={walletOutline} color="success" /><h3 style={{fontSize: '1.5rem'}}>{stats.earnings.toLocaleString()} UGX</h3><p>Earnings Today</p></div></IonCol>
            <IonCol size="6"><div className="kpi-box"><IonIcon icon={starOutline} color="warning" /><h3 style={{fontSize: '1.5rem'}}>{stats.rating}</h3><p>Rating</p></div></IonCol>
          </IonRow>
        </IonGrid>

        <div className="action-grid ion-margin-top">
           <IonButton expand="block" fill="outline" onClick={() => history.push('/driver/earnings')}>My Wallet</IonButton>
           <IonButton expand="block" fill="outline" onClick={() => history.push('/driver/vehicle')}>Vehicle Info</IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DriverHome;
