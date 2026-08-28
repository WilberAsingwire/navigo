import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonList, IonItem, IonLabel, IonAvatar, IonBadge,
  IonIcon, IonButton, IonModal, useIonToast, IonProgressBar, 
  IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, 
  IonSegmentButton, IonChip, IonCard, IonCardContent
} from '@ionic/react';
import {
  checkmarkCircleOutline, closeCircleOutline, carOutline,
  cardOutline, shieldCheckmarkOutline, chevronDownCircleOutline,
  personOutline, callOutline, mailOutline, starOutline,
  documentTextOutline, cameraOutline, timeOutline, bicycleOutline,
  checkmarkDoneOutline, closeOutline, eyeOutline, refreshOutline
} from 'ionicons/icons';
import InitialsAvatar from '../../components/InitialsAvatar';
import './AdminUserReview.css';

interface Driver {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'driver' | 'motorist';
  vehiclePlate?: string;
  permitNumber?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  nationalId?: string;
  drivingLicense?: string;
  rating?: number;
  totalRides?: number;
  status: 'pending' | 'approved' | 'rejected';
  isFemaleDriver?: boolean;
  createdAt: string;
}

const MOCK_DRIVERS: Driver[] = [
  { _id: '1', name: 'Peter Okello', phone: '0772123456', email: 'peter@email.com', role: 'driver', vehiclePlate: 'UBA 123A', permitNumber: 'PT-2024-001', vehicleModel: 'Toyota Prius', vehicleColor: 'White', nationalId: 'CF8901234ABCD', drivingLicense: 'DL-2023-001234', rating: 4.8, totalRides: 230, status: 'pending', createdAt: '2 days ago' },
  { _id: '2', name: 'Grace Nakamya', phone: '0753123456', role: 'motorist', vehiclePlate: 'UBC 456B', permitNumber: 'PT-2024-089', vehicleModel: 'Bajaj Boxer', vehicleColor: 'Red', nationalId: 'CF8905678EFGH', drivingLicense: 'DL-2023-005678', rating: 4.9, totalRides: 450, status: 'pending', isFemaleDriver: true, createdAt: '1 day ago' },
  { _id: '3', name: 'James Ouma', phone: '0789123456', email: 'james@email.com', role: 'driver', vehiclePlate: 'UBD 789C', permitNumber: 'PT-2024-156', vehicleModel: 'Toyota Hiace', vehicleColor: 'Silver', nationalId: 'CF8909012IJKL', drivingLicense: 'DL-2023-009012', rating: 4.5, totalRides: 89, status: 'pending', createdAt: '5 hours ago' },
  { _id: '4', name: 'Sarah Birungi', phone: '0701123456', role: 'motorist', vehiclePlate: 'UBE 012D', permitNumber: 'PT-2024-203', vehicleModel: 'Honda CG125', vehicleColor: 'Black', nationalId: 'CF8903456MNOP', drivingLicense: 'DL-2023-003456', rating: 4.7, totalRides: 312, status: 'pending', isFemaleDriver: true, createdAt: '3 hours ago' },
];

const AdminUserReview: React.FC = () => {
  const [presentToast] = useIonToast();
  const [selectedUser, setSelectedUser] = useState<Driver | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  useEffect(() => {
    let filtered = drivers;
    if (activeFilter !== 'all') filtered = filtered.filter(d => d.status === activeFilter);
    if (searchQuery) filtered = filtered.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehiclePlate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery)
    );
    setFilteredDrivers(filtered);
  }, [drivers, activeFilter, searchQuery]);

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setDrivers(prev => prev.map(d => d._id === id ? { ...d, status: action === 'approve' ? 'approved' : 'rejected' } : d));
    presentToast({
      message: `Driver ${action === 'approve' ? 'approved ✅' : 'rejected ❌'} successfully!`,
      duration: 2000,
      color: action === 'approve' ? 'success' : 'danger'
    });
    setSelectedUser(null);
    setShowDetail(false);
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    const pendingDrivers = filteredDrivers.filter(d => d.status === 'pending');
    if (pendingDrivers.length === 0) return;
    setDrivers(prev => prev.map(d => 
      pendingDrivers.find(p => p._id === d._id) ? { ...d, status: action === 'approve' ? 'approved' : 'rejected' } : d
    ));
    presentToast({ message: `${action === 'approve' ? '✅' : '❌'} ${pendingDrivers.length} drivers ${action === 'approve' ? 'approved' : 'rejected'}!`, duration: 3000, color: action === 'approve' ? 'success' : 'danger' });
  };

  const stats = {
    total: drivers.length,
    pending: drivers.filter(d => d.status === 'pending').length,
    approved: drivers.filter(d => d.status === 'approved').length,
    rejected: drivers.filter(d => d.status === 'rejected').length,
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" /></IonButtons>
          <IonTitle>Driver Approvals</IonTitle>
          <IonButton slot="end" fill="clear"><IonIcon icon={refreshOutline} style={{ color: '#FF6B35' }} /></IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { setLoading(true); setTimeout(() => { setLoading(false); e.target.complete(); }, 1000); }}>
          <IonRefresherContent pullingIcon={chevronDownCircleOutline} />
        </IonRefresher>

        {loading && <IonProgressBar type="indeterminate" color="warning" />}

        <div style={{ padding: 14, maxWidth: 700, margin: '0 auto' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
            {[
              { label: 'Total', value: stats.total, color: '#4da6ff' },
              { label: 'Pending', value: stats.pending, color: '#FFC107' },
              { label: 'Approved', value: stats.approved, color: '#2D6A4F' },
              { label: 'Rejected', value: stats.rejected, color: '#ff5252' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search & Filter */}
          <IonSearchbar placeholder="Search by name, phone, or plate..." value={searchQuery} onIonInput={e => setSearchQuery(e.detail.value!)}
            style={{ '--background': 'rgba(255,255,255,0.05)', '--color': '#fff', borderRadius: 12, marginBottom: 10 } as any} debounce={300} />

          <IonSegment value={activeFilter} onIonChange={e => setActiveFilter(e.detail.value as any)} style={{ marginBottom: 12 }}>
            <IonSegmentButton value="all"><IonLabel style={{ fontSize: 11 }}>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="pending"><IonBadge color="warning" style={{ marginRight: 4 }}>{stats.pending}</IonBadge><IonLabel style={{ fontSize: 11 }}>Pending</IonLabel></IonSegmentButton>
            <IonSegmentButton value="approved"><IonLabel style={{ fontSize: 11 }}>Approved</IonLabel></IonSegmentButton>
            <IonSegmentButton value="rejected"><IonLabel style={{ fontSize: 11 }}>Rejected</IonLabel></IonSegmentButton>
          </IonSegment>

          {/* Bulk Actions */}
          {activeFilter === 'pending' && filteredDrivers.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <IonButton expand="block" size="small" color="success" onClick={() => handleBulkAction('approve')}>
                <IonIcon icon={checkmarkDoneOutline} slot="start" /> Approve All ({filteredDrivers.length})
              </IonButton>
              <IonButton expand="block" size="small" color="danger" fill="outline" onClick={() => handleBulkAction('reject')}>
                <IonIcon icon={closeOutline} slot="start" /> Reject All
              </IonButton>
            </div>
          )}

          {/* Driver List */}
          {filteredDrivers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
              <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: 40 }} />
              <p>No drivers in this category</p>
            </div>
          ) : (
            filteredDrivers.map(driver => (
              <div key={driver._id} onClick={() => { setSelectedUser(driver); setShowDetail(true); }}
                style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, marginBottom: 8, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IonAvatar style={{ width: 44, height: 44 }}>
                    <InitialsAvatar name={driver.name} size={44} />
                  </IonAvatar>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <h3 style={{ color: '#fff', margin: 0, fontSize: 14 }}>{driver.name} {driver.isFemaleDriver ? '👩' : ''}</h3>
                      <IonBadge color={driver.role === 'driver' ? 'primary' : 'warning'} style={{ fontSize: 9 }}>
                        {driver.role === 'driver' ? '🚗 Driver' : '🏍️ Motorist'}
                      </IonBadge>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '3px 0' }}>
                      📞 {driver.phone} • 🚗 {driver.vehiclePlate} • ⭐ {driver.rating}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <IonBadge color={driver.status === 'approved' ? 'success' : driver.status === 'pending' ? 'warning' : 'danger'} style={{ fontSize: 9 }}>
                      {driver.status}
                    </IonBadge>
                    <IonIcon icon={eyeOutline} style={{ color: '#FF6B35', fontSize: 16 }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Modal */}
        <IonModal isOpen={showDetail} onDidDismiss={() => setShowDetail(false)}>
          {selectedUser && (
            <div style={{ padding: 20, background: '#0d1117', color: '#fff', height: '100%', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>{selectedUser.name} {selectedUser.isFemaleDriver ? '👩' : ''}</h2>
                <IonButton fill="clear" onClick={() => setShowDetail(false)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 22 }} /></IonButton>
              </div>

              {/* Driver Info */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Phone</span><p style={{ color: '#fff', margin: 2, fontSize: 13 }}>📞 {selectedUser.phone}</p></div>
                  <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Email</span><p style={{ color: '#fff', margin: 2, fontSize: 13 }}>📧 {selectedUser.email || 'N/A'}</p></div>
                  <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Vehicle</span><p style={{ color: '#fff', margin: 2, fontSize: 13 }}>🚗 {selectedUser.vehiclePlate} • {selectedUser.vehicleModel} ({selectedUser.vehicleColor})</p></div>
                  <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Role</span><p style={{ color: '#fff', margin: 2, fontSize: 13 }}>{selectedUser.role === 'driver' ? '🚗 Driver' : '🏍️ Motorist'}</p></div>
                  <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>NIN</span><p style={{ color: '#fff', margin: 2, fontSize: 13 }}>🆔 {selectedUser.nationalId}</p></div>
                  <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>License</span><p style={{ color: '#fff', margin: 2, fontSize: 13 }}>📋 {selectedUser.drivingLicense}</p></div>
                  <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Permit</span><p style={{ color: '#fff', margin: 2, fontSize: 13 }}>📄 {selectedUser.permitNumber}</p></div>
                  <div><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Rating</span><p style={{ color: '#FFC107', margin: 2, fontSize: 13 }}>⭐ {selectedUser.rating} ({selectedUser.totalRides} rides)</p></div>
                </div>
              </div>

              {/* Document Preview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <IonIcon icon={cameraOutline} style={{ fontSize: 24, color: 'rgba(255,255,255,0.2)', marginBottom: 8 }} />
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0 }}>Vehicle Photo</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <IonIcon icon={personOutline} style={{ fontSize: 24, color: 'rgba(255,255,255,0.2)', marginBottom: 8 }} />
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0 }}>Selfie with Vehicle</p>
                </div>
              </div>

              {/* Actions */}
              {selectedUser.status === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <IonButton expand="block" color="success" onClick={() => handleAction(selectedUser._id, 'approve')}>
                    <IonIcon icon={checkmarkCircleOutline} slot="start" /> Approve Driver
                  </IonButton>
                  <IonButton expand="block" color="danger" fill="outline" onClick={() => handleAction(selectedUser._id, 'reject')}>
                    <IonIcon icon={closeCircleOutline} slot="start" /> Reject Application
                  </IonButton>
                </div>
              )}
            </div>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default AdminUserReview;