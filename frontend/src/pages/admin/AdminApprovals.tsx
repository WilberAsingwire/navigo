import React, { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonCard, IonCardContent, IonButton, IonIcon, IonBadge,
  IonSpinner, IonToast, IonLabel, IonList, IonItem, IonAvatar,
  IonSearchbar, IonSegment, IonSegmentButton, IonChip
} from '@ionic/react';
import {
  checkmarkCircleOutline, closeCircleOutline, personOutline,
  carOutline, callOutline, documentTextOutline,
  starOutline, eyeOutline, refreshOutline,
  checkmarkDoneOutline, closeOutline
} from 'ionicons/icons';
import BodaSafeScore from '../../components/BodaSafeBadges';
import './AdminApprovals.css';

interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  verificationStatus: string;
  isFemaleDriver?: boolean;
  driverDocs?: {
    nationalId?: string;
    drivingLicense?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
  };
  createdAt: string;
}

const MOCK_DRIVERS: Driver[] = [
  { id: '1', name: 'Peter Okello', phone: '0772123456', role: 'driver', verificationStatus: 'pending', isFemaleDriver: false, driverDocs: { nationalId: 'CF8901234ABCD', drivingLicense: 'DL-2023-001234', vehiclePlate: 'UBA 123A', vehicleModel: 'Toyota Prius', vehicleColor: 'White' }, createdAt: '2 days ago' },
  { id: '2', name: 'Grace Nakamya', phone: '0753123456', role: 'motorist', verificationStatus: 'pending', isFemaleDriver: true, driverDocs: { nationalId: 'CF8905678EFGH', drivingLicense: 'DL-2023-005678', vehiclePlate: 'UBC 456B', vehicleModel: 'Bajaj Boxer', vehicleColor: 'Red' }, createdAt: '1 day ago' },
  { id: '3', name: 'James Ouma', phone: '0789123456', role: 'driver', verificationStatus: 'approved', isFemaleDriver: false, driverDocs: { nationalId: 'CF8909012IJKL', drivingLicense: 'DL-2023-009012', vehiclePlate: 'UBD 789C', vehicleModel: 'Toyota Hiace', vehicleColor: 'Silver' }, createdAt: '5 hours ago' },
  { id: '4', name: 'Sarah Birungi', phone: '0701123456', role: 'motorist', verificationStatus: 'rejected', isFemaleDriver: true, driverDocs: { nationalId: 'CF8903456MNOP', drivingLicense: 'DL-2023-003456', vehiclePlate: 'UBE 012D', vehicleModel: 'Honda CG125', vehicleColor: 'Black' }, createdAt: '3 hours ago' },
];

const AdminApprovals: React.FC = () => {
  const [drivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  useEffect(() => { setTimeout(() => setIsLoading(false), 600); }, []);

  useEffect(() => {
    let filtered = MOCK_DRIVERS;
    if (activeFilter !== 'all') filtered = filtered.filter(d => d.verificationStatus === activeFilter);
    if (searchQuery) filtered = filtered.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.phone.includes(searchQuery) || d.driverDocs?.vehiclePlate?.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredDrivers(filtered);
  }, [activeFilter, searchQuery]);

  const stats = {
    total: MOCK_DRIVERS.length,
    pending: MOCK_DRIVERS.filter(d => d.verificationStatus === 'pending').length,
    approved: MOCK_DRIVERS.filter(d => d.verificationStatus === 'approved').length,
    rejected: MOCK_DRIVERS.filter(d => d.verificationStatus === 'rejected').length,
  };

  const handleVerify = (driverId: string, action: 'approve' | 'reject') => {
    setToastMsg(action === 'approve' ? '✅ Driver approved!' : '❌ Driver rejected');
    setShowToast(true);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#1A1A1A'} as any}>
        <IonToolbar style={{'--background': '#1A1A1A', '--color': '#fff'} as any}>
          <IonTitle style={{color: '#fff'}}>Driver Approvals</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => window.location.reload()}>
            <IonIcon icon={refreshOutline} style={{color: '#FF6B35'}} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        <div className="admin-container">
          <div className="stats-grid">
            {[{label: 'Total', value: stats.total, color: '#4da6ff'}, {label: 'Pending', value: stats.pending, color: '#F59E0B'}, {label: 'Approved', value: stats.approved, color: '#10B981'}, {label: 'Rejected', value: stats.rejected, color: '#EF4444'}].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{fontSize: 20, fontWeight: 700, color: s.color}}>{s.value}</div>
                <div style={{fontSize: 14, color: '#D1D5DB'}}>{s.label}</div>
              </div>
            ))}
          </div>

          <IonSearchbar placeholder="Search by name, phone, or plate..." value={searchQuery} onIonInput={e => setSearchQuery(e.detail.value!)}
            style={{'--background': 'rgba(255,255,255,0.06)', '--color': '#fff', borderRadius: 12, marginBottom: 12} as any} debounce={300} />

          <IonSegment value={activeFilter} onIonChange={e => setActiveFilter(e.detail.value as any)} style={{marginBottom: 16}}>
            <IonSegmentButton value="all"><IonLabel style={{color: '#D1D5DB'}}>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="pending"><IonBadge style={{background:'rgba(245,158,11,0.15)', color:'#F59E0B'}}>{stats.pending}</IonBadge><IonLabel style={{color: '#D1D5DB'}}>Pending</IonLabel></IonSegmentButton>
            <IonSegmentButton value="approved"><IonLabel style={{color: '#D1D5DB'}}>Approved</IonLabel></IonSegmentButton>
            <IonSegmentButton value="rejected"><IonLabel style={{color: '#D1D5DB'}}>Rejected</IonLabel></IonSegmentButton>
          </IonSegment>

          {isLoading ? (
            <div className="loading-center"><IonSpinner /> Loading...</div>
          ) : filteredDrivers.length === 0 ? (
            <div className="empty-state">
              <IonIcon icon={checkmarkCircleOutline} style={{fontSize: 48}} />
              <p>No drivers found</p>
            </div>
          ) : (
            filteredDrivers.map(driver => (
              <IonCard key={driver.id} className="driver-card">
                <IonCardContent>
                  <div className="driver-header">
                    <IonAvatar>
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=FF6B35&color=fff&size=64`} alt={driver.name} />
                    </IonAvatar>
                    <div className="driver-info">
                      <h3>{driver.name} {driver.isFemaleDriver && '👩'}</h3>
                      <div style={{display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4}}>
                        <IonBadge style={{background: '#1E1E1E', color: '#fff'}}>{driver.role === 'driver' ? '🚗 Driver' : '🏍️ Motorist'}</IonBadge>
                        <IonBadge style={{
                          background: driver.verificationStatus === 'approved' ? 'rgba(16,185,129,0.15)' : driver.verificationStatus === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          color: driver.verificationStatus === 'approved' ? '#10B981' : driver.verificationStatus === 'pending' ? '#F59E0B' : '#EF4444',
                          border: `1px solid ${driver.verificationStatus === 'approved' ? '#10B981' : driver.verificationStatus === 'pending' ? '#F59E0B' : '#EF4444'}`
                        }}>{driver.verificationStatus}</IonBadge>
                      </div>
                    </div>
                    <IonButton fill="clear" size="small" onClick={() => setSelectedDriver(driver)} style={{'--border-radius': '50%', width: 36, height: 36, background: '#1E1E1E'} as any}>
                      <IonIcon icon={eyeOutline} style={{color: '#FF6B35', fontSize: 18}} />
                    </IonButton>
                  </div>

                  <IonList className="driver-docs-list">
                    <IonItem lines="none"><IonIcon icon={callOutline} slot="start" /><IonLabel>{driver.phone}</IonLabel></IonItem>
                    {driver.driverDocs?.drivingLicense && <IonItem lines="none"><IonIcon icon={documentTextOutline} slot="start" /><IonLabel>License: {driver.driverDocs.drivingLicense}</IonLabel></IonItem>}
                    {driver.driverDocs?.vehiclePlate && <IonItem lines="none"><IonIcon icon={carOutline} slot="start" /><IonLabel>Plate: {driver.driverDocs.vehiclePlate} • {driver.driverDocs.vehicleModel} ({driver.driverDocs.vehicleColor || 'N/A'})</IonLabel></IonItem>}
                  </IonList>

                  {driver.verificationStatus === 'pending' && (
                    <div style={{display: 'flex', gap: 8, marginTop: 12}}>
                      <IonButton expand="block" size="small" onClick={() => handleVerify(driver.id, 'approve')}
                        style={{'--background': '#FF6B35', '--color': '#fff', '--border-radius': 10, fontWeight: 600} as any}>
                        Approve
                      </IonButton>
                      <IonButton expand="block" size="small" fill="outline" onClick={() => handleVerify(driver.id, 'reject')}
                        style={{'--background': '#2A2A2A', '--color': '#EF4444', '--border-color': '#EF4444', '--border-radius': 10, fontWeight: 600} as any}>
                        Reject
                      </IonButton>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            ))
          )}
        </div>

        {selectedDriver && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, padding: 20, overflow: 'auto'}}>
            <div style={{maxWidth: 500, margin: '0 auto'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                <h2 style={{color: '#fff', margin: 0}}>Driver Details</h2>
                <IonButton fill="clear" onClick={() => setSelectedDriver(null)}><IonIcon icon={closeOutline} style={{color: '#fff', fontSize: 24}} /></IonButton>
              </div>
              <BodaSafeScore badges={['helmet','sanitized','idverified']} rating={4.5} totalRides={50} />
              <div style={{background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16, marginBottom: 16}}>
                <h3 style={{color: '#fff', margin: '0 0 12px'}}>{selectedDriver.name} {selectedDriver.isFemaleDriver && '👩'}</h3>
                <p style={{color: '#D1D5DB'}}>📞 {selectedDriver.phone}</p>
                <p style={{color: '#D1D5DB'}}>📧 {selectedDriver.email || 'No email'}</p>
                <p style={{color: '#D1D5DB'}}>🚗 {selectedDriver.driverDocs?.vehiclePlate} • {selectedDriver.driverDocs?.vehicleModel}</p>
                <p style={{color: '#D1D5DB'}}>🆔 NIN: {selectedDriver.driverDocs?.nationalId || 'N/A'}</p>
                <p style={{color: '#D1D5DB'}}>📋 License: {selectedDriver.driverDocs?.drivingLicense || 'N/A'}</p>
              </div>
              {selectedDriver.verificationStatus === 'pending' && (
                <div style={{display: 'flex', gap: 10}}>
                  <IonButton expand="block" onClick={() => handleVerify(selectedDriver.id, 'approve')} style={{'--background': '#FF6B35', '--color': '#fff'} as any}>✅ Approve</IonButton>
                  <IonButton expand="block" fill="outline" onClick={() => handleVerify(selectedDriver.id, 'reject')} style={{'--background': '#2A2A2A', '--color': '#EF4444', '--border-color': '#EF4444'} as any}>❌ Reject</IonButton>
                </div>
              )}
            </div>
          </div>
        )}

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} position="top" />
      </IonContent>
    </IonPage>
  );
};

export default AdminApprovals;