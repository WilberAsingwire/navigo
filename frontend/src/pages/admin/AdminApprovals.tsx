import React, { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonCard, IonCardContent, IonButton, IonIcon, IonBadge,
  IonSpinner, IonToast, IonLabel, IonList, IonItem, IonAvatar,
  IonSearchbar, IonSegment, IonSegmentButton, IonChip
} from '@ionic/react';
import {
  checkmarkCircleOutline, closeCircleOutline, personOutline,
  carOutline, callOutline, documentTextOutline, shieldCheckmarkOutline,
  starOutline, eyeOutline, funnelOutline, refreshOutline,
  checkmarkDoneOutline, closeOutline
} from 'ionicons/icons';
import BodaSafeScore from '../../components/BodaSafeBadges';
import axios from 'axios';
import './AdminApprovals.css';

const API_URL = 'https://navigo-fzdo.onrender.com/api';

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
    permitNumber?: string;
    insuranceNumber?: string;
  };
  safetyScore?: number;
  createdAt: string;
}

const AdminApprovals: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  useEffect(() => { loadDrivers(); }, []);

  useEffect(() => {
    let filtered = drivers;
    if (activeFilter !== 'all') filtered = filtered.filter(d => d.verificationStatus === activeFilter);
    if (searchQuery) filtered = filtered.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.phone.includes(searchQuery) || 
      d.driverDocs?.vehiclePlate?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredDrivers(filtered);
  }, [drivers, activeFilter, searchQuery]);

  const loadDrivers = async () => {
    setIsLoading(true);
    try {
      // Try to fetch from API
      const res = await axios.get(`${API_URL}/auth/admin/pending-drivers`);
      const allDrivers = res.data.drivers || [];
      if (allDrivers.length > 0) {
        setDrivers(allDrivers);
        updateStats(allDrivers);
        return;
      }
    } catch (err) {
      console.log('API unavailable, using mock data');
    }
    
    // Mock data for testing
    const mockDrivers: Driver[] = [
      {
        id: '1', name: 'Peter Okello', phone: '0772123456', role: 'driver',
        verificationStatus: 'pending', isFemaleDriver: false,
        driverDocs: { nationalId: 'CF8901234ABCD', drivingLicense: 'DL-2023-001234', vehiclePlate: 'UBA 123A', vehicleModel: 'Toyota Prius', vehicleColor: 'White' },
        createdAt: '2 days ago'
      },
      {
        id: '2', name: 'Grace Nakamya', phone: '0753123456', role: 'motorist',
        verificationStatus: 'pending', isFemaleDriver: true,
        driverDocs: { nationalId: 'CF8905678EFGH', drivingLicense: 'DL-2023-005678', vehiclePlate: 'UBC 456B', vehicleModel: 'Bajaj Boxer', vehicleColor: 'Red' },
        createdAt: '1 day ago'
      },
      {
        id: '3', name: 'James Ouma', phone: '0789123456', role: 'driver',
        verificationStatus: 'approved', isFemaleDriver: false,
        driverDocs: { nationalId: 'CF8909012IJKL', drivingLicense: 'DL-2023-009012', vehiclePlate: 'UBD 789C', vehicleModel: 'Toyota Hiace', vehicleColor: 'Silver' },
        createdAt: '5 hours ago'
      },
      {
        id: '4', name: 'Sarah Birungi', phone: '0701123456', role: 'motorist',
        verificationStatus: 'rejected', isFemaleDriver: true,
        driverDocs: { nationalId: 'CF8903456MNOP', drivingLicense: 'DL-2023-003456', vehiclePlate: 'UBE 012D', vehicleModel: 'Honda CG125', vehicleColor: 'Black' },
        createdAt: '3 hours ago'
      },
    ];
    
    setDrivers(mockDrivers);
    updateStats(mockDrivers);
    setIsLoading(false);
  };

  const updateStats = (driverList: Driver[]) => {
    setStats({
      total: driverList.length,
      pending: driverList.filter(d => d.verificationStatus === 'pending').length,
      approved: driverList.filter(d => d.verificationStatus === 'approved').length,
      rejected: driverList.filter(d => d.verificationStatus === 'rejected').length,
    });
  };

  const handleVerify = async (driverId: string, action: 'approve' | 'reject') => {
    const adminUser = JSON.parse(localStorage.getItem('navigo_user') || '{}');
    try {
      await axios.post(`${API_URL}/auth/admin/verify-driver`, {
        adminId: adminUser.id, driverId, action,
        reason: action === 'reject' ? 'Documents not satisfactory. Please re-upload clearer documents.' : undefined
      });
      setToastMsg(action === 'approve' ? '✅ Driver approved successfully!' : '❌ Driver rejected');
      setShowToast(true);
      loadDrivers();
      setSelectedDriver(null);
    } catch (err: any) {
      setToastMsg(err.response?.data?.message || 'Action failed');
      setShowToast(true);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    const pendingDrivers = drivers.filter(d => d.verificationStatus === 'pending');
    if (pendingDrivers.length === 0) return;
    setToastMsg(`Processing ${pendingDrivers.length} drivers...`);
    setShowToast(true);
    for (const driver of pendingDrivers) {
      await handleVerify(driver.id, action);
    }
    loadDrivers();
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>Driver Approvals</IonTitle>
          <IonButton slot="end" fill="clear" onClick={loadDrivers}>
            <IonIcon icon={refreshOutline} style={{ color: '#FF6B35' }} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-content">
        <div className="admin-container">
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[{ label: 'Total', value: stats.total, color: '#4da6ff' }, { label: 'Pending', value: stats.pending, color: '#FFC107' }, { label: 'Approved', value: stats.approved, color: '#2D6A4F' }, { label: 'Rejected', value: stats.rejected, color: '#ff5252' }].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search & Filter */}
          <IonSearchbar placeholder="Search by name, phone, or plate..." value={searchQuery} onIonInput={e => setSearchQuery(e.detail.value!)} 
            style={{ '--background': 'rgba(255,255,255,0.06)', '--color': '#fff', '--placeholder-color': '#888', borderRadius: 12, marginBottom: 12 } as any} debounce={300} />

          <IonSegment value={activeFilter} onIonChange={e => setActiveFilter(e.detail.value as any)} style={{ marginBottom: 16 }}>
            <IonSegmentButton value="all"><IonLabel>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="pending"><IonBadge color="warning">{stats.pending}</IonBadge><IonLabel>Pending</IonLabel></IonSegmentButton>
            <IonSegmentButton value="approved"><IonLabel>Approved</IonLabel></IonSegmentButton>
            <IonSegmentButton value="rejected"><IonLabel>Rejected</IonLabel></IonSegmentButton>
          </IonSegment>

          {/* Bulk Actions */}
          {activeFilter === 'pending' && filteredDrivers.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <IonButton expand="block" size="small" color="success" onClick={() => handleBulkAction('approve')}>
                <IonIcon icon={checkmarkDoneOutline} slot="start" /> Approve All ({filteredDrivers.length})
              </IonButton>
              <IonButton expand="block" size="small" color="danger" fill="outline" onClick={() => handleBulkAction('reject')}>
                <IonIcon icon={closeOutline} slot="start" /> Reject All
              </IonButton>
            </div>
          )}

          {/* Driver List */}
          {isLoading ? (
            <div className="loading-center"><IonSpinner /> Loading drivers...</div>
          ) : filteredDrivers.length === 0 ? (
            <div className="empty-state">
              <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 48 }} />
              <p>No drivers found</p>
            </div>
          ) : (
            filteredDrivers.map(driver => (
              <IonCard key={driver.id} className="driver-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedDriver(driver)}>
                <IonCardContent>
                  <div className="driver-header">
                    <IonAvatar>
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=FF6B35&color=fff&size=64`} alt={driver.name} />
                    </IonAvatar>
                    <div className="driver-info">
                      <h3>{driver.name} {driver.isFemaleDriver && '👩'}</h3>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        <IonBadge color={driver.role === 'driver' ? 'primary' : 'warning'}>
                          {driver.role === 'driver' ? '🚗 Driver' : '🏍️ Motorist'}
                        </IonBadge>
                        <IonBadge color={driver.verificationStatus === 'approved' ? 'success' : driver.verificationStatus === 'pending' ? 'warning' : 'danger'}>
                          {driver.verificationStatus}
                        </IonBadge>
                      </div>
                    </div>
                    <IonIcon icon={eyeOutline} style={{ color: '#FF6B35', fontSize: 20 }} />
                  </div>

                  <IonList className="driver-docs-list">
                    <IonItem lines="none"><IonIcon icon={callOutline} slot="start" /><IonLabel>{driver.phone}</IonLabel></IonItem>
                    {driver.driverDocs?.drivingLicense && <IonItem lines="none"><IonIcon icon={documentTextOutline} slot="start" /><IonLabel>License: {driver.driverDocs.drivingLicense}</IonLabel></IonItem>}
                    {driver.driverDocs?.vehiclePlate && <IonItem lines="none"><IonIcon icon={carOutline} slot="start" /><IonLabel>Plate: {driver.driverDocs.vehiclePlate} • {driver.driverDocs.vehicleModel} ({driver.driverDocs.vehicleColor || 'N/A'})</IonLabel></IonItem>}
                  </IonList>

                  {driver.verificationStatus === 'pending' && (
                    <div className="action-buttons" style={{ marginTop: 12 }}>
                      <IonButton expand="block" color="success" size="small" onClick={(e) => { e.stopPropagation(); handleVerify(driver.id, 'approve'); }}>
                        <IonIcon icon={checkmarkCircleOutline} slot="start" /> Approve
                      </IonButton>
                      <IonButton expand="block" color="danger" fill="outline" size="small" onClick={(e) => { e.stopPropagation(); handleVerify(driver.id, 'reject'); }}>
                        <IonIcon icon={closeCircleOutline} slot="start" /> Reject
                      </IonButton>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            ))
          )}
        </div>

        {/* Driver Detail Modal */}
        {selectedDriver && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, padding: 20, overflow: 'auto' }}>
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ color: '#fff', margin: 0 }}>Driver Details</h2>
                <IonButton fill="clear" onClick={() => setSelectedDriver(null)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 24 }} /></IonButton>
              </div>
              <BodaSafeScore badges={['helmet', 'sanitized', 'idverified']} rating={4.5} totalRides={50} />
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <h3 style={{ color: '#fff', margin: '0 0 12px' }}>{selectedDriver.name} {selectedDriver.isFemaleDriver && '👩'}</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)' }}>📞 {selectedDriver.phone}</p>
                <p style={{ color: 'rgba(255,255,255,0.6)' }}>📧 {selectedDriver.email || 'No email'}</p>
                <p style={{ color: 'rgba(255,255,255,0.6)' }}>🚗 {selectedDriver.driverDocs?.vehiclePlate} • {selectedDriver.driverDocs?.vehicleModel}</p>
                <p style={{ color: 'rgba(255,255,255,0.6)' }}>🆔 NIN: {selectedDriver.driverDocs?.nationalId || 'N/A'}</p>
                <p style={{ color: 'rgba(255,255,255,0.6)' }}>📋 License: {selectedDriver.driverDocs?.drivingLicense || 'N/A'}</p>
              </div>
              {selectedDriver.verificationStatus === 'pending' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <IonButton expand="block" color="success" onClick={() => handleVerify(selectedDriver.id, 'approve')}>✅ Approve</IonButton>
                  <IonButton expand="block" color="danger" fill="outline" onClick={() => handleVerify(selectedDriver.id, 'reject')}>❌ Reject</IonButton>
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