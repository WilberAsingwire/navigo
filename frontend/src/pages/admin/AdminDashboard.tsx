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
      <IonContent className="ion-padding" style={{'--background': '#080c14', '--color': '#fff8f0'} as any}>
        <h2 style={{color: '#fff', marginBottom: 20}}>Welcome, Admin</h2>
        
        <div onClick={() => history.push('/admin/approvals')} style={{background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 12, cursor: 'pointer'}}>
          <IonIcon icon={peopleOutline} style={{fontSize: 30, color: '#FF6B35'}} />
          <h3 style={{color: '#fff', margin: '8px 0'}}>Driver Approvals</h3>
          <p style={{color: 'rgba(255,248,240,0.6)', fontSize: 13, margin: 0}}>Review and approve new drivers</p>
        </div>

        <div onClick={() => history.push('/admin/users')} style={{background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 12, cursor: 'pointer'}}>
          <IonIcon icon={statsChartOutline} style={{fontSize: 30, color: '#FF6B35'}} />
          <h3 style={{color: '#fff', margin: '8px 0'}}>Users</h3>
          <p style={{color: 'rgba(255,248,240,0.6)', fontSize: 13, margin: 0}}>Manage all users</p>
        </div>

        <div onClick={() => history.push('/admin/map')} style={{background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, cursor: 'pointer'}}>
          <IonIcon icon={carOutline} style={{fontSize: 30, color: '#FF6B35'}} />
          <h3 style={{color: '#fff', margin: '8px 0'}}>Live Map</h3>
          <p style={{color: 'rgba(255,248,240,0.6)', fontSize: 13, margin: 0}}>Track all active rides</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;