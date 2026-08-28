import React from 'react';
import { useHistory } from 'react-router-dom';
import { IonGrid, IonRow, IonCol, IonIcon, IonBadge } from '@ionic/react';
import { 
  carOutline, bicycleOutline, timeOutline, walletOutline, 
  mapOutline, giftOutline, phonePortraitOutline, starOutline 
} from 'ionicons/icons';
import './ExploreContainer.css';

interface ContainerProps {
  role?: 'rider' | 'driver' | 'admin';
}

const ExploreContainer: React.FC<ContainerProps> = ({ role = 'rider' }) => {
  const history = useHistory();

  const riderActions = [
    { label: 'Book Ride', icon: carOutline, path: '/customer/book', color: '#FF6B35', badge: 'New' },
    { label: 'Boda Boda', icon: bicycleOutline, path: '/customer/book', color: '#ffab40', badge: 'Fast' },
    { label: 'History', icon: timeOutline, path: '/customer/history', color: '#4da6ff' },
    { label: 'Wallet', icon: walletOutline, path: '/customer/payments', color: '#2D6A4F' },
    { label: 'Live Map', icon: mapOutline, path: '/customer/book', color: '#1B4965' },
    { label: 'Rewards', icon: giftOutline, path: '/customer/home', color: '#FFC107' },
    { label: 'Offline', icon: phonePortraitOutline, path: '/ussd', color: '#b47fff', badge: 'USSD' },
    { label: 'Rate Us', icon: starOutline, path: '/customer/support', color: '#E85D75' },
  ];

  const driverActions = [
    { label: 'Go Online', icon: carOutline, path: '/driver/home', color: '#2D6A4F', badge: 'Start' },
    { label: 'Earnings', icon: walletOutline, path: '/driver/earnings', color: '#FF6B35' },
    { label: 'Vehicle', icon: carOutline, path: '/driver/vehicle', color: '#4da6ff' },
    { label: 'Documents', icon: timeOutline, path: '/driver/documents', color: '#b47fff' },
  ];

  const actions = role === 'driver' ? driverActions : riderActions;

  return (
    <div className="explore-container">
      <div className="explore-header">
        <h3>Quick Actions</h3>
      </div>
      <IonGrid className="explore-grid">
        <IonRow>
          {actions.map((action, index) => (
            <IonCol size="3" key={index}>
              <div className="explore-item" onClick={() => history.push(action.path)}>
                <div className="explore-icon-box" style={{ background: `${action.color}20` }}>
                  <IonIcon icon={action.icon} style={{ color: action.color, fontSize: 22 }} />
                  {action.badge && (
                    <IonBadge className="explore-badge" color="warning">{action.badge}</IonBadge>
                  )}
                </div>
                <span className="explore-label">{action.label}</span>
              </div>
            </IonCol>
          ))}
        </IonRow>
      </IonGrid>
    </div>
  );
};

export default ExploreContainer;