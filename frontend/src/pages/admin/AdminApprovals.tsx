import React, { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonCard, IonCardContent, IonButton, IonIcon, IonBadge,
  IonSpinner, IonToast, IonLabel, IonList, IonItem, IonAvatar
} from '@ionic/react';
import {
  checkmarkCircleOutline, closeCircleOutline, personOutline,
  carOutline, callOutline, timeOutline, documentTextOutline
} from 'ionicons/icons';
import axios from 'axios';
import './AdminApprovals.css';

const API_URL = 'http://localhost:5000/api';

interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  verificationStatus: string;
  driverDocs?: {
    nationalId?: string;
    drivingLicense?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
  };
  createdAt: string;
}

const AdminApprovals: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    loadPendingDrivers();
  }, []);

  const loadPendingDrivers = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/admin/pending-drivers`);
      setDrivers(res.data.drivers || []);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (driverId: string, action: 'approve' | 'reject') => {
    const adminUser = JSON.parse(localStorage.getItem('navigo_user') || '{}');
    
    try {
      await axios.post(`${API_URL}/auth/admin/verify-driver`, {
        adminId: adminUser.id,
        driverId,
        action,
        reason: action === 'reject' ? 'Documents not satisfactory. Please re-upload clear documents.' : undefined
      });
      
      setToastMsg(action === 'approve' ? '✅ Driver approved!' : '❌ Driver rejected');
      setShowToast(true);
      loadPendingDrivers(); // Refresh list
    } catch (err: any) {
      setToastMsg(err.response?.data?.message || 'Action failed');
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Driver Approvals</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-content">
        <div className="admin-container">
          <h2>📋 Pending Drivers ({drivers.length})</h2>

          {isLoading ? (
            <div className="loading-center"><IonSpinner /> Loading...</div>
          ) : drivers.length === 0 ? (
            <div className="empty-state">
              <IonIcon icon={checkmarkCircleOutline} />
              <p>No pending approvals</p>
            </div>
          ) : (
            drivers.map(driver => (
              <IonCard key={driver.id} className="driver-card">
                <IonCardContent>
                  <div className="driver-header">
                    <IonAvatar>
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=FF6B35&color=fff&size=64`} alt={driver.name} />
                    </IonAvatar>
                    <div className="driver-info">
                      <h3>{driver.name}</h3>
                      <IonBadge color={driver.role === 'driver' ? 'primary' : 'warning'}>
                        {driver.role === 'driver' ? '🚗 Driver' : '🏍️ Motorist'}
                      </IonBadge>
                    </div>
                  </div>

                  <IonList className="driver-docs-list">
                    <IonItem lines="none">
                      <IonIcon icon={callOutline} slot="start" />
                      <IonLabel>{driver.phone}</IonLabel>
                    </IonItem>
                    {driver.driverDocs?.nationalId && (
                      <IonItem lines="none">
                        <IonIcon icon={cardOutline} slot="start" />
                        <IonLabel>NIN: {driver.driverDocs.nationalId}</IonLabel>
                      </IonItem>
                    )}
                    {driver.driverDocs?.drivingLicense && (
                      <IonItem lines="none">
                        <IonIcon icon={documentTextOutline} slot="start" />
                        <IonLabel>License: {driver.driverDocs.drivingLicense}</IonLabel>
                      </IonItem>
                    )}
                    {driver.driverDocs?.vehiclePlate && (
                      <IonItem lines="none">
                        <IonIcon icon={carOutline} slot="start" />
                        <IonLabel>Plate: {driver.driverDocs.vehiclePlate}</IonLabel>
                      </IonItem>
                    )}
                    {driver.driverDocs?.vehicleModel && (
                      <IonItem lines="none">
                        <IonIcon icon={carOutline} slot="start" />
                        <IonLabel>{driver.driverDocs.vehicleModel} ({driver.driverDocs.vehicleColor || 'N/A'})</IonLabel>
                      </IonItem>
                    )}
                  </IonList>

                  <div className="action-buttons">
                    <IonButton
                      expand="block"
                      color="success"
                      onClick={() => handleVerify(driver.id, 'approve')}
                    >
                      <IonIcon icon={checkmarkCircleOutline} slot="start" />
                      Approve
                    </IonButton>
                    <IonButton
                      expand="block"
                      color="danger"
                      fill="outline"
                      onClick={() => handleVerify(driver.id, 'reject')}
                    >
                      <IonIcon icon={closeCircleOutline} slot="start" />
                      Reject
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            ))
          )}
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMsg}
          duration={3000}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminApprovals;