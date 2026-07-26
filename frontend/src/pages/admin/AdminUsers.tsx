import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonSearchbar, IonList, IonItem, IonAvatar,
  IonLabel, IonBadge, IonIcon, IonButton, IonActionSheet, 
  IonProgressBar, useIonToast, IonSegment, IonSegmentButton,
  IonChip, IonModal
} from '@ionic/react';
import {
  personOutline, carOutline, bicycleOutline,
  ellipsisVerticalOutline, trashOutline, banOutline,
  checkmarkCircleOutline, mailOutline, callOutline,
  shieldCheckmarkOutline, downloadOutline, refreshOutline,
  closeOutline, peopleOutline, starOutline
} from 'ionicons/icons';
import './AdminUsers.css';

interface User {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'rider' | 'driver' | 'motorist' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  rating?: number;
  totalRides?: number;
  joinedDate: string;
  verificationStatus?: string;
}

const MOCK_USERS: User[] = [
  { _id: '1', name: 'Alice Nakamya', email: 'alice@email.com', phone: '0772123456', role: 'rider', status: 'active', rating: 4.8, totalRides: 45, joinedDate: 'Jan 2024' },
  { _id: '2', name: 'Peter Okello', email: 'peter@email.com', phone: '0753123456', role: 'driver', status: 'active', rating: 4.6, totalRides: 230, joinedDate: 'Mar 2024', verificationStatus: 'approved' },
  { _id: '3', name: 'Grace Birungi', phone: '0789123456', role: 'motorist', status: 'active', rating: 4.9, totalRides: 450, joinedDate: 'Feb 2024', verificationStatus: 'approved' },
  { _id: '4', name: 'James Ouma', email: 'james@email.com', phone: '0701123456', role: 'driver', status: 'suspended', rating: 3.2, totalRides: 12, joinedDate: 'Jun 2024' },
  { _id: '5', name: 'Sarah Kintu', email: 'sarah@email.com', phone: '0776123456', role: 'rider', status: 'active', rating: 4.5, totalRides: 89, joinedDate: 'Apr 2024' },
  { _id: '6', name: 'David Mugisha', phone: '0758123456', role: 'motorist', status: 'active', rating: 4.7, totalRides: 156, joinedDate: 'May 2024', verificationStatus: 'pending' },
  { _id: '7', name: 'Admin User', email: 'admin@navigo.ug', phone: '0770000000', role: 'admin', status: 'active', joinedDate: 'Jan 2024' },
  { _id: '8', name: 'Mary Auma', email: 'mary@email.com', phone: '0785123456', role: 'rider', status: 'banned', rating: 2.1, totalRides: 3, joinedDate: 'Jul 2024' },
];

const AdminUsers: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [loading, setLoading] = useState(true);
  const [presentToast] = useIonToast();
  const [activeFilter, setActiveFilter] = useState<'all' | 'rider' | 'driver' | 'motorist'>('all');
  const [showDetail, setShowDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchText.toLowerCase()) ||
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

  const updateUserStatus = (id: string, status: 'active' | 'suspended' | 'banned') => {
    setUsers(prev => prev.map(u => u._id === id ? { ...u, status } : u));
    presentToast({ message: `User ${status === 'active' ? 'activated ✅' : status === 'suspended' ? 'suspended ⚠️' : 'banned ❌'}`, duration: 2000, color: status === 'active' ? 'success' : 'warning' });
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u._id !== id));
    presentToast({ message: 'User deleted permanently 🗑️', color: 'success', duration: 2000 });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'rider': return personOutline;
      case 'driver': return carOutline;
      case 'motorist': return bicycleOutline;
      case 'admin': return shieldCheckmarkOutline;
      default: return personOutline;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'rider': return '#00e676';
      case 'driver': return '#4da6ff';
      case 'motorist': return '#ffab40';
      case 'admin': return '#ff5252';
      default: return '#888';
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" /></IonButtons>
          <IonTitle>User Management</IonTitle>
          <IonButton slot="end" fill="clear"><IonIcon icon={downloadOutline} style={{ color: '#FF6B35' }} /></IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{'--background': '#080c14'} as any}>
        {loading && <IonProgressBar type="indeterminate" color="warning" />}

        <div style={{ padding: 14, maxWidth: 700, margin: '0 auto' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
            {[
              { label: 'Total', value: stats.total, color: '#4da6ff' },
              { label: 'Riders', value: stats.riders, color: '#00e676' },
              { label: 'Drivers', value: stats.drivers + stats.motorists, color: '#FF6B35' },
              { label: 'Suspended', value: stats.suspended, color: '#FFC107' },
              { label: 'Banned', value: stats.banned, color: '#ff5252' },
            ].slice(0, 5).map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <IonSearchbar placeholder="Search by name, email, or phone..." value={searchText} onIonInput={e => setSearchText(e.detail.value!)}
            style={{ '--background': 'rgba(255,255,255,0.05)', '--color': '#fff', borderRadius: 12, marginBottom: 10 } as any} debounce={300} />

          {/* Role Filter */}
          <IonSegment value={activeFilter} onIonChange={e => setActiveFilter(e.detail.value as any)} style={{ marginBottom: 8 }}>
            <IonSegmentButton value="all"><IonLabel style={{ fontSize: 11 }}>All</IonLabel></IonSegmentButton>
            <IonSegmentButton value="rider"><IonLabel style={{ fontSize: 11 }}>Riders</IonLabel></IonSegmentButton>
            <IonSegmentButton value="driver"><IonLabel style={{ fontSize: 11 }}>Drivers</IonLabel></IonSegmentButton>
            <IonSegmentButton value="motorist"><IonLabel style={{ fontSize: 11 }}>Motorists</IonLabel></IonSegmentButton>
          </IonSegment>

          {/* Status Filter */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
            {(['all', 'active', 'suspended', 'banned'] as const).map(s => (
              <IonChip key={s} outline={statusFilter !== s} color={statusFilter === s ? 'warning' : 'medium'}
                onClick={() => setStatusFilter(s)} style={{ fontSize: 10 }}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </IonChip>
            ))}
          </div>

          {/* User List */}
          <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 10 }}>Users ({filteredUsers.length})</h3>
          {filteredUsers.map(user => (
            <div key={user._id} onClick={() => { setSelectedUser(user); setShowDetail(true); }}
              style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.04)' }}>
              <IonAvatar style={{ width: 40, height: 40 }}>
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=${getRoleColor(user.role).replace('#','')}&color=fff&size=64`} alt={user.name} />
              </IonAvatar>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{user.name}</span>
                  <IonIcon icon={getRoleIcon(user.role)} style={{ color: getRoleColor(user.role), fontSize: 14 }} />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 2 }}>{user.email || user.phone} • Joined {user.joinedDate}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <IonBadge color={user.status === 'active' ? 'success' : user.status === 'suspended' ? 'warning' : 'danger'} style={{ fontSize: 9 }}>
                  {user.status}
                </IonBadge>
                <IonButton fill="clear" size="small" onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setShowActionSheet(true); }}>
                  <IonIcon icon={ellipsisVerticalOutline} style={{ color: '#fff' }} />
                </IonButton>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Modal */}
        <IonModal isOpen={showDetail} onDidDismiss={() => setShowDetail(false)}>
          {selectedUser && (
            <div style={{ padding: 20, background: '#0d1117', color: '#fff', height: '100%', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>{selectedUser.name}</h2>
                <IonButton fill="clear" onClick={() => setShowDetail(false)}><IonIcon icon={closeOutline} style={{ color: '#fff', fontSize: 22 }} /></IonButton>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <IonAvatar style={{ width: 80, height: 80, margin: '0 auto 10px' }}>
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=FF6B35&color=fff&size=128`} alt="" />
                </IonAvatar>
                <IonBadge color={selectedUser.status === 'active' ? 'success' : 'danger'}>{selectedUser.status}</IonBadge>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <p>📞 {selectedUser.phone}</p>
                <p>📧 {selectedUser.email || 'No email'}</p>
                <p>🔄 Role: {selectedUser.role}</p>
                <p>⭐ Rating: {selectedUser.rating || 'N/A'}</p>
                <p>🚗 Rides: {selectedUser.totalRides || 0}</p>
                <p>📅 Joined: {selectedUser.joinedDate}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedUser.status !== 'active' && (
                  <IonButton expand="block" color="success" onClick={() => { updateUserStatus(selectedUser._id, 'active'); setShowDetail(false); }}>
                    <IonIcon icon={checkmarkCircleOutline} slot="start" /> Activate Account
                  </IonButton>
                )}
                {selectedUser.status === 'active' && (
                  <IonButton expand="block" color="warning" onClick={() => { updateUserStatus(selectedUser._id, 'suspended'); setShowDetail(false); }}>
                    <IonIcon icon={banOutline} slot="start" /> Suspend Account
                  </IonButton>
                )}
                <IonButton expand="block" color="danger" fill="outline" onClick={() => { deleteUser(selectedUser._id); setShowDetail(false); }}>
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
          header={`Manage ${selectedUser?.name}`}
          buttons={[
            { text: 'Email User', icon: mailOutline, handler: () => { if (selectedUser?.email) window.location.href = `mailto:${selectedUser.email}`; } },
            { text: 'Call User', icon: callOutline, handler: () => { if (selectedUser?.phone) window.open(`tel:${selectedUser.phone}`, '_system'); } },
            { text: selectedUser?.status === 'active' ? 'Suspend Account' : 'Activate Account', icon: selectedUser?.status === 'active' ? banOutline : checkmarkCircleOutline, handler: () => { updateUserStatus(selectedUser!._id, selectedUser?.status === 'active' ? 'suspended' : 'active'); } },
            { text: 'Ban User', icon: banOutline, role: 'destructive', handler: () => { updateUserStatus(selectedUser!._id, 'banned'); } },
            { text: 'Delete Permanently', role: 'destructive', icon: trashOutline, handler: () => { deleteUser(selectedUser!._id); } },
            { text: 'Cancel', role: 'cancel' }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminUsers;