import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonSegment, IonSegmentButton, IonLabel, IonList,
  IonItem, IonIcon, IonButton, IonModal,
  IonTextarea, useIonToast, IonProgressBar
} from '@ionic/react';
import { alertCircleOutline, checkmarkCircleOutline, personOutline, chevronForwardOutline } from 'ionicons/icons';
import api from '../../services/api';
import './AdminSupport.css';

const AdminSupport: React.FC = () => {
  const [segment, setSegment] = useState<'open' | 'resolved'>('open');
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [presentToast] = useIonToast();

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/tickets');
      setTickets(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleResolve = async (id: string) => {
    if (!reply) {
      return presentToast({ message: 'Please provide a response to the user', color: 'warning', duration: 2000 });
    }

    try {
      await api.put(`/admin/tickets/${id}/resolve`, { adminReply: reply });
      presentToast({ message: 'Ticket Resolved & User Notified! 📧', color: 'success', duration: 2000 });
      setSelectedTicket(null);
      setReply('');
      fetchTickets();
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Error resolving ticket', color: 'danger', duration: 3000 });
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="admin-toolbar">
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" /></IonButtons>
          <IonTitle className="sora-font">Global Support</IonTitle>
        </IonToolbar>
        <IonToolbar className="admin-toolbar">
          <IonSegment value={segment} onIonChange={e => setSegment(e.detail.value as any)}>
            <IonSegmentButton value="open"><IonLabel>Open Tickets</IonLabel></IonSegmentButton>
            <IonSegmentButton value="resolved"><IonLabel>Resolved</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-bg">
        {loading && <IonProgressBar type="indeterminate" color="success" />}

        <IonList lines="none" className="admin-ticket-list">
          {tickets.filter(t => t.status === segment).map(ticket => (
            <IonItem key={ticket.id} className="ticket-item" onClick={() => setSelectedTicket(ticket)}>
              <div className={`priority-indicator ${ticket.priority}`}></div>
              <IonLabel>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h2 style={{ color: 'white' }}>{ticket.type}</h2>
                  <IonBadge color={ticket.priority === 'high' ? 'danger' : 'warning'}>{ticket.priority}</IonBadge>
                </div>
                <p style={{ color: '#888' }}>User: {ticket.userName}</p>
                <p className="ticket-desc">{ticket.description}</p>
              </IonLabel>
              <IonIcon icon={chevronForwardOutline} slot="end" color="medium" />
            </IonItem>
          ))}
        </IonList>

        <IonModal isOpen={!!selectedTicket} onDidDismiss={() => setSelectedTicket(null)}>
          {selectedTicket && (
            <div className="ion-padding modal-content" style={{ background: '#080808', height: '100%', color: 'white' }}>
              <h2 className="sora-font" style={{ color: '#00e676' }}>Support Request {selectedTicket.id}</h2>
              <div className="desc-box ion-margin-top" style={{ background: '#1a1a1a', padding: '15px', borderRadius: '12px' }}>
                <p>{selectedTicket.description}</p>
              </div>
              <IonTextarea
                placeholder="Type your official response..."
                value={reply}
                onIonChange={e => setReply(e.detail.value!)}
                rows={6}
                style={{ background: '#111', marginTop: '20px', borderRadius: '12px', padding: '10px' }}
              />
              <IonButton expand="block" color="success" className="ion-margin-top" onClick={() => handleResolve(selectedTicket.id)}>
                <IonIcon icon={checkmarkCircleOutline} slot="start" /> Resolve & Send Reply
              </IonButton>
              <IonButton expand="block" fill="clear" color="light" onClick={() => setSelectedTicket(null)}>Close</IonButton>
            </div>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default AdminSupport;
