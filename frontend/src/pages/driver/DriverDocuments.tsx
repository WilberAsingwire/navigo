import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonBackButton, IonItem, IonLabel, IonInput,
  IonButton, IonIcon, IonSpinner, IonToast, IonCard,
  IonCardContent, IonBadge, IonText, IonList, IonSegment, IonSegmentButton
} from '@ionic/react';
import {
  cameraOutline, cardOutline, carOutline, personOutline,
  checkmarkCircleOutline, timeOutline, closeCircleOutline,
  cloudUploadOutline, documentTextOutline, bicycleOutline,
  starOutline, diamondOutline, flashOutline
} from 'ionicons/icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './DriverDocuments.css';

const API_URL = 'https://navigo-1-z7ne.onrender.com/api';

const VEHICLE_TYPES = [
  { id: 'boda', label: 'Boda Boda', icon: bicycleOutline, desc: 'Fast & affordable' },
  { id: 'standard', label: 'NAVIGO Go', icon: carOutline, desc: 'Everyday rides' },
  { id: 'comfort', label: 'Comfort', icon: starOutline, desc: 'Premium cars' },
  { id: 'xl', label: 'XL', icon: diamondOutline, desc: 'Spacious for 6+' },
];

const DriverDocuments: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();

  const [nationalId, setNationalId] = useState('');
  const [drivingLicense, setDrivingLicense] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleType, setVehicleType] = useState('standard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isFemaleDriver, setIsFemaleDriver] = useState(false);

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
        vehicleType: vehicleType,
        isFemaleDriver: isFemaleDriver,
        vehiclePhoto: 'uploaded',
        selfieWithVehicle: 'uploaded'
      });

      setSuccess('Documents submitted! Admin will review within 24-48 hours.');
      setShowToast(true);

      const savedUser = JSON.parse(localStorage.getItem('navigo_user') || '{}');
      savedUser.verificationStatus = 'pending';
      savedUser.isFemaleDriver = isFemaleDriver;
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
      <IonHeader className="ion-no-border" style={{'--background': '#080c14'} as any}>
        <IonToolbar style={{'--background': '#080c14', '--color': '#fff'} as any}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/driver/home" style={{color: '#fff'}} />
          </IonButtons>
          <IonTitle style={{color: '#fff'}}>Driver Verification</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="driver-docs-container">
        <div className="docs-container">
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

          {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
            <>
              <h3 className="docs-form-title">
                <IonIcon icon={documentTextOutline} /> Vehicle Type
              </h3>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px'
              }}>
                {VEHICLE_TYPES.map(type => (
                  <div
                    key={type.id}
                    onClick={() => setVehicleType(type.id)}
                    style={{
                      background: vehicleType === type.id ? 'rgba(255, 107, 51, 0.15)' : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${vehicleType === type.id ? '#FF6B35' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '16px', padding: '16px', textAlign: 'center', cursor: 'pointer',
                      transition: '0.2s', position: 'relative'
                    }}
                  >
                    <IonIcon icon={type.icon} style={{
                      fontSize: '24px', color: vehicleType === type.id ? '#FF6B35' : '#fff',
                      marginBottom: '8px', display: 'block', margin: '0 auto 8px'
                    }} />
                    <strong style={{ color: '#fff', display: 'block', fontSize: '14px' }}>{type.label}</strong>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{type.desc}</span>
                    {vehicleType === type.id && (
                      <IonBadge color="warning" style={{
                        position: 'absolute', top: '8px', right: '8px', fontSize: '10px'
                      }}>Selected</IonBadge>
                    )}
                  </div>
                ))}
              </div>

              <h3 className="docs-form-title">
                <IonIcon icon={documentTextOutline} /> Required Documents
              </h3>

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

              {/* Female Driver Toggle */}
              <div className={`female-driver-toggle ${isFemaleDriver ? 'active' : ''}`}>
                <div className="female-driver-info">
                  <span style={{ fontSize: 24 }}>👩</span>
                  <div>
                    <strong className="female-driver-title">Female Driver</strong>
                    <p className="female-driver-desc">Enable to appear in Women Preferred searches</p>
                  </div>
                  <div
                    onClick={() => setIsFemaleDriver(!isFemaleDriver)}
                    style={{
                      width: 52, height: 28, borderRadius: 14,
                      background: isFemaleDriver ? '#FF69B4' : 'rgba(255,255,255,0.2)',
                      position: 'relative', cursor: 'pointer', transition: '0.3s', flexShrink: 0
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3, left: isFemaleDriver ? 27 : 3, transition: '0.3s'
                    }} />
                  </div>
                </div>
              </div>

              <div className="photo-uploads">
                <div className="photo-upload-box">
                  <IonIcon icon={cloudUploadOutline} />
                  <p>Vehicle Photo</p>
                  <IonText className="hint" color="medium">Coming soon</IonText>
                </div>
                <div className="photo-upload-box">
                  <IonIcon icon={personOutline} />
                  <p>Selfie with Vehicle</p>
                  <IonText className="hint" color="medium">Coming soon</IonText>
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

  const [showToast, setShowToast] = useState(false);
  const [isFemaleDriver, setIsFemaleDriver] = useState(false);

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
        isFemaleDriver: isFemaleDriver,
        vehiclePhoto: 'uploaded',
        selfieWithVehicle: 'uploaded'
      });

      setSuccess('Documents submitted! Admin will review within 24-48 hours.');
      setShowToast(true);

      const savedUser = JSON.parse(localStorage.getItem('navigo_user') || '{}');
      savedUser.verificationStatus = 'pending';
      savedUser.isFemaleDriver = isFemaleDriver;
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
      <IonHeader className="ion-no-border" style={{'--background': '#080c14'} as any}>
        <IonToolbar style={{'--background': '#080c14', '--color': '#fff'} as any}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/driver/home" style={{color: '#fff'}} />
          </IonButtons>
          <IonTitle style={{color: '#fff'}}>Driver Verification</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="driver-docs-container">
        <div className="docs-container">
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

          {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
            <>
              <h3 className="docs-form-title">
                <IonIcon icon={documentTextOutline} /> Required Documents
              </h3>

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

              {/* Female Driver Toggle */}
              <div className={`female-driver-toggle ${isFemaleDriver ? 'active' : ''}`}>
                <div className="female-driver-info">
                  <span style={{ fontSize: 24 }}>👩</span>
                  <div>
                    <strong className="female-driver-title">Female Driver</strong>
                    <p className="female-driver-desc">Enable to appear in Women Preferred searches</p>
                  </div>
                  <div
                    onClick={() => setIsFemaleDriver(!isFemaleDriver)}
                    style={{
                      width: 52, height: 28, borderRadius: 14,
                      background: isFemaleDriver ? '#FF69B4' : 'rgba(255,255,255,0.2)',
                      position: 'relative', cursor: 'pointer', transition: '0.3s', flexShrink: 0
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3, left: isFemaleDriver ? 27 : 3, transition: '0.3s'
                    }} />
                  </div>
                </div>
              </div>

              <div className="photo-uploads">
                <div className="photo-upload-box">
                  <IonIcon icon={cloudUploadOutline} />
                  <p>Vehicle Photo</p>
                  <IonText className="hint" color="medium">Coming soon</IonText>
                </div>
                <div className="photo-upload-box">
                  <IonIcon icon={personOutline} />
                  <p>Selfie with Vehicle</p>
                  <IonText className="hint" color="medium">Coming soon</IonText>
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
