import React from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonCard, IonCardContent, IonIcon, IonButton, IonBadge } from '@ionic/react';
import { phonePortraitOutline, callOutline, helpCircleOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

const USSDInfo: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Offline Booking</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding auth-container" style={{'--background': 'var(--nav-bg)', '--color': '#fff8f0'} as any}>
        
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <IonIcon icon={phonePortraitOutline} style={{ fontSize: 64, color: 'var(--navigo-orange)' }} />
          <h2 style={{ color: 'var(--nav-text)' }}>Book Without Internet</h2>
          <p style={{ color: 'rgba(255,248,240,0.6)' }}>Works on ANY phone — even kabiriti!</p>
        </div>

        <IonCard style={{ background: 'var(--navigo-orange)', borderRadius: 12, textAlign: 'center', padding: 20 }}>
          <IonCardContent>
            <h1 style={{ color: 'var(--nav-text)', fontSize: 36, margin: 0, letterSpacing: 4 }}>*284*624#</h1>
            <p style={{ color: 'var(--nav-text-secondary)', marginTop: 8 }}>Dial this number to book a ride</p>
            <IonButton expand="block" fill="solid" color="light" onClick={() => window.open('tel:*284*624#', '_system')}>
              <IonIcon icon={callOutline} slot="start" />
              Dial Now
            </IonButton>
          </IonCardContent>
        </IonCard>

        <h3 style={{ color: 'var(--nav-text)', marginTop: 24 }}>How It Works</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { step: '1', text: 'Dial *284*624# on any phone', icon: callOutline },
            { step: '2', text: 'Select "Book a Ride" from the menu', icon: checkmarkCircleOutline },
            { step: '3', text: 'Enter your pickup location', icon: helpCircleOutline },
            { step: '4', text: 'Receive driver details via SMS', icon: checkmarkCircleOutline },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--nav-card-soft)', borderRadius: 12, padding: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navigo-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                {item.step}
              </div>
              <IonIcon icon={item.icon} style={{ color: 'var(--navigo-orange)', fontSize: 20 }} />
              <span style={{ color: 'var(--nav-text)', fontSize: 14 }}>{item.text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <IonBadge color="success">🇺🇬 Available on MTN & Airtel Uganda</IonBadge>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default USSDInfo;