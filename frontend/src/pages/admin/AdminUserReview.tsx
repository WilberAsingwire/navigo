import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonList, IonItem, IonLabel, IonAvatar, IonBadge,
  IonIcon, IonButton, IonModal, useIonToast, IonProgressBar, IonRefresher, IonRefresherContent
} from '@ionic/react';
import {
  checkmarkCircleOutline, closeCircleOutline, carOutline,
  cardOutline, shieldCheckmarkOutline, chevronDownCircleOutline
} from 'ionicons/icons';
import api from '../../services/api';
import './AdminUserReview.css';

const AdminUserReview: React.FC = () => {
  const [presentToast] = useIonToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async (event?: any) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/pending-drivers');
      setPendingDrivers(data);
    } catch (e) {
      console.error("Fetch error", e);
    } finally {
      setLoading(false);
      if (event) event.target.complete();
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.put(`/admin/drivers/${id}/${action}`);
      presentToast({
        message: `Driver ${action === 'approve' ? 'Approved' : 'Rejected'} successfully!`,
        duration: 2000,
        color: action === 'approve' ? 'success' : 'danger'
      });
      setSelectedUser(null);
      fetchPending();
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Operation failed', color: 'danger', duration: 3000 });
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="admin-toolbar">
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" /></IonButtons>
          <IonTitle className="sora-font">Pending Approvals</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-bg">
        <IonRefresher slot="fixed" onIonRefresh={fetchPending}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        {loading && <IonProgressBar type="indeterminate" color="success" />}

        <div className="ion-padding">
          <h3 className="sora-font" style={{ color: 'white' }}>Drivers Awaiting Review</h3>
          <p style={{ color: '#666' }}>Verify vehicle plates and permits before activating.</p>
        </div>

        <IonList lines="none" className="admin-list">
          {pendingDrivers.length === 0 && !loading ? (
            <div className="ion-text-center ion-padding">
              <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: '3rem', color: '#00e676' }} />
              <p style={{ color: '#666' }}>All caught up! No pending reviews.</p>
            </div>
          ) : (
            pendingDrivers.map(driver => (
              <IonItem key={driver._id} className="review-item" onClick={() => setSelectedUser(driver)}>
                <IonAvatar slot="start">
                  <img src={driver.avatar || `https://i.pravatar.cc/150?u=${driver._id}`} alt="driver" />
                </IonAvatar>
                <IonLabel>
                  <h2 style={{ color: 'white', fontWeight: 'bold' }}>{driver.name}</h2>
                  <p style={{ color: '#00e676' }}>{driver.role?.toUpperCase()}</p>
                </IonLabel>
                <IonBadge color="warning" slot="end">Review</IonBadge>
              </IonItem>
            ))
          )}
        </IonList>

        <IonModal isOpen={!!selectedUser} onDidDismiss={() => setSelectedUser(null)} className="review-modal">
          {selectedUser && (
            <div className="ion-padding modal-content" style={{ background: '#080808', height: '100%', color: 'white' }}>
              <h2 className="sora-font" style={{ color: '#00e676' }}>Verify {selectedUser.name}</h2>

              <div className="document-preview ion-margin-vertical">
                <p style={{ fontSize: '0.8rem', color: '#888' }}>Driver's Permit Photo:</p>
                <div style={{ width: '100%', height: '200px', background: '#1a1a1a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                   {selectedUser.permitPhotoUrl ? (
                     <img src={selectedUser.permitPhotoUrl} alt="permit" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                   ) : (
                     <IonIcon icon={cardOutline} style={{ fontSize: '3rem', opacity: 0.2 }} />
                   )}
                </div>
              </div>

              <div className="info-grid">
                <div className="info-box">
                  <IonIcon icon={carOutline} color="primary" />
                  <label>Vehicle Plate</label>
                  <p>{selectedUser.vehiclePlate || 'N/A'}</p>
                </div>
                <div className="info-box">
                  <IonIcon icon={cardOutline} color="primary" />
                  <label>Permit Number</label>
                  <p>{selectedUser.permitNumber || 'N/A'}</p>
                </div>
              </div>

              <div className="action-buttons ion-margin-top">
                <IonButton expand="block" color="success" className="main-btn" onClick={() => handleAction(selectedUser._id, 'approve')}>
                  <IonIcon icon={checkmarkCircleOutline} slot="start" /> Approve Driver
                </IonButton>
                <IonButton expand="block" fill="clear" color="danger" onClick={() => handleAction(selectedUser._id, 'reject')}>
                  <IonIcon icon={closeCircleOutline} slot="start" /> Reject Application
                </IonButton>
              </div>
            </div>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default AdminUserReview;
