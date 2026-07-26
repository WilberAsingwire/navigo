import React, { useState } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonBadge,
  IonSearchbar, IonSegment, IonSegmentButton, IonButton, IonModal,
  IonCard, IonCardContent
} from '@ionic/react';
import {
  carOutline, bicycleOutline, timeOutline, locationOutline,
  cashOutline, starOutline, refreshOutline, mapOutline,
  closeOutline, informationCircleOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './CustomerRideHistory.css';

const MOCK_RIDES = [
  { id: '1', date: '2026-07-26', time: '14:30', from: 'Kampala Road', to: 'Acacia Mall', price: 8500, status: 'Completed', type: 'economy', driverName: 'John K.', driverRating: 4.8, distance: '5.2 km', paymentMethod: 'Cash' },
  { id: '2', date: '2026-07-25', time: '09:15', from: 'Kololo', to: 'Ntinda', price: 3200, status: 'Completed', type: 'boda', driverName: 'Peter M.', driverRating: 4.6, distance: '2.1 km', paymentMethod: 'MTN Money' },
  { id: '3', date: '2026-07-24', time: '18:45', from: 'Makerere University', to: 'Wandegeya', price: 4100, status: 'Cancelled', type: 'economy', driverName: 'N/A', driverRating: 0, distance: '1.8 km', paymentMethod: 'N/A' },
  { id: '4', date: '2026-07-22', time: '11:00', from: 'Old Taxi Park', to: 'Owino Market', price: 2500, status: 'Completed', type: 'boda', driverName: 'Grace N.', driverRating: 4.9, distance: '1.5 km', paymentMethod: 'Cash' },
  { id: '5', date: '2026-07-20', time: '20:30', from: 'Acacia Mall', to: 'Kololo', price: 6200, status: 'Completed', type: 'comfort', driverName: 'David O.', driverRating: 4.7, distance: '4.0 km', paymentMethod: 'Airtel Money' },
  { id: '6', date: '2026-07-18', time: '07:45', from: 'Ntinda', to: 'Kampala Road', price: 3800, status: 'Completed', type: 'economy', driverName: 'Sarah K.', driverRating: 4.8, distance: '3.5 km', paymentMethod: 'Cash' },
];

const CustomerRideHistory: React.FC = () => {
  const history = useHistory();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filteredRides = MOCK_RIDES.filter(ride => {
    const matchesSearch = ride.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.driverName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ride.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: MOCK_RIDES.length,
    completed: MOCK_RIDES.filter(r => r.status === 'Completed').length,
    cancelled: MOCK_RIDES.filter(r => r.status === 'Cancelled').length,
    totalSpent: MOCK_RIDES.filter(r => r.status === 'Completed').reduce((sum, r) => sum + r.price, 0),
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/rider/home" /></IonButtons>
          <IonTitle>Ride History</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <div style={{ padding: 14, maxWidth: 600, margin: '0 auto' }}>
          
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{stats.total}</p>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>Total Rides</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <p style={{ color: '#00e676', fontSize: 18, fontWeight: 700, margin: 0 }}>{stats.completed}</p>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>Completed</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <p style={{ color: '#FF6B35', fontSize: 18, fontWeight: 700, margin: 0 }}>UGX {stats.totalSpent.toLocaleString()}</p>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>Total Spent</span>
            </div>
          </div>

          {/* Search & Filter */}
          <IonSearchbar placeholder="Search by location or driver..." value={searchQuery} onIonInput={e => setSearchQuery(e.detail.value!)}
            style={{ '--background': 'rgba(255,255,255,0.05)', '--color': '#fff', borderRadius: 12, marginBottom: 10 } as any} debounce={300} />
          
          <IonSegment value={statusFilter} onIonChange={e => setStatusFilter(e.detail.value as any)} style={{ marginBottom: 14 }}>
            <IonSegmentButton value="all"><IonLabel style={{ fontSize: 11 }}>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="completed"><IonLabel style={{ fontSize: 11 }}>Completed</IonLabel></IonSegmentButton>
            <IonSegmentButton value="cancelled"><IonLabel style={{ fontSize: 11 }}>Cancelled</IonLabel></IonSegmentButton>
          </IonSegment>

          {/* Ride List */}
          {filteredRides.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
              <IonIcon icon={carOutline} style={{ fontSize: 48 }} />
              <p>No rides found</p>
            </div>
          ) : (
            filteredRides.map(ride => (
              <div key={ride.id} onClick={() => { setSelectedRide(ride); setShowDetail(true); }}
                style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, marginBottom: 8, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IonIcon icon={ride.type === 'boda' ? bicycleOutline : carOutline} style={{ color: '#FF6B35', fontSize: 20 }} />
                    <div>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{ride.from} → {ride.to}</span>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2 }}>
                        {new Date(ride.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {ride.time}
                      </p>
                    </div>
                  </div>
                  <IonBadge color={ride.status === 'Completed' ? 'success' : 'danger'} style={{ fontSize: 9 }}>{ride.status}</IonBadge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>🚗 {ride.distance} • {ride.paymentMethod}</span>
                  <span style={{ color: '#FF6B35', fontWeight: 700, fontSize: 14 }}>UGX {ride.price.toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Modal */}
        <IonModal isOpen={showDetail} onDidDismiss={() => setShowDetail(false)}>
          {selectedRide && (
            <div style={{ padding: 20, background: '#0d1117', color: '#fff', height: '100%', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Trip Details</h2>
                <IonButton fill="clear" onClick={() => setShowDetail(false)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 22 }} /></IonButton>
              </div>

              <IonBadge color={selectedRide.status === 'Completed' ? 'success' : 'danger'} style={{ marginBottom: 14, fontSize: 11 }}>
                {selectedRide.status}
              </IonBadge>

              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <IonIcon icon={locationOutline} style={{ color: '#2D6A4F' }} />
                  <span style={{ color: '#fff', fontSize: 13 }}>{selectedRide.from}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IonIcon icon={locationOutline} style={{ color: '#E85D75' }} />
                  <span style={{ color: '#fff', fontSize: 13 }}>{selectedRide.to}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Date & Time</span><p style={{ color: '#fff', margin: 2, fontSize: 12 }}>{selectedRide.date} {selectedRide.time}</p></div>
                <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Distance</span><p style={{ color: '#fff', margin: 2, fontSize: 12 }}>{selectedRide.distance}</p></div>
                <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Ride Type</span><p style={{ color: '#fff', margin: 2, fontSize: 12 }}>{selectedRide.type === 'boda' ? '🏍️ Boda' : selectedRide.type === 'comfort' ? '🚙 Comfort' : '🚗 Economy'}</p></div>
                <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Payment</span><p style={{ color: '#fff', margin: 2, fontSize: 12 }}>{selectedRide.paymentMethod}</p></div>
              </div>

              <div style={{ background: 'rgba(255,107,53,0.08)', borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 14 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Total Fare</span>
                <h2 style={{ color: '#FF6B35', margin: '4px 0', fontSize: 28 }}>UGX {selectedRide.price.toLocaleString()}</h2>
              </div>

              {selectedRide.status === 'Completed' && (
                <IonButton expand="block" onClick={() => { setShowDetail(false); history.push('/rider/book'); }}
                  style={{ '--background': '#FF6B35', '--border-radius': 12, fontWeight: 700 } as any}>
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