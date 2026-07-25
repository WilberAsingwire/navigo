import React, { useState } from 'react';
import { 
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, 
  IonBackButton, IonSegment, IonSegmentButton, IonLabel, IonList, 
  IonItem, IonIcon, IonText, IonAccordion, IonAccordionGroup,
  IonTextarea, IonButton, IonSelect, IonSelectOption, useIonToast, IonBadge
} from '@ionic/react';
import { 
  helpCircleOutline, logoWhatsapp, mailOutline, callOutline, alertCircleOutline 
} from 'ionicons/icons';
import './CustomerSupport.css';

const RiderSupport: React.FC = () => {
  const [segment, setSegment] = useState<'faq' | 'report' | 'contact'>('faq');
  const [presentToast] = useIonToast();

  const handleReportSubmit = () => {
    presentToast({ message: 'Ticket #NT-9921 submitted! Check your email. 📩', duration: 3000, color: 'success' });
    setSegment('faq');
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="support-toolbar">
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle className="sora-font">Support Center</IonTitle>
        </IonToolbar>
        <IonToolbar className="support-toolbar">
          <IonSegment value={segment} onIonChange={e => setSegment(e.detail.value as any)}>
            <IonSegmentButton value="faq"><IonLabel>FAQs</IonLabel></IonSegmentButton>
            <IonSegmentButton value="report"><IonLabel>Report</IonLabel></IonSegmentButton>
            <IonSegmentButton value="contact"><IonLabel>Contact</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding support-bg">
        {segment === 'faq' && (
          <IonAccordionGroup>
            <IonAccordion value="fare" className="custom-accordion">
              <IonItem slot="header"><IonLabel>How are fares calculated?</IonLabel></IonItem>
              <div className="ion-padding" slot="content">Fares in Kampala are based on a base rate of 2,000 UGX + 800 UGX per kilometer.</div>
            </IonAccordion>
            {/* Add more FAQs here */}
          </IonAccordionGroup>
        )}

        {segment === 'report' && (
          <div className="report-form">
            <h3 className="sora-font">Open a Support Ticket</h3>
            <IonItem className="custom-input ion-margin-top" lines="none">
              <IonSelect placeholder="What is the issue?">
                <IonSelectOption value="billing">Billing Issue</IonSelectOption>
                <IonSelectOption value="lost">Lost Item</IonSelectOption>
                <IonSelectOption value="safety">Safety Concern</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonTextarea placeholder="Describe the incident..." rows={6} className="custom-textarea ion-margin-top" />
            <IonButton expand="block" className="main-btn ion-margin-top" onClick={handleReportSubmit}>Submit Ticket</IonButton>
          </div>
        )}

        {segment === 'contact' && (
          <div className="contact-grid">
             <div className="contact-card whatsapp">
                <IonIcon icon={logoWhatsapp} />
                <h4>WhatsApp Support</h4>
                <IonButton fill="clear" color="success">Chat Now</IonButton>
             </div>
             <div className="contact-card call">
                <IonIcon icon={callOutline} />
                <h4>24/7 Hotline</h4>
                <IonButton fill="clear" color="warning">Call 0800...</IonButton>
             </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default RiderSupport;