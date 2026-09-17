import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonSearchbar, IonItem, IonAvatar,
  IonLabel, IonBadge, IonIcon, IonButton, IonActionSheet,
  IonProgressBar, useIonToast, IonSegment, IonSegmentButton,
  IonChip, IonModal
} from '@ionic/react';
import {
  personOutline, carOutline, bicycleOutline,
  ellipsisVerticalOutline, trashOutline, banOutline,
  checkmarkCircleOutline, mailOutline, callOutline,
  shieldCheckmarkOutline, downloadOutline,
  closeOutline, peopleOutline, starOutline
} from 'ionicons/icons';
import InitialsAvatar from '../../components/InitialsAvatar';
import api from '../../services/api';
import './AdminUsers.css';

interface User {
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  role: 'rider' | 'driver' | 'motorist' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  rating?: number;
  totalRides?: number;
  createdAt: string;
  verificationStatus?: string;
}

// Remove MOCK_USERS entirely

const AdminUsers: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [presentToast] = useIonToast();
  const [activeFilter, setActiveFilter] = useState<'all' | 'rider' | 'driver' | 'motorist'>('all');
  const [showDetail, setShowDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/auth/admin/users');
        setUsers(res.data);
      } catch (e) {
        console.error('Failed to fetch users:', e);
        presentToast({ message: 'Error loading users', duration: 3000, color: 'danger' });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      user.phone.includes(searchText);
    const matchesRole = activeFilter === 'all' || user.role === activeFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    riders: users.filter(u => u.role === 'rider').length,
    drivers: users.filter(u => u.role === 'driver').length,
    motorists: users.filter(u => u.role === 'motorist').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    banned: users.filter(u => u.status === 'banned').length,
  };

  const updateUserStatus = async (id: string, status: 'active' | 'suspended' | 'banned') => {
    try {
      await api.post('/auth/admin/update-user-status', { userId: id, status });
      presentToast({ message: `User ${status === 'active' ? 'activated' : status === 'suspended' ? 'suspended' : 'banned'}`, duration: 2000, color: status === 'active' ? 'success' : 'warning' });
      // Refresh users list
      const res = await api.get('/auth/admin/users');
      setUsers(res.data);
    } catch (e) {
      presentToast({ message: 'Error updating status', duration: 3000, color: 'danger' });
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await api.delete(`/auth/admin/user/${id}`);
      presentToast({ message: 'User deleted', duration: 2000, color: 'danger' });
      // Refresh users list
      const res = await api.get('/auth/admin/users');
      setUsers(res.data);
    } catch (e) {
      presentToast({ message: 'Error deleting user', duration: 3000, color: 'danger' });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) { case 'rider': return personOutline; case 'driver': return carOutline; case 'motorist': return bicycleOutline; case 'admin': return shieldCheckmarkOutline; default: return personOutline; }
  };

  const getRoleColor = (role: string) => {
    switch (role) { case 'rider': return '#00e676'; case 'driver': return '#4da6ff'; case 'motorist': return '#ffab40'; case 'admin': return '#ff5252'; default: return '#888'; }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'rgba(16,185,129,0.15)', border: '#10B981', text: '#10B981' };
      case 'suspended': return { bg: 'rgba(245,158,11,0.15)', border: '#F59E0B', text: '#F59E0B' };
      case 'banned': return { bg: 'rgba(239,68,68,0.15)', border: '#EF4444', text: '#EF4444' };
      default: return { bg: '#333', border: '#666', text: '#999' };
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border" style={{'--background': '#1A1A1A'} as any}>
        <IonToolbar style={{'--background': '#1A1A1A', '--color': '#fff'} as any}>
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" style={{color: '#fff'}} /></IonButtons>
          <IonTitle style={{color: '#fff'}}>User Management</IonTitle>
          <IonButton slot="end" fill="clear"><IonIcon icon={downloadOutline} style={{color: '#FF6B35'}} /></IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any} className="admin-users-container">
        {loading && <IonProgressBar type="indeterminate" color="warning" />}

        <div style={{padding: 14, maxWidth: 700, margin: '0 auto'}}>
          {/* Stats */}
          <div className="stats-grid">
            {[{label: 'Total', value: stats.total}, {label: 'Customers', value: stats.riders}, {label: 'Drivers', value: stats.drivers + stats.motorists}, {label: 'Suspended', value: stats.suspended}, {label: 'Banned', value: stats.banned}].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{fontSize: 16, fontWeight: 700, color: '#FF6B35'}}>{s.value}</div>
                <div style={{fontSize: 9, color: '#D1D5DB'}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <IonSearchbar placeholder="Search by name, email, or phone..." value={searchText} onIonInput={e => setSearchText(e.detail.value!)}
            style={{'--background': 'rgba(255,255,255,0.05)', '--color': '#fff', borderRadius: 12, marginBottom: 10} as any} debounce={300} />

          {/* Role Filter */}
          <IonSegment value={activeFilter} onIonChange={e => setActiveFilter(e.detail.value as any)} style={{marginBottom: 8}}>
            <IonSegmentButton value="all"><IonLabel style={{fontSize: 11, color: '#D1D5DB'}}>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="rider"><IonLabel style={{fontSize: 11, color: '#D1D5DB'}}>Customers</IonLabel></IonSegmentButton>
            <IonSegmentButton value="driver"><IonLabel style={{fontSize: 11, color: '#D1D5DB'}}>Drivers</IonLabel></IonSegmentButton>
            <IonSegmentButton value="motorist"><IonLabel style={{fontSize: 11, color: '#D1D5DB'}}>Motorists</IonLabel></IonSegmentButton>
          </IonSegment>

          {/* Status Filter */}
          <div style={{display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap'}}>
            {(['all', 'active', 'suspended', 'banned'] as const).map(s => (
              <IonChip key={s} outline={statusFilter !== s} color={statusFilter === s ? 'warning' : 'medium'}
                onClick={() => setStatusFilter(s)} style={{fontSize: 10}}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </IonChip>
            ))}
          </div>

          {/* User List */}
          <h3 style={{color: '#fff', fontSize: 14, marginBottom: 10}}>Users ({filteredUsers.length})</h3>
          {filteredUsers.map(user => {
            const sc = getStatusColor(user.status);
            return (
              <div key={user.id} onClick={() => { setSelectedUser(user); setShowDetail(true); }}
                style={{background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.04)'}}>
                <IonAvatar style={{width: 40, height: 40, background: '#2A2A2A'}}>
                  <InitialsAvatar name={user.fullName} size={40} color="#64748B" />
                </IonAvatar>
                <div style={{flex: 1}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                    <span style={{color: '#fff', fontSize: 13, fontWeight: 600}}>{user.fullName}</span>
                    <IonIcon icon={getRoleIcon(user.role)} style={{color: getRoleColor(user.role), fontSize: 14}} />
                  </div>
                  <p style={{color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2}}>{user.email || user.phone} • Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end'}}>
                  <span style={{background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600}}>
                    {user.status}
                  </span>
                  <IonButton fill="clear" size="small" onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setShowActionSheet(true); }}>
                    <IonIcon icon={ellipsisVerticalOutline} style={{color: '#fff'}} />
                  </IonButton>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Modal */}
        <IonModal isOpen={showDetail} onDidDismiss={() => setShowDetail(false)}>
          {selectedUser && (
            <div style={{padding: 20, background: 'var(--nav-bg-soft)', color: '#fff', height: '100%', overflow: 'auto'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                <h2 style={{margin: 0}}>{selectedUser.fullName}</h2>
                <IonButton fill="clear" onClick={() => setShowDetail(false)}><IonIcon icon={closeOutline} style={{color: '#fff', fontSize: 22}} /></IonButton>
              </div>
              <div style={{textAlign: 'center', marginBottom: 20}}>
                <IonAvatar style={{width: 80, height: 80, margin: '0 auto 10px', background: '#2A2A2A'}}>
                  <InitialsAvatar name={selectedUser.fullName} size={80} color="#64748B" />
                </IonAvatar>
                {(() => { const sc = getStatusColor(selectedUser.status); return <span style={{background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600}}>{selectedUser.status}</span>; })()}
              </div>
              <div style={{background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, marginBottom: 16}}>
                <p>📞 {selectedUser.phone}</p>
                <p>📧 {selectedUser.email || 'No email'}</p>
                <p>🔄 Role: {selectedUser.role}</p>
                <p>⭐ Rating: {selectedUser.rating || 'N/A'}</p>
                <p>🚗 Rides: {selectedUser.totalRides || 0}</p>
                <p>📅 Joined: {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                {selectedUser.status !== 'active' && (
                  <IonButton expand="block" color="success" onClick={() => { updateUserStatus(selectedUser.id, 'active'); setShowDetail(false); }}>
                    <IonIcon icon={checkmarkCircleOutline} slot="start" /> Activate Account
                  </IonButton>
                )}
                {selectedUser.status === 'active' && (
                  <IonButton expand="block" color="warning" onClick={() => { updateUserStatus(selectedUser.id, 'suspended'); setShowDetail(false); }}>
                    <IonIcon icon={banOutline} slot="start" /> Suspend Account
                  </IonButton>
                )}
                <IonButton expand="block" color="danger" fill="outline" onClick={() => { deleteUser(selectedUser.id); setShowDetail(false); }}>
                  <IonIcon icon={trashOutline} slot="start" /> Delete Permanently
                </IonButton>
              </div>
            </div>
          )}
        </IonModal>

        {/* Action Sheet */}
        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          header={`Manage ${selectedUser?.fullName}`}
          buttons={[
            { text: 'Email User', icon: mailOutline, handler: () => { if (selectedUser?.email) window.location.href = `mailto:${selectedUser.email}`; } },
            { text: 'Call User', icon: callOutline, handler: () => { if (selectedUser?.phone) window.open(`tel:${selectedUser.phone}`, '_system'); } },
            { text: selectedUser?.status === 'active' ? 'Suspend Account' : 'Activate Account', icon: selectedUser?.status === 'active' ? banOutline : checkmarkCircleOutline, handler: () => { updateUserStatus(selectedUser!.id, selectedUser?.status === 'active' ? 'suspended' : 'active'); } },
            { text: 'Ban User', icon: banOutline, role: 'destructive', handler: () => { updateUserStatus(selectedUser!.id, 'banned'); } },
            { text: 'Delete Permanently', role: 'destructive', icon: trashOutline, handler: () => { deleteUser(selectedUser!.id); } },
            { text: 'Cancel', role: 'cancel' }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminUsers;