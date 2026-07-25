import React from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { peopleOutline, carOutline, statsChartOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const history = useHistory();
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>NAVIGO Admin</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ '--background': '#080c14', '--color': '#fff8f0' } as any} className="ion-padding">
        <h2 style={{ color: '#fff' }}>Welcome, Admin</h2>
        <IonCard style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, cursor: 'pointer' }} onClick={() => history.push('/admin/approvals')}>
          <IonCardContent>
            <IonIcon icon={peopleOutline} style={{ fontSize: 32, color: '#FF6B35' }} />
            <h3 style={{ color: '#fff' }}>Driver Approvals</h3>
            <p style={{ color: 'rgba(255,248,240,0.6)' }}>Review and approve new drivers</p>
          </IonCardContent>
        </IonCard>
        <IonCard style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, cursor: 'pointer' }} onClick={() => history.push('/admin/users')}>
          <IonCardContent>
            <IonIcon icon={statsChartOutline} style={{ fontSize: 32, color: '#FF6B35' }} />
            <h3 style={{ color: '#fff' }}>Users</h3>
            <p style={{ color: 'rgba(255,248,240,0.6)' }}>Manage all users</p>
          </IonCardContent>
        </IonCard>
        <IonCard style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, cursor: 'pointer' }} onClick={() => history.push('/admin/map')}>
          <IonCardContent>
            <IonIcon icon={carOutline} style={{ fontSize: 32, color: '#FF6B35' }} />
            <h3 style={{ color: '#fff' }}>Live Map</h3>
            <p style={{ color: 'rgba(255,248,240,0.6)' }}>Track all active rides</p>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;