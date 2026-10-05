import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import socketService from '../services/socketService';
import api from '../services/api';
import DriverAlertOverlay from '../components/DriverAlertOverlay';
import { Haptic } from '../services/HapticService';

interface DriverNotificationContextType {
  activeRequest: any | null;
  acceptRequest: () => void;
  rejectRequest: () => void;
}

const DriverNotificationContext = createContext<DriverNotificationContextType | undefined>(undefined);

const ACCEPT_TIMEOUT_MS = 10000;
const REQUEST_TTL_MS = 20000; // auto-dismiss, mirrors the IncomingRequest page timer

/** Pages that render their own request UI — the global overlay stays out of the way there. */
const SUPPRESSED_PATHS = ['/driver/requests', '/driver/active-ride'];

export const DriverNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const dismissTimerRef = useRef<any>(null);

  const clearRequest = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = null;
    setActiveRequest(null);
    setIsAccepting(false);
    setAcceptError(null);
  }, []);

  useEffect(() => {
    if (!user || (user.role !== 'driver' && user.role !== 'motorist')) return;

    const socket = socketService.connect(user.id);

    const onRideRequested = async (data: { rideId: string; riderId: string }) => {
      // The IncomingRequest page (and active-ride screen) handle requests themselves.
      if (SUPPRESSED_PATHS.some(p => window.location.pathname.startsWith(p))) return;

      // Enrich the overlay with real ride details (fare, vehicle, pickup).
      let details: any = { id: data.rideId, rideId: data.rideId };
      try {
        const res = await api.get(`/rides/details/${data.rideId}`);
        details = {
          ...res.data,
          rideId: data.rideId,
          fare: res.data.fareFinal ?? res.data.fareRecommended,
          vehicleType: res.data.vehicleType,
        };
      } catch {
        /* show overlay with minimal info if details fail */
      }

      setAcceptError(null);
      setIsAccepting(false);
      setActiveRequest(details);

      // Auto-dismiss if the driver doesn't react in time.
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => clearRequest(), REQUEST_TTL_MS);
    };

    // If another driver takes the ride while the overlay is up, dismiss it.
    const onRideTaken = (data: { rideId: string }) => {
      setActiveRequest((prev: any) => {
        if (prev && (prev.rideId === data.rideId || prev.id === data.rideId)) {
          return null;
        }
        return prev;
      });
    };

    socket.on('ride-requested', onRideRequested);
    socket.on('ride-taken', onRideTaken);

    return () => {
      socket.off('ride-requested', onRideRequested);
      socket.off('ride-taken', onRideTaken);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [user, clearRequest]);

  const acceptRequest = useCallback(() => {
    if (!activeRequest || !user || isAccepting) return;
    const socket = socketService.getSocket();
    const rideId = activeRequest.rideId || activeRequest.id;
    if (!socket || !rideId) {
      setAcceptError('Connection lost. Open the app again and retry.');
      return;
    }

    setIsAccepting(true);
    setAcceptError(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current); // don't auto-dismiss mid-accept

    let settled = false;
    const cleanup = () => {
      socket.off('accept-confirmed', onConfirmed);
      socket.off('error', onError);
      clearTimeout(timer);
    };

    const onConfirmed = (d: { rideId: string }) => {
      if (settled || d.rideId !== rideId) return;
      settled = true;
      cleanup();
      Haptic.success();
      clearRequest();
      // Provider lives outside the router, so navigate via location.
      window.location.assign('/driver/active-ride');
    };

    const onError = (e: { message?: string }) => {
      if (settled) return;
      settled = true;
      cleanup();
      Haptic.error();
      setIsAccepting(false);
      setAcceptError(e?.message || 'Ride is no longer available.');
      // Leave the overlay up briefly so the driver can read the reason.
      dismissTimerRef.current = setTimeout(() => clearRequest(), 4000);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      setIsAccepting(false);
      setAcceptError('No response from server. Please try again.');
      dismissTimerRef.current = setTimeout(() => clearRequest(), 4000);
    }, ACCEPT_TIMEOUT_MS);

    socket.on('accept-confirmed', onConfirmed);
    socket.on('error', onError);
    socket.emit('accept-ride', { driverId: user.id, rideId });
  }, [activeRequest, user, isAccepting, clearRequest]);

  const rejectRequest = useCallback(() => {
    Haptic.error();
    clearRequest();
  }, [clearRequest]);

  return (
    <DriverNotificationContext.Provider value={{ activeRequest, acceptRequest, rejectRequest }}>
      {children}
      {activeRequest && (
        <DriverAlertOverlay
          request={activeRequest}
          onAccept={acceptRequest}
          onReject={rejectRequest}
          isAccepting={isAccepting}
          error={acceptError}
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
