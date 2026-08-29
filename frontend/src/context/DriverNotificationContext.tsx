import React, { createContext, useContext, useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from './AuthContext';
import socketService from '../services/socketService';
import api from '../services/api';
import DriverAlertOverlay from '../components/DriverAlertOverlay';
import { Haptic } from '../services/HapticService';

interface DriverNotificationContextType {
  activeRequest: any | null;
  isAccepting: boolean;
  acceptRequest: () => void;
  rejectRequest: () => void;
}

const DriverNotificationContext = createContext<DriverNotificationContextType | undefined>(undefined);

export const DriverNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const history = useHistory();
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'driver') return;

    const socket = socketService.connect(user.id);

    const onRideRequested = async (data: any) => {
      console.log('🚨 Global Driver Notification: Ride Requested!', data);
      // The socket payload only carries { rideId, riderId } — fetch the real
      // fare/vehicle/pickup details so the alert shows actual trip info
      // instead of the component's hardcoded fallback numbers ("Boda",
      // "UGX 8,500", "2 mins") that used to display regardless of the real ride.
      try {
        const res = await api.get(`/rides/details/${data.rideId}`);
        setActiveRequest({
          ...data,
          vehicleType: res.data.vehicleType,
          fare: res.data.fareFinal || res.data.fareRecommended,
          distanceKm: res.data.distanceKm,
          durationMin: res.data.durationMin,
          pickup: res.data.pickup,
          destination: res.data.destination,
        });
      } catch (e) {
        console.error('Failed to load ride request details:', e);
        setActiveRequest(data);
      }
    };

    // The backend can reject 'accept-ride' (e.g. another driver already
    // claimed it) with a plain 'error' event. Previously nothing listened
    // for this, so the driver saw no feedback and stayed stuck on whatever
    // screen they were on, believing the accept had gone through.
    const onSocketError = (err: { message?: string }) => {
      if (!isAccepting) return;
      setIsAccepting(false);
      Haptic.error();
      console.warn('Ride accept failed:', err?.message);
      alert(err?.message || 'Could not accept this ride — it may have already been taken.');
    };

    // Ride actually accepted (server confirmed) — only now can we safely
    // navigate the driver to their active trip.
    const onRideAccepted = (data: any) => {
      setIsAccepting(false);
      setActiveRequest(null);
      history.push('/driver/active-ride');
    };

    socket.on('ride-requested', onRideRequested);
    socket.on('error', onSocketError);
    socket.on('ride-accepted', onRideAccepted);

    return () => {
      socket.off('ride-requested', onRideRequested);
      socket.off('error', onSocketError);
      socket.off('ride-accepted', onRideAccepted);
    };
  }, [user, history, isAccepting]);

  const acceptRequest = () => {
    if (!activeRequest || !user || isAccepting) return;
    Haptic.success();
    setIsAccepting(true);
    const rideId = activeRequest.rideId || activeRequest.id;
    const socket = socketService.connect(user.id);
    // The backend accepts rides over the socket (socketHandler.ts `accept-ride`),
    // which atomically claims the ride and flips the driver's availability.
    // Navigation only happens once the server confirms via 'ride-accepted'
    // (see the listener above) — not optimistically here.
    socket.emit('accept-ride', { driverId: user.id, rideId, riderId: activeRequest.riderId });
    console.log('✅ Driver requested to accept ride:', rideId);
  };

  const rejectRequest = () => {
    Haptic.error();
    console.log('❌ Driver rejected ride:', activeRequest?.rideId || activeRequest?.id);
    setActiveRequest(null);
    setIsAccepting(false);
  };

  return (
    <DriverNotificationContext.Provider value={{ activeRequest, isAccepting, acceptRequest, rejectRequest }}>
      {children}
      {activeRequest && (
        <DriverAlertOverlay
          request={activeRequest}
          isAccepting={isAccepting}
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
