import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonBackButton, IonItem, IonLabel, IonInput,
  IonButton, IonIcon, IonSpinner, IonToast, IonCard,
  IonCardContent, IonBadge, IonText, IonList
} from '@ionic/react';
import {
  cameraOutline, cardOutline, carOutline, personOutline,
  checkmarkCircleOutline, timeOutline, closeCircleOutline,
  cloudUploadOutline, documentTextOutline
} from 'ionicons/icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './DriverDocuments.css';

const API_URL = 'http://localhost:5000/api';

const DriverDocuments: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();

  const [nationalId, setNationalId] = useState('');
  const [drivingLicense, setDrivingLicense] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showToast, setShowToast] = useState(false);

  const verificationStatus = user?.verificationStatus || 'unverified';

  const handleSubmit = async () => {
    setError('');
    
    if (!drivingLicense.trim()) return setError('Driving license number is required');
    if (!vehiclePlate.trim()) return setError('Vehicle plate number is required');
    if (!vehicleModel.trim()) return setError('Vehicle model is required');

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/auth/upload-documents`, {
        userId: user?.id,
        nationalId: nationalId.trim(),
        drivingLicense: drivingLicense.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehicleModel: vehicleModel.trim(),
        vehicleColor: vehicleColor.trim(),
        // In production: upload actual images to Cloudinary
        vehiclePhoto: 'uploaded',
        selfieWithVehicle: 'uploaded'
      });

      setSuccess('Documents submitted! Admin will review within 24-48 hours.');
      setShowToast(true);
      
      // Update local user
      const savedUser = JSON.parse(localStorage.getItem('navigo_user') || '{}');
      savedUser.verificationStatus = 'pending';
      localStorage.setItem('navigo_user', JSON.stringify(savedUser));
      
      setTimeout(() => history.push('/driver/home'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case 'approved': return <IonBadge color="success"><IonIcon icon={checkmarkCircleOutline} /> Approved</IonBadge>;
      case 'pending': return <IonBadge color="warning"><IonIcon icon={timeOutline} /> Pending Review</IonBadge>;
      case 'rejected': return <IonBadge color="danger"><IonIcon icon={closeCircleOutline} /> Rejected</IonBadge>;
      default: return <IonBadge color="medium"><IonIcon icon={documentTextOutline} /> Not Submitted</IonBadge>;
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/driver/home" />
          </IonButtons>
          <IonTitle>Driver Verification</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="docs-content">
        <div className="docs-container">
          {/* Status Banner */}
          <IonCard className="status-card">
            <IonCardContent>
              <div className="status-header">
                <h3>Verification Status</h3>
                {getStatusBadge()}
              </div>
              {verificationStatus === 'unverified' && (
                <p>Submit your documents below to start driving with NAVIGO.</p>
              )}
              {verificationStatus === 'pending' && (
                <p>⏳ Your documents are being reviewed. This usually takes 24-48 hours.</p>
              )}
              {verificationStatus === 'approved' && (
                <p>🎉 You're verified! You can now accept rides.</p>
              )}
              {verificationStatus === 'rejected' && (
                <p>❌ Your documents were rejected. Please re-submit with correct information.</p>
              )}
            </IonCardContent>
          </IonCard>

          {/* Upload Form */}
          {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
            <>
              <h3>📄 Required Documents</h3>

              <IonList className="docs-form">
                <IonItem className="docs-input">
                  <IonIcon icon={cardOutline} slot="start" />
                  <IonLabel position="stacked">National ID Number</IonLabel>
                  <IonInput
                    value={nationalId}
                    onIonInput={e => setNationalId(e.detail.value!)}
                    placeholder="e.g., CF8901234ABCD"
                  />
                </IonItem>

                <IonItem className="docs-input">
                  <IonIcon icon={documentTextOutline} slot="start" />
                  <IonLabel position="stacked">Driving License Number *</IonLabel>
                  <IonInput
                    value={drivingLicense}
                    onIonInput={e => setDrivingLicense(e.detail.value!)}
                    placeholder="e.g., DL-2023-001234"
                  />
                </IonItem>

                <IonItem className="docs-input">
                  <IonIcon icon={carOutline} slot="start" />
                  <IonLabel position="stacked">Vehicle Plate Number *</IonLabel>
                  <IonInput
                    value={vehiclePlate}
                    onIonInput={e => setVehiclePlate(e.detail.value!)}
                    placeholder="e.g., UBA 123A"
                  />
                </IonItem>

                <IonItem className="docs-input">
                  <IonIcon icon={carOutline} slot="start" />
                  <IonLabel position="stacked">Vehicle Model *</IonLabel>
                  <IonInput
                    value={vehicleModel}
                    onIonInput={e => setVehicleModel(e.detail.value!)}
                    placeholder="e.g., Toyota Prius 2020"
                  />
                </IonItem>

                <IonItem className="docs-input">
                  <IonIcon icon={cameraOutline} slot="start" />
                  <IonLabel position="stacked">Vehicle Color</IonLabel>
                  <IonInput
                    value={vehicleColor}
                    onIonInput={e => setVehicleColor(e.detail.value!)}
                    placeholder="e.g., White"
                  />
                </IonItem>
              </IonList>

              {/* Photo Upload Placeholders */}
              <div className="photo-uploads">
                <div className="photo-upload-box">
                  <IonIcon icon={cloudUploadOutline} />
                  <p>Vehicle Photo</p>
                  <IonText color="medium">(Coming soon)</IonText>
                </div>
                <div className="photo-upload-box">
                  <IonIcon icon={personOutline} />
                  <p>Selfie with Vehicle</p>
                  <IonText color="medium">(Coming soon)</IonText>
                </div>
              </div>

              {error && <div className="docs-error">{error}</div>}

              <IonButton
                expand="block"
                className="submit-btn"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? <IonSpinner /> : 'Submit for Review'}
              </IonButton>
            </>
          )}
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={success}
          duration={3000}
          color="success"
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default DriverDocuments;