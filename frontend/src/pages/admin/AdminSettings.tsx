import React, { useState } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonToggle, IonCard, IonCardContent, IonToast } from '@ionic/react';
import { settingsOutline, cashOutline, carOutline, bicycleOutline, pieChartOutline, phonePortraitOutline, mailOutline, shieldCheckmarkOutline, checkmarkCircleOutline } from 'ionicons/icons';

const AdminSettings: React.FC = () => {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [settings, setSettings] = useState({
    appName: 'NAVIGO', currency: 'UGX',
    supportPhone: '+256 800 100 200', supportEmail: 'support@navigo.ug',
    driverCommission: '15', bodaBaseFare: '1500', carBaseFare: '3000',
    comfortBaseFare: '5000', xlBaseFare: '8000',
    autoApproveDrivers: false, maintenanceMode: false,
  });

  const [editing, setEditing] = useState<string | null>(null);

  const handleSave = (section: string) => {
    setEditing(null);
    setToastMsg(`✅ ${section} settings saved!`);
    setShowToast(true);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#1A1A1A'} as any}>
        <IonToolbar style={{'--background': '#1A1A1A', '--color': '#fff'} as any}>
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" style={{color: '#fff'}} /></IonButtons>
          <IonTitle style={{color: '#fff'}}>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <div style={{padding: 14, maxWidth: 600, margin: '0 auto'}}>

          {/* GENERAL */}
          <IonCard style={{background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 12}}>
            <IonCardContent>
              <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14}}>
                <IonIcon icon={settingsOutline} style={{color: '#FF6B35', fontSize: 20, flexShrink: 0}} />
                <h3 style={{color: '#fff', margin: 0, fontSize: 15, fontWeight: 700}}>General</h3>
                <IonButton size="small" fill="clear" onClick={() => handleSave('General')} style={{marginLeft: 'auto', '--color': '#FF6B35'} as any}>
                  <IonIcon icon={checkmarkCircleOutline} /> Save
                </IonButton>
              </div>
              
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                <span style={{color: '#D1D5DB', fontSize: 14}}>App Name</span>
                <IonInput value={settings.appName} onIonInput={e => setSettings({...settings, appName: e.detail.value!})} 
                  style={{'--color': '#fff', '--placeholder-color': '#666', textAlign: 'right', fontWeight: 600, fontSize: 16, maxWidth: 200} as any} />
              </div>
              
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                <span style={{color: '#D1D5DB', fontSize: 14}}>Currency</span>
                <span style={{color: '#fff', fontWeight: 700, fontSize: 16}}>{settings.currency}</span>
              </div>

              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0'}}>
                <span style={{color: '#D1D5DB', fontSize: 14}}>Maintenance Mode</span>
                <IonToggle checked={settings.maintenanceMode} onIonChange={e => setSettings({...settings, maintenanceMode: e.detail.checked})} 
                  style={{'--background': '#2A2A2A', '--background-checked': '#FF6B35', '--handle-background': '#fff', '--handle-background-checked': '#fff'} as any} />
              </div>
            </IonCardContent>
          </IonCard>

          {/* FARE MANAGEMENT */}
          <IonCard style={{background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 12}}>
            <IonCardContent>
              <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14}}>
                <IonIcon icon={cashOutline} style={{color: '#FF6B35', fontSize: 20, flexShrink: 0}} />
                <h3 style={{color: '#fff', margin: 0, fontSize: 15, fontWeight: 700}}>Fare Management</h3>
                <IonButton size="small" fill="clear" onClick={() => handleSave('Fare')} style={{marginLeft: 'auto', '--color': '#FF6B35'} as any}>
                  <IonIcon icon={checkmarkCircleOutline} /> Save
                </IonButton>
              </div>
              
              {[
                {icon: bicycleOutline, color: '#ffab40', label: 'Boda Base Fare', key: 'bodaBaseFare', value: settings.bodaBaseFare},
                {icon: carOutline, color: '#4da6ff', label: 'Car Base Fare', key: 'carBaseFare', value: settings.carBaseFare},
                {icon: carOutline, color: '#b47fff', label: 'Comfort Base Fare', key: 'comfortBaseFare', value: settings.comfortBaseFare},
                {icon: carOutline, color: '#E8B86D', label: 'XL Base Fare', key: 'xlBaseFare', value: settings.xlBaseFare},
              ].map(item => (
                <div key={item.key} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <IonIcon icon={item.icon} style={{color: item.color, fontSize: 16, flexShrink: 0}} />
                    <span style={{color: '#D1D5DB', fontSize: 14}}>{item.label} (UGX)</span>
                  </div>
                  <IonInput type="number" value={item.value} onIonInput={e => setSettings({...settings, [item.key]: e.detail.value!})}
                    style={{'--color': '#fff', '--placeholder-color': '#666', textAlign: 'right', fontWeight: 700, fontSize: 18, maxWidth: 120, '--background': 'rgba(255,255,255,0.06)', borderRadius: 8, '--padding-end': 10} as any} />
                </div>
              ))}
            </IonCardContent>
          </IonCard>

          {/* DRIVER MANAGEMENT */}
          <IonCard style={{background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 12}}>
            <IonCardContent>
              <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14}}>
                <IonIcon icon={pieChartOutline} style={{color: '#FF6B35', fontSize: 20, flexShrink: 0}} />
                <h3 style={{color: '#fff', margin: 0, fontSize: 15, fontWeight: 700}}>Driver Management</h3>
               <IonButton size="small" fill="clear" onClick={() => handleSave('General')} className="settings-save-btn" style={{marginLeft: 'auto', '--color': '#FF6B35'} as any}>
  Save
</IonButton>
              </div>
              
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                <span style={{color: '#D1D5DB', fontSize: 14}}>Commission Rate (%)</span>
                <IonInput type="number" value={settings.driverCommission} onIonInput={e => setSettings({...settings, driverCommission: e.detail.value!})}
                  style={{'--color': '#fff', '--placeholder-color': '#666', textAlign: 'right', fontWeight: 700, fontSize: 18, maxWidth: 80, '--background': 'rgba(255,255,255,0.06)', borderRadius: 8, '--padding-end': 10} as any} />
              </div>

              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0'}}>
                <span style={{color: '#D1D5DB', fontSize: 14}}>Auto-Approve Drivers</span>
                <IonToggle checked={settings.autoApproveDrivers} onIonChange={e => setSettings({...settings, autoApproveDrivers: e.detail.checked})}
                  style={{'--background': '#2A2A2A', '--background-checked': '#FF6B35', '--handle-background': '#fff', '--handle-background-checked': '#fff'} as any} />
              </div>
            </IonCardContent>
          </IonCard>

          {/* SUPPORT */}
          <IonCard style={{background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 30}}>
            <IonCardContent>
              <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14}}>
                <IonIcon icon={shieldCheckmarkOutline} style={{color: '#FF6B35', fontSize: 20, flexShrink: 0}} />
                <h3 style={{color: '#fff', margin: 0, fontSize: 15, fontWeight: 700}}>Support Contact</h3>
                <IonButton size="small" fill="clear" onClick={() => handleSave('Support')} style={{marginLeft: 'auto', '--color': '#FF6B35'} as any}>
                  <IonIcon icon={checkmarkCircleOutline} /> Save
                </IonButton>
              </div>
              
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <IonIcon icon={phonePortraitOutline} style={{color: '#FF6B35', fontSize: 16, flexShrink: 0}} />
                  <span style={{color: '#D1D5DB', fontSize: 14}}>Phone</span>
                </div>
                <IonInput value={settings.supportPhone} onIonInput={e => setSettings({...settings, supportPhone: e.detail.value!})}
                  style={{'--color': '#fff', '--placeholder-color': '#666', textAlign: 'right', fontWeight: 600, fontSize: 16, maxWidth: 200, '--background': 'rgba(255,255,255,0.06)', borderRadius: 8, '--padding-end': 10} as any} />
              </div>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <IonIcon icon={mailOutline} style={{color: '#FF6B35', fontSize: 16, flexShrink: 0}} />
                  <span style={{color: '#D1D5DB', fontSize: 14}}>Email</span>
                </div>
                <IonInput value={settings.supportEmail} onIonInput={e => setSettings({...settings, supportEmail: e.detail.value!})}
                  style={{'--color': '#fff', '--placeholder-color': '#666', textAlign: 'right', fontWeight: 600, fontSize: 16, maxWidth: 250, '--background': 'rgba(255,255,255,0.06)', borderRadius: 8, '--padding-end': 10} as any} />
              </div>
            </IonCardContent>
          </IonCard>
        </div>

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={2000} color="success" position="top" />
      </IonContent>
    </IonPage>
  );
};

export default AdminSettings;