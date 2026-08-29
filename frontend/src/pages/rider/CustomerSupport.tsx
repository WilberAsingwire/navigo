import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonSegment, IonSegmentButton, IonLabel, IonList,
  IonItem, IonIcon, IonText, IonAccordion, IonAccordionGroup,
  IonTextarea, IonButton, IonSelect, IonSelectOption, useIonToast,
  IonBadge, IonCard, IonCardContent, IonSpinner
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  helpCircleOutline, logoWhatsapp, mailOutline, callOutline,
  alertCircleOutline, chatbubbleEllipsesOutline, locationOutline,
  checkmarkCircleOutline, documentTextOutline, starOutline,
  shieldCheckmarkOutline, timeOutline, cardOutline
} from 'ionicons/icons';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import './CustomerSupport.css';

interface TicketReply { from: string; text: string; time: string; }
interface Ticket {
  id: number;
  type: string;
  description: string;
  priority: string;
  status: 'open' | 'in-progress' | 'resolved';
  createdAt: string;
  replies: TicketReply[];
}

const RiderSupport: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const homePath = user?.role === 'driver' ? '/driver/home' : '/customer/home';
  const [segment, setSegment] = useState<'faq' | 'report' | 'contact' | 'tickets'>('faq');
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [presentToast] = useIonToast();

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await api.get('/support/mine');
      setTickets(res.data || []);
    } catch (e) {
      console.error('Failed to load tickets:', e);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (segment === 'tickets') loadTickets();
  }, [segment]);

  const handleReportSubmit = async () => {
    if (!reportType) {
      presentToast({ message: 'Please select an issue type', color: 'warning', duration: 2000 });
      return;
    }
    if (!reportDescription.trim()) {
      presentToast({ message: 'Please describe what happened', color: 'warning', duration: 2000 });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/support', { type: reportType, description: reportDescription.trim() });
      presentToast({ message: `✅ Ticket #${res.data?.ticketId} submitted! We'll respond within 2 hours.`, duration: 3000, color: 'success' });
      setReportType('');
      setReportDescription('');
      setSegment('tickets');
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Failed to submit ticket. Try again.', duration: 3000, color: 'danger' });
    } finally {
      setSubmitting(false);
    }
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
      <IonHeader className="ion-no-border" style={{'--background': '#080c14'} as any}>
        <IonToolbar style={{'--background': '#080c14', '--color': '#fff'} as any}>
          <IonButtons slot="start"><IonBackButton defaultHref={homePath} style={{color: '#fff'}} /></IonButtons>
          <IonTitle style={{color: '#fff'}}>Support Center</IonTitle>
        </IonToolbar>
        <IonToolbar style={{'--background': '#080c14'} as any}>
          <IonSegment value={segment} onIonChange={e => setSegment(e.detail.value as any)}>
            <IonSegmentButton value="faq"><IonLabel style={{ fontSize: 11, color: '#D1D5DB' }}>📖 FAQs</IonLabel></IonSegmentButton>
            <IonSegmentButton value="report"><IonLabel style={{ fontSize: 11, color: '#D1D5DB' }}>🚨 Report</IonLabel></IonSegmentButton>
            <IonSegmentButton value="tickets"><IonLabel style={{ fontSize: 11, color: '#D1D5DB' }}>🎫 My Tickets</IonLabel></IonSegmentButton>
            <IonSegmentButton value="contact"><IonLabel style={{ fontSize: 11, color: '#D1D5DB' }}>📞 Contact</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="support-container">
        <div style={{ padding: 14, maxWidth: 600, margin: '0 auto' }}>

          {segment === 'faq' && (
            <>
              <div className="support-info-banner">
                <IonIcon icon={helpCircleOutline} style={{ color: '#FF6B35', fontSize: 22 }} />
                <p className="support-info-text">Can't find what you're looking for? <span className="support-info-link" onClick={() => setSegment('report')}>Open a ticket</span> or <span className="support-info-link" onClick={() => setSegment('contact')}>contact us</span>.</p>
              </div>

              <IonAccordionGroup>
                {faqs.map(faq => (
                  <IonAccordion key={faq.id} value={faq.id} className="support-accordion">
                    <IonItem slot="header">
                      <IonIcon icon={helpCircleOutline} slot="start" style={{ color: '#FF6B35', fontSize: 16 }} />
                      <IonLabel>{faq.question}</IonLabel>
                    </IonItem>
                    <div className="support-accordion-content" slot="content">
                      {faq.answer}
                    </div>
                  </IonAccordion>
                ))}
              </IonAccordionGroup>
            </>
          )}

          {segment === 'report' && (
            <div className="report-form">
              <h3 className="report-title">🚨 Report an Issue</h3>
              <p className="report-subtitle">We'll get back to you within 2 hours</p>

              <IonItem className="support-input-field">
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
                className="support-textarea"
              />

              <IonButton expand="block" onClick={handleReportSubmit} disabled={submitting} className="support-submit-btn">
                {submitting ? <IonSpinner name="crescent" /> : (<><IonIcon icon={alertCircleOutline} slot="start" /> Submit Ticket</>)}
              </IonButton>
            </div>
          )}

          {segment === 'tickets' && (
            <div className="report-form">
              <h3 className="report-title">🎫 My Tickets</h3>
              <p className="report-subtitle">Track your support requests and replies</p>

              {loadingTickets ? (
                <div style={{ textAlign: 'center', padding: 30 }}><IonSpinner name="crescent" color="warning" /></div>
              ) : tickets.length === 0 ? (
                <EmptyState
                  icon={<IonIcon icon={documentTextOutline} style={{ fontSize: 26 }} />}
                  title="No tickets yet"
                  subtitle="When you report an issue, it will show up here with our replies."
                  actionLabel="Report an issue"
                  onAction={() => setSegment('report')}
                />
              ) : (
                tickets.map(t => (
                  <IonCard key={t.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', margin: '0 0 12px' }}>
                    <IonCardContent>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <IonText style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>#{t.id} — {t.type}</IonText>
                        <IonBadge color={t.status === 'resolved' ? 'success' : t.status === 'in-progress' ? 'warning' : 'medium'}>
                          {t.status}
                        </IonBadge>
                      </div>
                      <p style={{ color: '#94A3B8', fontSize: 13, margin: '0 0 8px' }}>{t.description}</p>
                      {t.replies?.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, marginTop: 4 }}>
                          {t.replies.map((r, i) => (
                            <p key={i} style={{ fontSize: 12, color: '#D1D5DB', margin: '4px 0' }}>
                              <strong style={{ color: '#FF6B35' }}>{r.from}:</strong> {r.text}
                            </p>
                          ))}
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                ))
              )}
            </div>
          )}

          {segment === 'contact' && (
            <div className="contact-section">
              <h3 className="report-title" style={{ marginBottom: 16 }}>📞 Contact Us</h3>

              <div className="support-contact-grid">
                <div onClick={() => window.open('https://wa.me/256800100200', '_blank')}
                  className="support-contact-card theme-whatsapp">
                  <IonIcon icon={logoWhatsapp} className="support-contact-icon" />
                  <h4 className="support-contact-title">WhatsApp</h4>
                  <p className="support-contact-desc">Chat with us instantly</p>
                </div>
                <div onClick={() => window.open('tel:+256800100200', '_system')}
                  className="support-contact-card theme-phone">
                  <IonIcon icon={callOutline} className="support-contact-icon" />
                  <h4 className="support-contact-title">24/7 Hotline</h4>
                  <p className="support-contact-desc">0800-100-200</p>
                </div>
                <div onClick={() => window.location.href = 'mailto:support@navigo.ug'}
                  className="support-contact-card theme-email">
                  <IonIcon icon={mailOutline} className="support-contact-icon" />
                  <h4 className="support-contact-title">Email</h4>
                  <p className="support-contact-desc">support@navigo.ug</p>
                </div>
                <div onClick={() => history.push('/customer/book')}
                  className="support-contact-card theme-office">
                  <IonIcon icon={locationOutline} className="support-contact-icon" />
                  <h4 className="support-contact-title">Visit Us</h4>
                  <p className="support-contact-desc">Uganda Office</p>
                </div>
              </div>

              <div className="support-response-card">
                <IonIcon icon={timeOutline} className="support-response-icon" />
                <p className="support-response-title">Response Time: Under 2 Hours</p>
                <p className="support-response-desc">Our team is available 24/7, 365 days a year</p>
              </div>
            </div>
          )}

        </div>
      </IonContent>
    </IonPage>
  );
};

export default RiderSupport;
