import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import socketService from '../services/socketService';
import DriverAlertOverlay from '../components/DriverAlertOverlay';
import { Haptic } from '../services/HapticService';

interface DriverNotificationContextType {
  activeRequest: any | null;
  acceptRequest: () => void;
  rejectRequest: () => void;
}

const DriverNotificationContext = createContext<DriverNotificationContextType | undefined>(undefined);

export const DriverNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeRequest, setActiveRequest] = useState<any | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'driver' && user.role !== 'motorist') return;

    const socket = socketService.connect(user.id);

    socket.on('ride-requested', (data) => {
      console.log('🚨 Global Driver Notification: Ride Requested!', data);
      setActiveRequest(data);
    });

    return () => {
      socket.off('ride-requested');
    };
  }, [user]);

  const acceptRequest = () => {
    Haptic.success();
    console.log('✅ Driver accepted ride:', activeRequest?.id);
    // In a real app, we'd call api.post('/rides/accept', { rideId: activeRequest.id })
    setActiveRequest(null);
  };

  const rejectRequest = () => {
    Haptic.error();
    console.log('❌ Driver rejected ride:', activeRequest?.id);
    // In a real app, we'd call api.post('/rides/reject', { rideId: activeRequest.id })
    setActiveRequest(null);
  };

  return (
    <DriverNotificationContext.Provider value={{ activeRequest, acceptRequest, rejectRequest }}>
      {children}
      {activeRequest && (
        <DriverAlertOverlay
          request={activeRequest}
          onAccept={acceptRequest}
          onReject={rejectRequest}
        />
      )}
    </DriverNotificationContext.Provider>
  );
};

export const useDriverNotifications = () => {
  const context = useContext(DriverNotificationContext);
  if (!context) throw new Error('useDriverNotifications must be used within a DriverNotificationProvider');
  return context;
};
