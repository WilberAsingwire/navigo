import React, { useState } from 'react';
import { 
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, 
  IonBackButton, IonSegment, IonSegmentButton, IonLabel, IonList, 
  IonItem, IonIcon, IonText, IonAccordion, IonAccordionGroup,
  IonTextarea, IonButton, IonSelect, IonSelectOption, useIonToast, 
  IonBadge, IonCard, IonCardContent
} from '@ionic/react';
import { 
  helpCircleOutline, logoWhatsapp, mailOutline, callOutline, 
  alertCircleOutline, chatbubbleEllipsesOutline, locationOutline,
  checkmarkCircleOutline, documentTextOutline, starOutline,
  shieldCheckmarkOutline, timeOutline, cardOutline
} from 'ionicons/icons';
import './CustomerSupport.css';

const RiderSupport: React.FC = () => {
  const [segment, setSegment] = useState<'faq' | 'report' | 'contact'>('faq');
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [presentToast] = useIonToast();

  const handleReportSubmit = () => {
    if (!reportType) {
      presentToast({ message: 'Please select an issue type', color: 'warning', duration: 2000 });
      return;
    }
    presentToast({ message: '✅ Ticket #NT-' + Math.floor(Math.random() * 9000 + 1000) + ' submitted! We\'ll respond within 2 hours.', duration: 3000, color: 'success' });
    setReportType('');
    setReportDescription('');
    setSegment('faq');
  };

  const faqs = [
    { id: 'fare', question: 'How are fares calculated?', answer: 'Fares are based on: Base fare (varies by ride type) + Distance (per km) + Time (per minute). Boda starts at UGX 1,500, NAVIGO Go at UGX 3,000, Comfort at UGX 5,000, and XL at UGX 8,000.' },
    { id: 'payment', question: 'What payment methods are accepted?', answer: 'We accept Cash, MTN Mobile Money, Airtel Money, and Credit/Debit Cards. You can manage your payment methods in the Wallet section.' },
    { id: 'cancel', question: 'How do I cancel a ride?', answer: 'You can cancel from the Active Ride screen. Cancellation within 2 minutes of booking is free. After that, a small fee may apply.' },
    { id: 'safety', question: 'What safety features are available?', answer: 'NAVIGO offers: Boda Safe™ certified drivers, Women Preferred mode, Emergency SOS button, live GPS tracking, and 24/7 support team.' },
    { id: 'refund', question: 'How do I get a refund?', answer: 'Refunds are processed automatically for cancelled rides. For billing disputes, open a support ticket and our team will resolve it within 24 hours.' },
    { id: 'driver', question: 'How do I become a driver?', answer: 'Sign up as a Driver or Motorist, upload your documents (license, ID, vehicle photos), and our team will verify you within 24-48 hours.' },
    { id: 'offline', question: 'Can I book without internet?', answer: 'Yes! Dial *284*624# on any phone (even kabiriti) to book a ride via USSD. Works on MTN and Airtel networks.' },
    { id: 'rewards', question: 'How do Zawadi Rewards work?', answer: 'Earn points on every ride! 10 pts per ride, bonus points for referrals and 5-star ratings. Redeem for free rides, airtime, and cash rewards.' },
  ];

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle>Support Center</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={segment} onIonChange={e => setSegment(e.detail.value as any)}>
            <IonSegmentButton value="faq"><IonLabel style={{ fontSize: 11 }}>📖 FAQs</IonLabel></IonSegmentButton>
            <IonSegmentButton value="report"><IonLabel style={{ fontSize: 11 }}>🚨 Report</IonLabel></IonSegmentButton>
            <IonSegmentButton value="contact"><IonLabel style={{ fontSize: 11 }}>📞 Contact</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <div style={{ padding: 14, maxWidth: 600, margin: '0 auto' }}>

          {segment === 'faq' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, background: 'rgba(255,107,53,0.06)', borderRadius: 12, padding: 12 }}>
                <IonIcon icon={helpCircleOutline} style={{ color: '#FF6B35', fontSize: 22 }} />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0 }}>Can't find what you're looking for? <span onClick={() => setSegment('report')} style={{ color: '#FF6B35', cursor: 'pointer', textDecoration: 'underline' }}>Open a ticket</span> or <span onClick={() => setSegment('contact')} style={{ color: '#FF6B35', cursor: 'pointer', textDecoration: 'underline' }}>contact us</span>.</p>
              </div>

              <IonAccordionGroup>
                {faqs.map(faq => (
                  <IonAccordion key={faq.id} value={faq.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 6 }}>
                    <IonItem slot="header" style={{ '--background': 'transparent', color: '#fff', fontSize: 13, fontWeight: 500 } as any}>
                      <IonIcon icon={helpCircleOutline} slot="start" style={{ color: '#FF6B35', fontSize: 16 }} />
                      <IonLabel>{faq.question}</IonLabel>
                    </IonItem>
                    <div className="ion-padding" slot="content" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 1.6 }}>
                      {faq.answer}
                    </div>
                  </IonAccordion>
                ))}
              </IonAccordionGroup>
            </>
          )}

          {segment === 'report' && (
            <div>
              <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 4 }}>🚨 Report an Issue</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 16 }}>We'll get back to you within 2 hours</p>

              <IonItem style={{ '--background': 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 12, color: '#fff' } as any}>
                <IonSelect placeholder="Select issue type" value={reportType} onIonChange={e => setReportType(e.detail.value)}>
                  <IonSelectOption value="billing">💰 Billing / Payment Issue</IonSelectOption>
                  <IonSelectOption value="lost">🎒 Lost Item in Vehicle</IonSelectOption>
                  <IonSelectOption value="safety">🛡️ Safety Concern</IonSelectOption>
                  <IonSelectOption value="driver">👤 Driver Behavior</IonSelectOption>
                  <IonSelectOption value="app">📱 App Bug / Crash</IonSelectOption>
                  <IonSelectOption value="other">📋 Other Issue</IonSelectOption>
                </IonSelect>
              </IonItem>

              <IonTextarea
                placeholder="Describe what happened in detail..."
                value={reportDescription}
                onIonInput={e => setReportDescription(e.detail.value!)}
                rows={5}
                style={{ '--background': 'rgba(255,255,255,0.04)', '--color': '#fff', borderRadius: 12, padding: 12, marginBottom: 16 } as any}
              />

              <IonButton expand="block" onClick={handleReportSubmit}
                style={{ '--background': '#FF6B35', '--border-radius': 12, fontWeight: 700, height: 46 } as any}>
                <IonIcon icon={alertCircleOutline} slot="start" /> Submit Ticket
              </IonButton>
            </div>
          )}

          {segment === 'contact' && (
            <div>
              <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 14 }}>📞 Contact Us</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div onClick={() => window.open('https://wa.me/256800100200', '_blank')}
                  style={{ background: 'rgba(37,211,102,0.08)', borderRadius: 16, padding: 20, textAlign: 'center', cursor: 'pointer', border: '1px solid rgba(37,211,102,0.15)' }}>
                  <IonIcon icon={logoWhatsapp} style={{ fontSize: 32, color: '#25D366', marginBottom: 8 }} />
                  <h4 style={{ color: '#fff', margin: '4px 0', fontSize: 13 }}>WhatsApp</h4>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0 }}>Chat with us instantly</p>
                </div>
                <div onClick={() => window.open('tel:+256800100200', '_system')}
                  style={{ background: 'rgba(255,107,53,0.08)', borderRadius: 16, padding: 20, textAlign: 'center', cursor: 'pointer', border: '1px solid rgba(255,107,53,0.15)' }}>
                  <IonIcon icon={callOutline} style={{ fontSize: 32, color: '#FF6B35', marginBottom: 8 }} />
                  <h4 style={{ color: '#fff', margin: '4px 0', fontSize: 13 }}>24/7 Hotline</h4>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0 }}>0800-100-200</p>
                </div>
                <div onClick={() => window.location.href = 'mailto:support@navigo.ug'}
                  style={{ background: 'rgba(77,166,255,0.08)', borderRadius: 16, padding: 20, textAlign: 'center', cursor: 'pointer', border: '1px solid rgba(77,166,255,0.15)' }}>
                  <IonIcon icon={mailOutline} style={{ fontSize: 32, color: '#4da6ff', marginBottom: 8 }} />
                  <h4 style={{ color: '#fff', margin: '4px 0', fontSize: 13 }}>Email</h4>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0 }}>support@navigo.ug</p>
                </div>
                <div onClick={() => history.push('/rider/book')}
                  style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, textAlign: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <IonIcon icon={locationOutline} style={{ fontSize: 32, color: '#fff', marginBottom: 8 }} />
                  <h4 style={{ color: '#fff', margin: '4px 0', fontSize: 13 }}>Visit Us</h4>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0 }}>Kampala Office</p>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
                <IonIcon icon={timeOutline} style={{ color: '#FFC107', fontSize: 20, marginBottom: 6 }} />
                <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>Response Time: Under 2 Hours</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '4px 0 0' }}>Our team is available 24/7, 365 days a year</p>
              </div>
            </div>
          )}

        </div>
      </IonContent>
    </IonPage>
  );
};

export default RiderSupport;