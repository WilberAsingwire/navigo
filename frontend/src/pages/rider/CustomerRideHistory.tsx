import React, { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonBadge,
  IonSearchbar, IonSegment, IonSegmentButton, IonButton, IonModal,
  IonCard, IonCardContent, IonSpinner
} from '@ionic/react';
import {
  carOutline, bicycleOutline, timeOutline, locationOutline,
  cashOutline, starOutline, refreshOutline, mapOutline,
  closeOutline, informationCircleOutline
} from 'ionicons/icons';
import { API_URL } from '../../config';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import './CustomerRideHistory.css';

const CustomerRideHistory: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const token = localStorage.getItem('navigo_token');
        const res = await axios.get(`${API_URL}/rides/history/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: statusFilter }
        });
        setRides(res.data);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [user?.id, statusFilter]);

  const filteredRides = rides.filter(ride => {
    const from = ride.pickup?.address || '';
    const to = ride.destination?.address || '';
    const driver = ride.driverName || '';
    const matchesSearch = from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ride.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: rides.length,
    completed: rides.filter(r => r.status === 'completed' || r.status === 'Completed').length,
    cancelled: rides.filter(r => r.status === 'cancelled' || r.status === 'Cancelled').length,
    totalSpent: rides.filter(r => r.status === 'completed' || r.status === 'Completed').reduce((sum, r) => sum + (Number(r.fare) || 0), 0),
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#080c14'} as any}>
        <IonToolbar style={{'--background': '#080c14', '--color': '#fff'} as any}>
          <IonButtons slot="start"><IonBackButton defaultHref="/customer/home" style={{color: 'var(--nav-text)'}} /></IonButtons>
          <IonTitle style={{color: 'var(--nav-text)'}}>Ride History</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ride-history-container history-wrapper" style={{'--background': 'var(--nav-bg)'} as any}>
        <div style={{ padding: 14, maxWidth: 600, margin: '0 auto' }}>

          {/* Stats */}
          <div className="history-stats-grid">
            <div className="history-stat-card">
              <p className="history-stat-value">{stats.total}</p>
              <span className="history-stat-label">Total Rides</span>
            </div>
            <div className="history-stat-card">
              <p className="history-stat-value completed">{stats.completed}</p>
              <span className="history-stat-label">Completed</span>
            </div>
            <div className="history-stat-card">
              <p className="history-stat-value spent">UGX {stats.totalSpent.toLocaleString()}</p>
              <span className="history-stat-label">Total Spent</span>
            </div>
          </div>

          {/* Search & Filter */}
          <IonSearchbar placeholder="Search by location or driver..." value={searchQuery} onIonInput={e => setSearchQuery(e.detail.value!)}
            style={{ '--background': 'rgba(255,255,255,0.05)', '--color': '#fff', borderRadius: 12, marginBottom: 10 } as any} debounce={300} />

          <IonSegment value={statusFilter} onIonChange={e => setStatusFilter(e.detail.value as any)} style={{ marginBottom: 14 }}>
            <IonSegmentButton value="all"><IonLabel style={{ fontSize: 11, color: 'var(--nav-text-secondary)' }}>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="completed"><IonLabel style={{ fontSize: 11, color: 'var(--nav-text-secondary)' }}>Completed</IonLabel></IonSegmentButton>
            <IonSegmentButton value="cancelled"><IonLabel style={{ fontSize: 11, color: 'var(--nav-text-secondary)' }}>Cancelled</IonLabel></IonSegmentButton>
          </IonSegment>

          {/* Ride List */}
          {isLoading ? (
            <Skeleton rows={3} />
          ) : filteredRides.length === 0 ? (
            <EmptyState
              icon={<IonIcon icon={carOutline} style={{ fontSize: 26 }} />}
              title="No rides yet"
              subtitle="Your trip history will appear here after your first ride."
              actionLabel="Book a ride"
              onAction={() => history.push('/customer/book')}
            />
          ) : (
            filteredRides.map(ride => (
              <div key={ride.id} onClick={() => { setSelectedRide(ride); setShowDetail(true); }}
                className="history-ride-card">
                <div className="ride-header">
                  <div className="ride-info-main">
                    <IonIcon icon={ride.rideType === 'boda' ? bicycleOutline : carOutline} className="ride-type-icon" />
                    <div>
                      <span className="ride-route">{ride.pickup?.address || 'Unknown'} → {ride.destination?.address || 'Unknown'}</span>
                      <p className="ride-time">
                        {ride.requestedAt ? new Date(ride.requestedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A'} at {ride.requestedAt ? new Date(ride.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <IonBadge color={ride.status === 'completed' || ride.status === 'Completed' ? 'success' : 'danger'} style={{ fontSize: 9 }}>{ride.status}</IonBadge>
                </div>
                <div className="ride-footer">
                  <span className="ride-meta">{ride.paymentMethod}</span>
                  <span className="ride-fare">UGX {(Number(ride.fare) || 0).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Modal */}
        <IonModal isOpen={showDetail} onDidDismiss={() => setShowDetail(false)}>
          {selectedRide && (
            <div className="history-detail-modal">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Trip Details</h2>
                <IonButton fill="clear" onClick={() => setShowDetail(false)}><IonIcon icon={closeOutline} style={{ color: 'var(--nav-text)', fontSize: 22 }} /></IonButton>
              </div>

              <IonBadge color={selectedRide.status === 'completed' || selectedRide.status === 'Completed' ? 'success' : 'danger'} style={{ marginBottom: 16, fontSize: 11 }}>
                {selectedRide.status}
              </IonBadge>

              <div className="detail-glass-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <IonIcon icon={locationOutline} style={{ color: '#2D6A4F' }} />
                  <span style={{ color: 'var(--nav-text)', fontSize: 14 }}>{selectedRide.pickup?.address || 'Unknown'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IonIcon icon={locationOutline} style={{ color: '#E85D75' }} />
                  <span style={{ color: 'var(--nav-text)', fontSize: 14 }}>{selectedRide.destination?.address || 'Unknown'}</span>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-glass-card">
                  <span className="detail-item-label">Date & Time</span>
                  <p className="detail-item-value">{selectedRide.requestedAt ? new Date(selectedRide.requestedAt).toLocaleString() : 'N/A'}</p>
                </div>
                <div className="detail-glass-card">
                  <span className="detail-item-label">Distance</span>
                  <p className="detail-item-value">N/A</p>
                </div>
                <div className="detail-glass-card">
                  <span className="detail-item-label">Ride Type</span>
                  <p className="detail-item-value">{selectedRide.rideType === 'boda' ? 'Boda' : selectedRide.rideType === 'comfort' ? 'Comfort' : 'Economy'}</p>
                </div>
                <div className="detail-glass-card">
                  <span className="detail-item-label">Payment</span>
                  <p className="detail-item-value">{selectedRide.paymentMethod}</p>
                </div>
              </div>

              <div className="fare-highlight-card">
                <span className="fare-highlight-label">Total Fare</span>
                <h2 className="fare-highlight-value">UGX {(Number(selectedRide.fare) || 0).toLocaleString()}</h2>
              </div>

              {(selectedRide.status === 'completed' || selectedRide.status === 'Completed') && (
                <IonButton expand="block" className="book-similar-btn" onClick={() => { setShowDetail(false); history.push('/customer/book'); }}
                  style={{ '--color': '#fff' } as any}>
                  <IonIcon icon={refreshOutline} slot="start" /> Book Similar Ride
                </IonButton>
              )}
            </div>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default CustomerRideHistory;
