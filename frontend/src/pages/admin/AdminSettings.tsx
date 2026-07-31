import React, { useState } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonToggle, IonCard, IonCardContent, IonToast } from '@ionic/react';
import { saveOutline, settingsOutline, cashOutline, carOutline, bicycleOutline, pieChartOutline, phonePortraitOutline, mailOutline, shieldCheckmarkOutline } from 'ionicons/icons';

const AdminSettings: React.FC = () => {
  const [showToast, setShowToast] = useState(false);
  const [settings, setSettings] = useState({
    appName: 'NAVIGO',
    currency: 'UGX',
    supportPhone: '+256 800 100 200',
    supportEmail: 'support@navigo.ug',
    driverCommission: '15',
    bodaBaseFare: '1500',
    carBaseFare: '3000',
    comfortBaseFare: '5000',
    xlBaseFare: '8000',
    maxRiderCancel: '5',
    autoApproveDrivers: false,
    maintenanceMode: false,
  });

  const handleSave = () => {
    setShowToast(true);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#1A1A1A'} as any}>
        <IonToolbar style={{'--background': '#1A1A1A', '--color': '#fff'} as any}>
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" style={{color: '#fff'}} /></IonButtons>
          <IonTitle style={{color: '#fff'}}>Settings</IonTitle>
          <IonButton slot="end" fill="clear" onClick={handleSave}>
            <IonIcon icon={saveOutline} style={{color: '#FF6B35', fontSize: 20}} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <div style={{padding: 14, maxWidth: 600, margin: '0 auto'}}>

          {/* General Settings */}
          <IonCard style={{background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14}}>
            <IonCardContent>
              <h3 style={{color: '#fff', margin: '0 0 12px', fontSize: 15}}><IonIcon icon={settingsOutline} style={{color: '#FF6B35', marginRight: 6}} /> General</h3>
              <IonItem style={{'--background': 'transparent', color: '#fff'}}><IonLabel position="stacked" style={{color: '#D1D5DB'}}>App Name</IonLabel><IonInput value={settings.appName} onIonInput={e => setSettings({...settings, appName: e.detail.value!})} /></IonItem>
              <IonItem style={{'--background': 'transparent', color: '#fff'}}><IonLabel position="stacked" style={{color: '#D1D5DB'}}>Currency</IonLabel><IonInput value={settings.currency} /></IonItem>
              <IonItem style={{'--background': 'transparent', color: '#fff'}}><IonLabel style={{color: '#D1D5DB'}}>Maintenance Mode</IonLabel><IonToggle checked={settings.maintenanceMode} onIonChange={e => setSettings({...settings, maintenanceMode: e.detail.checked})} color="warning" /></IonItem>
            </IonCardContent>
          </IonCard>

          {/* Pricing */}
          <IonCard style={{background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14}}>
            <IonCardContent>
              <h3 style={{color: '#fff', margin: '0 0 12px', fontSize: 15}}><IonIcon icon={cashOutline} style={{color: '#FF6B35', marginRight: 6}} /> Fare Management</h3>
              <IonItem style={{'--background': 'transparent', color: '#fff'}}><IonIcon icon={bicycleOutline} slot="start" style={{color: '#ffab40'}} /><IonLabel style={{color: '#D1D5DB'}}>Boda Base Fare (UGX)</IonLabel><IonInput type="number" value={settings.bodaBaseFare} /></IonItem>
              <IonItem style={{'--background': 'transparent', color: '#fff'}}><IonIcon icon={carOutline} slot="start" style={{color: '#4da6ff'}} /><IonLabel style={{color: '#D1D5DB'}}>Car Base Fare (UGX)</IonLabel><IonInput type="number" value={settings.carBaseFare} /></IonItem>
              <IonItem style={{'--background': 'transparent', color: '#fff'}}><IonIcon icon={carOutline} slot="start" style={{color: '#b47fff'}} /><IonLabel style={{color: '#D1D5DB'}}>Comfort Base Fare (UGX)</IonLabel><IonInput type="number" value={settings.comfortBaseFare} /></IonItem>
              <IonItem style={{'--background': 'transparent', color: '#fff'}}><IonIcon icon={carOutline} slot="start" style={{color: '#E8B86D'}} /><IonLabel style={{color: '#D1D5DB'}}>XL Base Fare (UGX)</IonLabel><IonInput type="number" value={settings.xlBaseFare} /></IonItem>
            </IonCardContent>
          </IonCard>

          {/* Driver Settings */}
          <IonCard style={{background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14}}>
            <IonCardContent>
              <h3 style={{color: '#fff', margin: '0 0 12px', fontSize: 15}}><IonIcon icon={pieChartOutline} style={{color: '#FF6B35', marginRight: 6}} /> Driver Management</h3>
              <IonItem style={{'--background': 'transparent', color: '#fff'}}><IonLabel style={{color: '#D1D5DB'}}>Commission Rate (%)</IonLabel><IonInput type="number" value={settings.driverCommission} /></IonItem>
              <IonItem style={{'--background': 'transparent', color: '#fff'}}><IonLabel style={{color: '#D1D5DB'}}>Auto-Approve Drivers</IonLabel><IonToggle checked={settings.autoApproveDrivers} color="success" /></IonItem>
            </IonCardContent>
          </IonCard>

          {/* Contact */}
          <IonCard style={{background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14}}>
            <IonCardContent>
              <h3 style={{color: '#fff', margin: '0 0 12px', fontSize: 15}}><IonIcon icon={shieldCheckmarkOutline} style={{color: '#FF6B35', marginRight: 6}} /> Support Contact</h3>
              <IonItem style={{'--background': 'transparent', color: '#fff'}}><IonIcon icon={phonePortraitOutline} slot="start" style={{color: '#FF6B35'}} /><IonLabel position="stacked" style={{color: '#D1D5DB'}}>Phone</IonLabel><IonInput value={settings.supportPhone} /></IonItem>
              <IonItem style={{'--background': 'transparent', color: '#fff'}}><IonIcon icon={mailOutline} slot="start" style={{color: '#FF6B35'}} /><IonLabel position="stacked" style={{color: '#D1D5DB'}}>Email</IonLabel><IonInput value={settings.supportEmail} /></IonItem>
            </IonCardContent>
          </IonCard>

          <IonButton expand="block" onClick={handleSave} style={{'--background': '#FF6B35', '--border-radius': 12, fontWeight: 700, marginBottom: 30} as any}>
            <IonIcon icon={saveOutline} slot="start" /> Save All Settings
          </IonButton>
        </div>

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message="✅ Settings saved successfully!" duration={2000} color="success" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default AdminSettings;