import React, { useState, useEffect } from 'react';
import {
  IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonSearchbar, IonList, IonItem, IonAvatar,
  IonLabel, IonBadge, IonIcon, IonButton, IonActionSheet, IonProgressBar, useIonToast
} from '@ionic/react';
import {
  personOutline, carOutline, bicycleOutline,
  ellipsisVerticalOutline, trashOutline, banOutline,
  checkmarkCircleOutline, mailOutline
} from 'ionicons/icons';
import api from '../../services/api';
import './AdminUsers.css';

const AdminUsers: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [presentToast] = useIonToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchText.toLowerCase())
  );

  const updateUserStatus = async (id: string, status: string) => {
    try {
      await api.put(`/admin/users/${id}/status`, { status });
      fetchUsers();
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Failed to update status', color: 'danger', duration: 3000 });
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await api.delete(`/admin/users/${id}`);
      presentToast({ message: 'User permanently deleted from system 🗑️', color: 'success', duration: 3000 });
      fetchUsers();
    } catch (e: any) {
      presentToast({ message: e.response?.data?.message || 'Delete failed', color: 'danger', duration: 3000 });
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="admin-toolbar">
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" /></IonButtons>
          <IonTitle className="sora-font">User Management</IonTitle>
        </IonToolbar>
        <IonToolbar className="admin-toolbar">
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            placeholder="Search users..."
            className="admin-search"
          />
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-bg">
        {loading && <IonProgressBar type="indeterminate" color="success" />}

        <div className="ion-padding">
          <h3 className="sora-font" style={{ color: 'white' }}>System Users ({filteredUsers.length})</h3>
        </div>

        <IonList lines="none" className="admin-user-list">
          {filteredUsers.map(user => (
            <IonItem key={user._id} className="user-list-item">
              <IonAvatar slot="start">
                <img src={user.avatar || `https://i.pravatar.cc/150?u=${user._id}`} alt="avatar" />
              </IonAvatar>
              <IonLabel>
                <h2 style={{ color: 'white', fontWeight: 'bold' }}>{user.name}</h2>
                <p style={{ color: '#666' }}>{user.email}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <IonIcon
                    icon={user.role === 'rider' ? personOutline : user.role === 'driver' ? carOutline : bicycleOutline}
                    style={{ color: '#00e676', fontSize: '0.9rem' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>{user.role}</span>
                </div>
              </IonLabel>
              <div slot="end" className="user-actions">
                <IonBadge color={user.status === 'active' ? 'success' : 'danger'}>
                  {user.status}
                </IonBadge>
                <IonButton fill="clear" color="medium" onClick={() => { setSelectedUser(user); setShowActionSheet(true); }}>
                  <IonIcon icon={ellipsisVerticalOutline} />
                </IonButton>
              </div>
            </IonItem>
          ))}
        </IonList>

        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          header={`Manage ${selectedUser?.name}`}
          buttons={[
            {
              text: 'Email User',
              icon: mailOutline,
              handler: () => { window.location.href = `mailto:${selectedUser.email}`; }
            },
            {
              text: selectedUser?.status === 'active' ? 'Suspend Account' : 'Activate Account',
              icon: selectedUser?.status === 'active' ? banOutline : checkmarkCircleOutline,
              role: selectedUser?.status === 'active' ? 'destructive' : '',
              handler: () => { updateUserStatus(selectedUser._id, selectedUser.status === 'active' ? 'suspended' : 'active'); }
            },
            {
              text: 'Delete Permanently',
              role: 'destructive',
              icon: trashOutline,
              handler: () => { deleteUser(selectedUser._id); }
            },
            { text: 'Cancel', role: 'cancel' }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminUsers;
