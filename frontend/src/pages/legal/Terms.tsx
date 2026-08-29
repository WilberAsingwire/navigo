import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent } from '@ionic/react';

const Terms: React.FC = () => (
  <IonPage>
    <IonHeader className="ion-no-border" style={{ '--background': '#080c14' } as any}>
      <IonToolbar style={{ '--background': '#080c14', '--color': '#fff' } as any}>
        <IonButtons slot="start"><IonBackButton defaultHref="/register" style={{ color: '#fff' }} /></IonButtons>
        <IonTitle style={{ color: '#fff' }}>Terms of Service</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding" style={{ '--background': '#080c14', '--color': '#D1D5DB' } as any}>
      <div style={{ maxWidth: 640, margin: '0 auto', lineHeight: 1.6, fontSize: 14 }}>
        <h2 style={{ color: '#fff' }}>NAVIGO Terms of Service</h2>
        <p>By creating a NAVIGO account and using our ride-hailing and delivery platform, you agree to the terms below.</p>

        <h3 style={{ color: '#fff' }}>1. The service</h3>
        <p>NAVIGO connects riders who need transport or delivery with independent drivers ("Captains") operating boda bodas, cars, and other vehicles in Uganda. NAVIGO is a technology platform — trips are performed by independent drivers, not NAVIGO employees.</p>

        <h3 style={{ color: '#fff' }}>2. Accounts</h3>
        <p>You must provide accurate registration information (name, phone number, and, for drivers, valid identification and vehicle documents). You are responsible for keeping your login credentials secure.</p>

        <h3 style={{ color: '#fff' }}>3. Fares and payments</h3>
        <p>Fares are calculated using distance, time, and vehicle type at the moment of booking, and may be paid in cash or from your NAVIGO wallet. NAVIGO charges drivers a commission on each completed trip; the current rate is shown in the driver app.</p>

        <h3 style={{ color: '#fff' }}>4. Conduct and safety</h3>
        <p>Riders and drivers must treat each other with respect. Drivers must hold valid licenses and keep vehicles roadworthy. NAVIGO may suspend accounts that violate these terms or put other users at risk.</p>

        <h3 style={{ color: '#fff' }}>5. Cancellations</h3>
        <p>Either party may cancel a trip before pickup. Repeated cancellations may affect your account standing.</p>

        <h3 style={{ color: '#fff' }}>6. Changes</h3>
        <p>We may update these terms from time to time. Continued use of NAVIGO after changes are posted means you accept the updated terms.</p>

        <h3 style={{ color: '#fff' }}>7. Contact</h3>
        <p>Questions about these terms can be sent to support@navigo.ug.</p>
      </div>
    </IonContent>
  </IonPage>
);

export default Terms;
