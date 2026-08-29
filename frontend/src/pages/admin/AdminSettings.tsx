import React, { useState, useEffect } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonToggle, IonCard, IonCardContent, IonToast, IonSpinner } from '@ionic/react';
import { settingsOutline, cashOutline, carOutline, bicycleOutline, pieChartOutline, phonePortraitOutline, mailOutline, shieldCheckmarkOutline, checkmarkCircleOutline } from 'ionicons/icons';
import api from '../../services/api';

interface Settings {
  appName: string; currency: string;
  supportPhone: string; supportEmail: string;
  driverCommission: string; bodaBaseFare: string; carBaseFare: string;
  comfortBaseFare: string; xlBaseFare: string;
  autoApproveDrivers: boolean; maintenanceMode: boolean;
}

const DEFAULTS: Settings = {
  appName: 'NAVIGO', currency: 'UGX',
  supportPhone: '+256 800 100 200', supportEmail: 'support@navigo.ug',
  driverCommission: '10', bodaBaseFare: '800', carBaseFare: '1500',
  comfortBaseFare: '2500', xlBaseFare: '4000',
  autoApproveDrivers: false, maintenanceMode: false,
};

const AdminSettings: React.FC = () => {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/auth/admin/settings');
        setSettings({ ...DEFAULTS, ...res.data });
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (section: string, keys: (keyof Settings)[]) => {
    setSavingSection(section);
    try {
      const payload: Record<string, any> = {};
      for (const k of keys) payload[k] = settings[k];
      await api.put('/auth/admin/settings', payload);
      setToastColor('success');
      setToastMsg(`✅ ${section} settings saved!`);
    } catch (e: any) {
      setToastColor('danger');
      setToastMsg(e.response?.data?.message || `Failed to save ${section} settings`);
    } finally {
      setSavingSection(null);
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent style={{'--background': '#080c14'} as any}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
            <IonSpinner name="crescent" color="warning" />
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading settings...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

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
                <IonButton size="small" fill="clear" disabled={savingSection === 'General'}
                  onClick={() => handleSave('General', ['appName', 'maintenanceMode'])} style={{marginLeft: 'auto', '--color': '#FF6B35'} as any}>
                  {savingSection === 'General' ? <IonSpinner name="crescent" /> : <><IonIcon icon={checkmarkCircleOutline} /> Save</>}
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
                <IonButton size="small" fill="clear" disabled={savingSection === 'Fare'}
                  onClick={() => handleSave('Fare', ['bodaBaseFare', 'carBaseFare', 'comfortBaseFare', 'xlBaseFare'])} style={{marginLeft: 'auto', '--color': '#FF6B35'} as any}>
                  {savingSection === 'Fare' ? <IonSpinner name="crescent" /> : <><IonIcon icon={checkmarkCircleOutline} /> Save</>}
                </IonButton>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: -6, marginBottom: 10 }}>
                Saved here for reference only — the live pricing engine still uses its own fixed rate table until fare calculation is wired to read these values.
              </p>
              
              {[
                {icon: bicycleOutline, color: '#ffab40', label: 'Boda Base Fare', key: 'bodaBaseFare' as const, value: settings.bodaBaseFare},
                {icon: carOutline, color: '#4da6ff', label: 'Car Base Fare', key: 'carBaseFare' as const, value: settings.carBaseFare},
                {icon: carOutline, color: '#b47fff', label: 'Comfort Base Fare', key: 'comfortBaseFare' as const, value: settings.comfortBaseFare},
                {icon: carOutline, color: '#E8B86D', label: 'XL Base Fare', key: 'xlBaseFare' as const, value: settings.xlBaseFare},
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
                <IonButton size="small" fill="clear" disabled={savingSection === 'Driver'}
                  onClick={() => handleSave('Driver', ['driverCommission', 'autoApproveDrivers'])} className="settings-save-btn" style={{marginLeft: 'auto', '--color': '#FF6B35'} as any}>
                  {savingSection === 'Driver' ? <IonSpinner name="crescent" /> : 'Save'}
                </IonButton>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: -6, marginBottom: 10 }}>
                Commission rate here is saved for reference — the live commission is set by the <code>NAVIGO_COMMISSION_RATE</code> server environment variable (default 10%).
              </p>
              
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
                <IonButton size="small" fill="clear" disabled={savingSection === 'Support'}
                  onClick={() => handleSave('Support', ['supportPhone', 'supportEmail'])} style={{marginLeft: 'auto', '--color': '#FF6B35'} as any}>
                  {savingSection === 'Support' ? <IonSpinner name="crescent" /> : <><IonIcon icon={checkmarkCircleOutline} /> Save</>}
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

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={2500} color={toastColor} position="top" />
      </IonContent>
    </IonPage>
  );
};

export default AdminSettings;
