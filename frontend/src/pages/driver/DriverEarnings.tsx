import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, 
  IonBackButton, IonGrid, IonRow, IonCol, IonCard, IonCardContent, 
  IonIcon, IonText, IonButton, IonList, IonProgressBar, IonRefresher, IonRefresherContent
} from '@ionic/react';
import { 
  trendingUpOutline, arrowDownOutline, receiptOutline, calendarOutline, chevronDownCircleOutline 
} from 'ionicons/icons';
import './DriverEarnings.css';

const DriverEarnings: React.FC = () => {
  const [earningsData, setEarningsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = async (event?: any) => {
    try {
      const res = await fetch('https://navigo-fzdo.onrender.com/api/drivers/earnings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setEarningsData(await res.json());
    } catch (e) { console.error(e); }
    finally {
      setLoading(false);
      if (event) event.target.complete();
    }
  };

  useEffect(() => { fetchEarnings(); }, []);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="earnings-toolbar">
          <IonButtons slot="start"><IonBackButton defaultHref="/driver/home" /></IonButtons>
          <IonTitle className="sora-font">Earnings & Payouts</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding earnings-bg">
        <IonRefresher slot="fixed" onIonRefresh={fetchEarnings}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        {loading && <IonProgressBar type="indeterminate" color="success" />}

        <IonCard className="balance-card">
          <IonCardContent>
            <p>Available for Payout</p>
            <h1 className="sora-font">{(earningsData?.balance || 0).toLocaleString()} <small>UGX</small></h1>
            <IonButton expand="block" className="payout-btn" disabled={earningsData?.balance < 50000}>
              <IonIcon icon={arrowDownOutline} slot="start" /> Request Payout
            </IonButton>
            <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '10px' }}>Min. Payout: 50,000 UGX</p>
          </IonCardContent>
        </IonCard>

        <h3 className="section-title sora-font">Recent Activity</h3>
        <IonList lines="none" className="earnings-list">
          {earningsData?.trips?.map((trip: any) => (
            <div key={trip._id} className="earning-item">
              <div className="item-top">
                <div className="passenger-info">
                  <IonIcon icon={receiptOutline} className="receipt-icon" />
                  <div><h4>{trip.passengerName}</h4><p>{new Date(trip.date).toLocaleDateString()}</p></div>
                </div>
                <IonText color="success"><b>+{(trip.fare * 0.8).toLocaleString()}</b></IonText>
              </div>
              <div className="item-details">
                <div className="detail-row"><span>Total Fare</span><span>{trip.fare.toLocaleString()}</span></div>
                <div className="detail-row commission"><span>NatureTrack (20%)</span><span>-{(trip.fare * 0.2).toLocaleString()}</span></div>
              </div>
            </div>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default DriverEarnings;