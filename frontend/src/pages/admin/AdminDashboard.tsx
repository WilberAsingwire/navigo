import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, 
  IonGrid, IonRow, IonCol, IonCard, IonCardContent, 
  IonIcon, IonText, IonButton, IonList, IonBadge, IonProgressBar, IonRefresher, IonRefresherContent
} from '@ionic/react';
import { peopleOutline, carOutline, alertCircleOutline, checkmarkCircleOutline, bicycleOutline, globeOutline, chevronDownCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const history = useHistory();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlatformData = async (event?: any) => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Admin API Error:", error);
      setStats({ totalUsers: 0, activeDrivers: 0, activeMotorists: 0, totalRevenue: "0", platformCommission: "0", pendingApprovals: 0 });
    } finally {
      setLoading(false);
      if (event) event.target.complete();
    }
  };

  useEffect(() => {
    fetchPlatformData();
    const interval = setInterval(fetchPlatformData, 60000); // Auto-refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <IonPage><IonContent className="admin-bg"><IonProgressBar type="indeterminate" color="success" /></IonContent></IonPage>
  );

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="admin-toolbar">
          <IonTitle className="sora-font">NatureTrack Command 🌍</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => history.push('/admin/map')}>
            <IonIcon icon={globeOutline} color="primary" />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding admin-bg">
        <IonRefresher slot="fixed" onIonRefresh={fetchPlatformData}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} refreshingSpinner="circles" />
        </IonRefresher>

        <IonCard className="revenue-card">
          <IonCardContent>
            <p style={{ opacity: 0.6 }}>Total Platform Volume (UGX)</p>
            <h1 className="sora-font">{stats.totalRevenue.toLocaleString()}</h1>
            <div className="commission-box">
              <p>Your 20% Earnings</p>
              <h2 style={{ color: '#00e676' }}>{stats.platformCommission.toLocaleString()} <small>UGX</small></h2>
            </div>
          </IonCardContent>
        </IonCard>

        <IonGrid className="ion-no-padding ion-margin-top">
          <IonRow>
            <IonCol size="6" onClick={() => history.push('/admin/users')}>
              <div className="admin-stat-box">
                <IonIcon icon={peopleOutline} color="primary" />
                <h3>{stats.totalUsers}</h3>
                <p>Total Users</p>
              </div>
            </IonCol>
            <IonCol size="6" onClick={() => history.push('/admin/approvals')}>
              <div className="admin-stat-box">
                <IonIcon icon={alertCircleOutline} color={stats.pendingApprovals > 0 ? "danger" : "medium"} />
                <h3>{stats.pendingApprovals}</h3>
                <p>Pending Review</p>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>

        <h3 className="section-title sora-font">System Status</h3>
        <div className={`alert-item ${stats.pendingApprovals > 0 ? 'warning' : 'success'}`}>
          <IonIcon icon={stats.pendingApprovals > 0 ? alertCircleOutline : checkmarkCircleOutline} />
          <div className="alert-text">
            <h4>{stats.pendingApprovals > 0 ? "Action Required" : "System Healthy"}</h4>
            <p>{stats.pendingApprovals > 0 ? `${stats.pendingApprovals} drivers need verification.` : "All systems operating globally."}</p>
          </div>
        </div>

        <IonButton expand="block" className="main-btn ion-margin-top" onClick={() => history.push('/admin/map')}>
          Launch Live Monitor Map
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;