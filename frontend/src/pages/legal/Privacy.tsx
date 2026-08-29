import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent } from '@ionic/react';

const Privacy: React.FC = () => (
  <IonPage>
    <IonHeader className="ion-no-border" style={{ '--background': '#080c14' } as any}>
      <IonToolbar style={{ '--background': '#080c14', '--color': '#fff' } as any}>
        <IonButtons slot="start"><IonBackButton defaultHref="/register" style={{ color: '#fff' }} /></IonButtons>
        <IonTitle style={{ color: '#fff' }}>Privacy Policy</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding" style={{ '--background': '#080c14', '--color': '#D1D5DB' } as any}>
      <div style={{ maxWidth: 640, margin: '0 auto', lineHeight: 1.6, fontSize: 14 }}>
        <h2 style={{ color: '#fff' }}>NAVIGO Privacy Policy</h2>
        <p>This policy explains what information NAVIGO collects and how it is used.</p>

        <h3 style={{ color: '#fff' }}>1. Information we collect</h3>
        <p>Account details (name, phone number, optional email), trip data (pickup/drop-off locations, fares, ratings), and, for drivers, identification and vehicle documents used for verification. While a trip is active, we collect live GPS location to enable matching and tracking.</p>

        <h3 style={{ color: '#fff' }}>2. How we use it</h3>
        <p>To match riders with nearby drivers, calculate fares, process payments and driver payouts, provide customer support, and keep the platform safe (e.g. verifying driver documents).</p>

        <h3 style={{ color: '#fff' }}>3. Sharing</h3>
        <p>Your name, rating, and live location are shared with the other party of an active trip only (e.g. your driver sees your pickup location; you see your driver's live position). We do not sell personal data to third parties.</p>

        <h3 style={{ color: '#fff' }}>4. Data retention</h3>
        <p>Trip history and account data are kept for as long as your account is active and as required for accounting and dispute resolution.</p>

        <h3 style={{ color: '#fff' }}>5. Your choices</h3>
        <p>You can review and update your profile from the app at any time. To request deletion of your account and associated data, contact support@navigo.ug.</p>

        <h3 style={{ color: '#fff' }}>6. Contact</h3>
        <p>Questions about this policy can be sent to support@navigo.ug.</p>
      </div>
    </IonContent>
  </IonPage>
);

export default Privacy;
