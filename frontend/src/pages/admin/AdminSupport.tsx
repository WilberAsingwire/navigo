import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonSegment, IonSegmentButton, IonLabel, IonList,
  IonItem, IonIcon, IonButton, IonModal, IonProgressBar,
  IonTextarea, useIonToast, IonSearchbar, IonChip, IonBadge
} from '@ionic/react';
import { 
  alertCircleOutline, checkmarkCircleOutline, personOutline, 
  chevronForwardOutline, timeOutline, chatbubbleOutline,
  closeCircleOutline, refreshOutline
} from 'ionicons/icons';
import './AdminSupport.css';

interface Ticket {
  id: string;
  userName: string;
  userRole: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved';
  createdAt: string;
  replies: { text: string; from: string; time: string }[];
}

const MOCK_TICKETS: Ticket[] = [
  { id: '#1042', userName: 'Sarah K.', userRole: 'Rider', type: 'Payment Issue', description: 'I was charged twice for my ride from Kololo to Acacia Mall. Please refund the extra charge.', priority: 'high', status: 'open', createdAt: '10 min ago', replies: [] },
  { id: '#1041', userName: 'Peter M.', userRole: 'Driver', type: 'Account Access', description: 'I cannot access my earnings dashboard. It shows a blank page when I try to view my balance.', priority: 'urgent', status: 'open', createdAt: '25 min ago', replies: [] },
  { id: '#1040', userName: 'Alice N.', userRole: 'Rider', type: 'Driver Behavior', description: 'The driver was very rude and refused to use the AC even though I booked NAVIGO Comfort.', priority: 'medium', status: 'in-progress', createdAt: '1 hour ago', replies: [{ text: 'We are investigating this issue. The driver has been contacted.', from: 'Admin', time: '30 min ago' }] },
  { id: '#1039', userName: 'John D.', userRole: 'Motorist', type: 'App Bug', description: 'The app crashes every time I try to upload my vehicle documents. I have tried 5 times.', priority: 'high', status: 'open', createdAt: '2 hours ago', replies: [] },
  { id: '#1038', userName: 'Mary A.', userRole: 'Rider', type: 'Refund Request', description: 'I cancelled my ride but was still charged. Please process my refund.', priority: 'medium', status: 'resolved', createdAt: '5 hours ago', replies: [{ text: 'Refund processed. The amount will reflect in 3-5 business days.', from: 'Admin', time: '3 hours ago' }] },
  { id: '#1037', userName: 'David O.', userRole: 'Driver', type: 'Vehicle Issue', description: 'My vehicle was incorrectly categorized. It should be Comfort class, not Economy.', priority: 'low', status: 'resolved', createdAt: '1 day ago', replies: [{ text: 'Vehicle reclassified to Comfort. You can now receive Comfort ride requests.', from: 'Admin', time: '20 hours ago' }] },
];

const AdminSupport: React.FC = () => {
  const [segment, setSegment] = useState<'open' | 'in-progress' | 'resolved'>('open');
  const [tickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [presentToast] = useIonToast();

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  useEffect(() => {
    let filtered = tickets.filter(t => t.status === segment);
    if (searchQuery) filtered = filtered.filter(t => t.userName.toLowerCase().includes(searchQuery.toLowerCase()) || t.type.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase()));
    if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter);
    setFilteredTickets(filtered);
  }, [tickets, segment, searchQuery, priorityFilter]);

  const handleResolve = (id: string) => {
    if (!reply.trim()) return presentToast({ message: 'Please type a response', color: 'warning', duration: 2000 });
    presentToast({ message: '✅ Ticket resolved & user notified!', color: 'success', duration: 2000 });
    setSelectedTicket(null); setReply('');
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent': return { bg: 'rgba(239,68,68,0.15)', border: '#EF4444', text: '#EF4444', label: 'Urgent' };
      case 'high': return { bg: 'rgba(245,158,11,0.15)', border: '#F59E0B', text: '#F59E0B', label: 'High' };
      case 'medium': return { bg: 'rgba(156,163,175,0.15)', border: '#9CA3AF', text: '#9CA3AF', label: 'Medium' };
      case 'low': return { bg: 'rgba(156,163,175,0.1)', border: '#6B7280', text: '#9CA3AF', label: 'Low' };
      default: return { bg: '#333', border: '#666', text: '#999', label: priority };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open': return { bg: 'rgba(156,163,175,0.15)', border: '#9CA3AF', text: '#9CA3AF', label: 'Open' };
      case 'in-progress': return { bg: 'rgba(245,158,11,0.15)', border: '#F59E0B', text: '#F59E0B', label: 'In Progress' };
      case 'resolved': return { bg: 'rgba(16,185,129,0.15)', border: '#10B981', text: '#10B981', label: 'Resolved' };
      default: return { bg: '#333', border: '#666', text: '#999', label: status };
    }
  };

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    urgent: tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved').length,
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#1A1A1A'} as any}>
        <IonToolbar style={{'--background': '#1A1A1A', '--color': '#fff'} as any}>
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" style={{color: '#fff'}} /></IonButtons>
          <IonTitle style={{color: '#fff'}}>Support Tickets</IonTitle>
          <IonButton slot="end" fill="clear"><IonIcon icon={refreshOutline} style={{color: '#FF6B35'}} /></IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        {loading && <IonProgressBar type="indeterminate" color="warning" />}

        <div style={{padding: 14, maxWidth: 700, margin: '0 auto'}}>
          {/* Stats */}
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 14}}>
            {[
              {label: 'Open', value: stats.open}, {label: 'In Progress', value: stats.inProgress},
              {label: 'Resolved', value: stats.resolved}, {label: 'Urgent', value: stats.urgent},
            ].map(s => (
              <div key={s.label} style={{background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, textAlign: 'center'}}>
                <div style={{fontSize: 18, fontWeight: 700, color: '#FF6B35'}}>{s.value}</div>
                <div style={{fontSize: 9, color: '#D1D5DB'}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <IonSearchbar placeholder="Search tickets..." value={searchQuery} onIonInput={e => setSearchQuery(e.detail.value!)}
            style={{'--background': 'rgba(255,255,255,0.05)', '--color': '#fff', borderRadius: 12, marginBottom: 10} as any} debounce={300} />

          {/* Priority Filter */}
          <div style={{background: '#1A1A1A', padding: 6, borderRadius: 12, display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap'}}>
            {['all', 'urgent', 'high', 'medium', 'low'].map(p => (
              <IonChip key={p} outline={priorityFilter !== p} color={priorityFilter === p ? 'warning' : 'medium'}
                onClick={() => setPriorityFilter(p)} style={{fontSize: 10}}>
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
              </IonChip>
            ))}
          </div>

          {/* Tabs */}
          <IonSegment value={segment} onIonChange={e => setSegment(e.detail.value as any)} style={{marginBottom: 14}}>
            <IonSegmentButton value="open"><IonLabel style={{fontSize: 12, color: '#D1D5DB'}}>Open ({stats.open})</IonLabel></IonSegmentButton>
            <IonSegmentButton value="in-progress"><IonLabel style={{fontSize: 12, color: '#D1D5DB'}}>In Progress</IonLabel></IonSegmentButton>
            <IonSegmentButton value="resolved"><IonLabel style={{fontSize: 12, color: '#D1D5DB'}}>Resolved</IonLabel></IonSegmentButton>
          </IonSegment>

          {/* Ticket List */}
          {filteredTickets.length === 0 ? (
            <div style={{textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)'}}>
              <IonIcon icon={checkmarkCircleOutline} style={{fontSize: 40}} />
              <p>No tickets in this category</p>
            </div>
          ) : (
            filteredTickets.map(ticket => {
              const priorityStyle = getPriorityStyle(ticket.priority);
              const statusStyle = getStatusStyle(ticket.status);
              return (
                <div key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                  style={{background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, marginBottom: 8, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8}}>
                    <div>
                      <span style={{color: '#D1D5DB', fontSize: 11, marginRight: 8}}>{ticket.id}</span>
                      <span style={{color: '#fff', fontSize: 14, fontWeight: 600}}>{ticket.type}</span>
                    </div>
                    <div style={{display: 'flex', gap: 6}}>
                      <span style={{background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.text, padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600}}>{statusStyle.label}</span>
                      <span style={{background: priorityStyle.bg, border: `1px solid ${priorityStyle.border}`, color: priorityStyle.text, padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600}}>{priorityStyle.label}</span>
                    </div>
                  </div>
                  <p style={{color: '#D1D5DB', fontSize: 13, margin: '0 0 8px', paddingLeft: 4, lineHeight: 1.4}}>{ticket.description.substring(0, 100)}...</p>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                      <IonIcon icon={personOutline} style={{color: 'rgba(255,255,255,0.4)', fontSize: 14}} />
                      <span style={{color: 'rgba(255,255,255,0.5)', fontSize: 11}}>{ticket.userName} • {ticket.userRole}</span>
                    </div>
                    <span style={{color: 'rgba(255,255,255,0.3)', fontSize: 10}}>{ticket.createdAt}</span>
                  </div>
                  {ticket.replies.length > 0 && (
                    <div style={{marginTop: 8, padding: 8, background: 'rgba(45,106,79,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6}}>
                      <IonIcon icon={chatbubbleOutline} style={{color: '#2D6A4F', fontSize: 12}} />
                      <span style={{color: '#2D6A4F', fontSize: 11}}>{ticket.replies.length} admin reply</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Detail Modal */}
        <IonModal isOpen={!!selectedTicket} onDidDismiss={() => setSelectedTicket(null)}>
          {selectedTicket && (
            <div style={{padding: 20, background: '#0d1117', color: '#fff', height: '100%', overflow: 'auto'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                <h2 style={{margin: 0, fontSize: 18}}>{selectedTicket.id} - {selectedTicket.type}</h2>
                <IonButton fill="clear" onClick={() => setSelectedTicket(null)}><IonIcon icon={closeCircleOutline} style={{color: '#fff', fontSize: 22}} /></IonButton>
              </div>
              <div style={{background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 16}}>
                <p style={{color: '#D1D5DB', margin: '0 0 8px', fontSize: 14, lineHeight: 1.5}}>{selectedTicket.description}</p>
                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                  <span style={{color: 'rgba(255,255,255,0.5)', fontSize: 11}}>👤 {selectedTicket.userName}</span>
                  <span style={{color: 'rgba(255,255,255,0.5)', fontSize: 11}}>📋 {selectedTicket.userRole}</span>
                  <span style={{color: 'rgba(255,255,255,0.5)', fontSize: 11}}>🕐 {selectedTicket.createdAt}</span>
                </div>
              </div>
              {selectedTicket.replies.length > 0 && (
                <div style={{marginBottom: 16}}>
                  <h4 style={{color: '#fff', fontSize: 13, marginBottom: 8}}>Previous Replies</h4>
                  {selectedTicket.replies.map((r, i) => (
                    <div key={i} style={{background: 'rgba(45,106,79,0.08)', borderRadius: 10, padding: 10, marginBottom: 6}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                        <span style={{color: '#2D6A4F', fontSize: 11, fontWeight: 600}}>{r.from}</span>
                        <span style={{color: 'rgba(255,255,255,0.3)', fontSize: 10}}>{r.time}</span>
                      </div>
                      <p style={{color: '#D1D5DB', fontSize: 12, margin: 0}}>{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {selectedTicket.status !== 'resolved' && (
                <>
                  <IonTextarea placeholder="Type your response to the user..." value={reply} onIonInput={e => setReply(e.detail.value!)} rows={4}
                    style={{'--background': 'rgba(255,255,255,0.05)', '--color': '#fff', borderRadius: 12, padding: 10, marginBottom: 16} as any} />
                  <IonButton expand="block" color="success" onClick={() => handleResolve(selectedTicket.id)}>
                    <IonIcon icon={checkmarkCircleOutline} slot="start" /> Resolve & Send Reply
                  </IonButton>
                </>
              )}
              <IonButton expand="block" fill="clear" onClick={() => setSelectedTicket(null)} style={{marginTop: 8}}>Close</IonButton>
            </div>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default AdminSupport;