import React from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonCard, IonCardContent, IonIcon, IonButton, IonBadge } from '@ionic/react';
import { phonePortraitOutline, timeOutline, checkmarkCircleOutline, notificationsOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

// USSD booking (dial a shortcode to book without internet) is a planned
// feature — there is no shortcode provisioned with a telco and no backend
// USSD session handler in this codebase yet. This screen previously showed
// a fake "*284*624#" number with a working-looking "Dial Now" button, which
// would just place a normal phone call to a made-up number and do nothing.
// It's now clearly labeled as not-yet-available so nobody expects it to work.
const USSDInfo: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/" /></IonButtons>
          <IonTitle>Offline Booking</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding" style={{'--background': '#080c14', '--color': '#fff8f0'} as any}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <IonIcon icon={phonePortraitOutline} style={{ fontSize: 64, color: '#FF6B35' }} />
          <h2 style={{ color: '#fff' }}>Book Without Internet</h2>
          <p style={{ color: 'rgba(255,248,240,0.6)' }}>Works on any phone — even a basic feature phone.</p>
        </div>

        <IonCard style={{ background: 'linear-gradient(135deg, #334155, #1e293b)', borderRadius: 16, textAlign: 'center', padding: 20 }}>
          <IonCardContent>
            <IonIcon icon={timeOutline} style={{ fontSize: 32, color: '#FFC107' }} />
            <h1 style={{ color: '#fff', fontSize: 22, margin: '8px 0' }}>Coming Soon</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              We're setting up a USSD shortcode with MTN and Airtel so you'll be able to book a ride by dialing a
              code — no internet needed. It isn't live yet, so there's no number to dial today.
            </p>
            <IonButton expand="block" fill="outline" color="light" onClick={() => history.push('/customer/support')}>
              <IonIcon icon={notificationsOutline} slot="start" />
              Notify me when it launches
            </IonButton>
          </IonCardContent>
        </IonCard>

        <h3 style={{ color: '#fff', marginTop: 24 }}>How It Will Work</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { step: '1', text: 'Dial a NAVIGO shortcode on any phone', icon: phonePortraitOutline },
            { step: '2', text: 'Select "Book a Ride" from the menu', icon: checkmarkCircleOutline },
            { step: '3', text: 'Enter your pickup location', icon: checkmarkCircleOutline },
            { step: '4', text: 'Receive driver details via SMS', icon: checkmarkCircleOutline },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                {item.step}
              </div>
              <IonIcon icon={item.icon} style={{ color: '#FF6B35', fontSize: 20 }} />
              <span style={{ color: '#fff', fontSize: 14 }}>{item.text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <IonBadge color="medium">🇺🇬 Planned for MTN & Airtel Uganda</IonBadge>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default USSDInfo;