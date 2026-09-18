import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIonRouter } from '@ionic/react';
import {
  IonIcon, IonSpinner, IonToast, IonModal, IonPage, IonContent
} from '@ionic/react';
import {
  locationOutline, carOutline, arrowBackOutline,
  globeOutline, checkmarkCircleOutline, searchOutline,
  timeOutline
} from 'ionicons/icons';
import axios from 'axios';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import NavigoMap from '../../components/NavigoMap';
import socketService from '../../services/socketService';
import bodaImg from '../../assets/vehicles/boda-new.png';
import goImg from '../../assets/vehicles/go-new.png';
import comfortImg from '../../assets/vehicles/comfort-new.png';
import xlImg from '../../assets/vehicles/xl-new.png';
import './RideRequest.css';

interface Location { lat: number; lng: number; address: string; name?: string; }
interface RideOption { id: string; name: string; description: string; basePrice: number; pricePerKm: number; pricePerMinute: number; capacity: number; vehicleType: string; dbVehicleType: string; surgeMultiplier: number; color: string; image: string; }
interface FareEstimate { distance: number; duration: number; baseFare: number; distanceFare: number; timeFare: number; surgeFare: number; totalFare: number; formattedTotal: string; }
enum BookingStep { HOME = 0, LOCATION = 1, RIDE_TYPE = 2, PAYMENT = 3, MATCHING = 4 }

// Unified promo codes — single source of truth
const PROMO_CODES: Record<string, { discount: number | 'free', label: string }> = {
  NAVIGO50: { discount: 2000, label: 'UGX 2,000 off' },
  FIRSTRIDE: { discount: 'free', label: 'First ride free' },
  ZAWADI: { discount: 1500, label: 'UGX 1,500 off' },
};

// Vehicle mapping — frontend vehicleType vs DB canonical type
const RIDE_OPTIONS: RideOption[] = [
  { id: 'boda', name: 'Boda Boda', description: 'Fastest through traffic', basePrice: 1500, pricePerKm: 600, pricePerMinute: 80, capacity: 1, vehicleType: 'boda', dbVehicleType: 'boda', surgeMultiplier: 1.0, color: '#FF6B35', image: bodaImg },
  { id: 'economy', name: 'NAVIGO Go', description: 'Affordable everyday rides', basePrice: 2000, pricePerKm: 900, pricePerMinute: 100, capacity: 4, vehicleType: 'go', dbVehicleType: 'economy', surgeMultiplier: 1.0, color: '#2D6A4F', image: goImg },
  { id: 'comfort', name: 'NAVIGO Comfort', description: 'Newer cars, top drivers', basePrice: 4000, pricePerKm: 1200, pricePerMinute: 150, capacity: 4, vehicleType: 'comfort', dbVehicleType: 'comfort', surgeMultiplier: 1.0, color: '#1B4965', image: comfortImg },
  { id: 'xl', name: 'NAVIGO XL', description: 'Extra space for groups', basePrice: 6000, pricePerKm: 1800, pricePerMinute: 200, capacity: 6, vehicleType: 'xl', dbVehicleType: 'xl', surgeMultiplier: 1.0, color: '#E8B86D', image: xlImg }
];

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MATCHING_TIMEOUT_MS = 120000; // 2 minutes — auto-cancel if no driver

const Stepper: React.FC<{ currentStep: BookingStep; onStepClick: (step: BookingStep) => void }> = ({ currentStep, onStepClick }) => {
  const steps = [
    { id: BookingStep.LOCATION, label: 'Pickup', icon: locationOutline },
    { id: BookingStep.RIDE_TYPE, label: 'Vehicle', icon: carOutline },
    { id: BookingStep.PAYMENT, label: 'Payment', icon: checkmarkCircleOutline },
  ];

  return (
    <div className="booking-stepper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, position: 'relative' }}>
      <div className="stepper-line" style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.1)', zIndex: 0 }}>
        <div className="stepper-progress" style={{ height: '100%', background: '#FF6B35', transition: 'width 0.3s ease', width: `${(currentStep / 4) * 100}%` }} />
      </div>
      {steps.map((s, i) => (
        <div key={s.id} className="stepper-item" style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => onStepClick(s.id)}>
          <div className={`stepper-dot ${currentStep >= s.id ? 'active' : ''}`} style={{ width: 24, height: 24, borderRadius: '50%', background: currentStep >= s.id ? '#FF6B35' : '#3F3F46', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, border: '2px solid #121212', transition: '0.3s' }}>
            {currentStep > s.id ? <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 14 }} /> : i + 1}
          </div>
          <span className={`stepper-label ${currentStep === s.id ? 'active' : ''}`} style={{ fontSize: 10, color: currentStep === s.id ? '#fff' : '#94A3B8', marginTop: 4, fontWeight: 600 }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
};

const RideRequest: React.FC = () => {
  const ionRouter = useIonRouter();
  const { isAuthenticated, isGuest, user } = useAuth();
  const [step, setStep] = useState<BookingStep>(BookingStep.HOME);
  const [serviceType, setServiceType] = useState<'ride' | 'delivery'>('ride');
  const [pickup, setPickup] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [pickupSearch, setPickupSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchingPickup, setSearchingPickup] = useState(true);
  const [selectedRide, setSelectedRide] = useState(RIDE_OPTIONS[1]);
  const [fare, setFare] = useState<FareEstimate | null>(null);
  const [userOffer, setUserOffer] = useState<number | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [actualRouteDist, setActualRouteDist] = useState(0);
  const [actualRouteDur, setActualRouteDur] = useState(0);
  const [routeStatus, setRouteStatus] = useState<'calculating' | 'optimized' | 'unavailable'>('calculating');
  const [driverFound, setDriverFound] = useState(false);
  const [matchedDriver, setMatchedDriver] = useState<any>(null);
  const [pendingRideId, setPendingRideId] = useState<string | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState<number | 'free'>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [matchingSeconds, setMatchingSeconds] = useState(0);

  const [packageDetails, setPackageDetails] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  const geoWatchRef = useRef<number | null>(null);
  const matchingTimeoutRef = useRef<any>(null);
  const matchingIntervalRef = useRef<any>(null);
  const searchTimeoutRef = useRef<any>(null);

  const clearMatchingTimers = useCallback(() => {
    if (matchingTimeoutRef.current) clearTimeout(matchingTimeoutRef.current);
    if (matchingIntervalRef.current) clearInterval(matchingIntervalRef.current);
    matchingTimeoutRef.current = null;
    matchingIntervalRef.current = null;
    setMatchingSeconds(0);
  }, []);

  useEffect(() => {
    setIsInitializing(false);
    getCurrentLocation();
    fetchWalletBalance();
    fetchRecentRides();

    return () => {
      clearMatchingTimers();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const socket = socketService.connect(user.id);

    const onAccepted = (data: any) => {
      clearMatchingTimers();
      setDriverFound(true);
      setIsMatching(false);
      setPendingRideId(null);
      setMatchedDriver(data);
      socket.emit('join-ride-room', { rideId: data.rideId });
      setTimeout(() => ionRouter.push('/customer/active-ride'), 1500);
    };
    const onNoDrivers = (data: any) => {
      clearMatchingTimers();
      setIsMatching(false);
      setToastMsg(data.message || 'No drivers available. Try again.');
      setShowToast(true);
      setStep(BookingStep.LOCATION);
      setPendingRideId(null);
    };
    const onTaken = (data: any) => {
      // If our pending ride was taken by another driver? Actually this is for other rides
      if (pendingRideId && data.rideId !== pendingRideId) return;
    };

    socket.on('ride-accepted', onAccepted);
    socket.on('no-drivers-found', onNoDrivers);
    socket.on('ride-taken', onTaken);
    return () => {
      socket.off('ride-accepted', onAccepted);
      socket.off('no-drivers-found', onNoDrivers);
      socket.off('ride-taken', onTaken);
    };
  }, [isAuthenticated, user, pendingRideId, clearMatchingTimers]);

  useEffect(() => {
    if (pickup && destination) calculateFare();
  }, [pickup, destination, selectedRide, discount, actualRouteDist, actualRouteDur]);

  // Matching timer — shows elapsed seconds and auto-cancels after 120s
  useEffect(() => {
    if (step === BookingStep.MATCHING && pendingRideId) {
      setMatchingSeconds(0);
      matchingIntervalRef.current = setInterval(() => {
        setMatchingSeconds(s => s + 1);
      }, 1000);
      matchingTimeoutRef.current = setTimeout(async () => {
        setToastMsg('No drivers found within 2 minutes. Try increasing your offer or try again.');
        setShowToast(true);
        try {
          await api.post(`/rides/${pendingRideId}/cancel`);
        } catch { /* noop */ }
        setStep(BookingStep.LOCATION);
        setIsMatching(false);
        setPendingRideId(null);
        clearMatchingTimers();
      }, MATCHING_TIMEOUT_MS);
    } else {
      clearMatchingTimers();
    }
    return clearMatchingTimers;
  }, [step, pendingRideId, clearMatchingTimers]);

  const fetchWalletBalance = async () => {
    try {
      const res = await api.get(`/wallet/balance`);
      if (res.data?.ok) setWalletBalance(res.data.balance);
    } catch { /* noop */ }
  };

  const fetchRecentRides = async () => {
    try {
      const res = await api.get(`/rides/recent`);
      if (Array.isArray(res.data)) setRecentRides(res.data);
    } catch { /* noop */ }
  };

  const getCurrentLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala, Uganda', name: 'Kampala' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        if (lat < -1.5 || lat > 4.5 || lng < 29.5 || lng > 35.5) {
          setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala', name: 'Kampala' });
          setPickupSearch('Kampala');
          return;
        }
        setPickup({ lat, lng, address: `Current Location (±${Math.round(accuracy)}m)`, name: 'Current Location' });
        setPickupSearch('Current Location');
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: { format: 'json', lat, lon: lng, zoom: 18, addressdetails: 1 },
            timeout: 8000
          });
          const data = res.data;
          const addr = data.display_name || '';
          const address = data.address || {};
          const road = address.road || address.pedestrian || address.footway || '';
          const suburb = address.suburb || address.neighbourhood || address.village || '';
          const city = address.city || address.town || '';
          const shortName = road || suburb || city || addr.split(',')[0] || 'Current Location';
          setPickup({ lat, lng, address: addr || 'Current Location', name: shortName });
          setPickupSearch(shortName);
        } catch { /* noop */ }
      },
      () => {
        setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala, Uganda', name: 'Kampala' });
        setPickupSearch('Kampala');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  const searchLocation = async (query: string) => {
    if (query.length < 2) return [];
    const UGANDA_BBOX = { minLat: -1.5, maxLat: 4.2, minLon: 29.5, maxLon: 35.0 };
    try {
      const nomRes = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: `${query}, Uganda`,
          format: 'json',
          addressdetails: 1,
          limit: 15,
          viewbox: `${UGANDA_BBOX.minLon},${UGANDA_BBOX.minLat},${UGANDA_BBOX.maxLon},${UGANDA_BBOX.maxLat}`,
          bounded: 1
        },
        timeout: 8000
      });
      const results = nomRes.data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
        name: item.display_name.split(',')[0]
      })).filter((r: any) => !isNaN(r.lat) && !isNaN(r.lng));

      const unique = new Map();
      results.forEach((r: any) => {
        const key = `${Math.round(r.lat * 10000)}-${Math.round(r.lng * 10000)}`;
        if (!unique.has(key)) unique.set(key, r);
      });
      const finalResults = Array.from(unique.values()) as Location[];

      if (finalResults.length === 0) {
        setToastMsg('No results in Uganda. Try Kampala, Entebbe, Jinja, etc.');
        setShowToast(true);
      }
      return finalResults;
    } catch {
      return [];
    }
  };

  const handleSearch = async (query: string, isPickup: boolean) => {
    if (isPickup) setPickupSearch(query); else setDestSearch(query);
    setSearchingPickup(isPickup);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchLocation(query);
        setSearchResults(results);
        setIsSearching(false);
      }, 300);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const selectLocation = (loc: Location) => {
    if (searchingPickup) {
      setPickup(loc);
      setPickupSearch(loc.name || loc.address.split(',')[0]);
    } else {
      setDestination(loc);
      setDestSearch(loc.name || loc.address.split(',')[0]);
    }
    setSearchResults([]);
  };

  const calculateFastFare = useCallback(() => {
    if (!pickup || !destination) return;
    const dist = actualRouteDist > 0 ? actualRouteDist : calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const speed = selectedRide.vehicleType === 'boda' ? 28 : 22;
    const dur = actualRouteDur > 0 ? actualRouteDur : (dist / speed) * 60;

    const rawTotal = Math.max(selectedRide.basePrice + (dist * selectedRide.pricePerKm) + (dur * selectedRide.pricePerMinute), selectedRide.basePrice);
    const finalTotal = discount === 'free' ? 0 : Math.max(rawTotal - (discount as number), 0);

    setFare({
      distance: Math.round(dist * 10) / 10,
      duration: Math.round(dur),
      baseFare: selectedRide.basePrice,
      distanceFare: 0,
      timeFare: 0,
      surgeFare: 0,
      totalFare: finalTotal,
      formattedTotal: 'UGX ' + Math.round(finalTotal).toLocaleString()
    });
  }, [pickup, destination, selectedRide, discount, actualRouteDist, actualRouteDur]);

  const calculateFare = async () => {
    if (!pickup || !destination) return;
    const dist = actualRouteDist > 0 ? actualRouteDist : calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const speed = selectedRide.vehicleType === 'boda' ? 28 : 22;
    const dur = actualRouteDur > 0 ? actualRouteDur : (dist / speed) * 60;

    try {
      const res = await api.get(`/rides/quote`, {
        params: { type: selectedRide.dbVehicleType, km: dist, min: dur }
      });
      if (res.data.ok) {
        const rawFare = res.data.fare;
        const finalTotal = discount === 'free' ? 0 : Math.max(rawFare - (discount as number), 0);
        setFare({
          distance: Math.round(dist * 10) / 10,
          duration: Math.round(dur),
          baseFare: selectedRide.basePrice,
          distanceFare: 0,
          timeFare: 0,
          surgeFare: 0,
          totalFare: finalTotal,
          formattedTotal: 'UGX ' + finalTotal.toLocaleString()
        });
      }
    } catch { /* noop */ }
  };

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    const promo = PROMO_CODES[code];
    if (!promo) {
      setToastMsg(`Invalid code. Try: ${Object.keys(PROMO_CODES).join(', ')}`);
      setShowToast(true);
      return;
    }
    if (promo.discount === 'free') {
      setDiscount('free');
      setToastMsg(`🎉 ${promo.label}! Free ride applied.`);
    } else {
      setDiscount(promo.discount);
      setToastMsg(`🎉 ${promo.label}! UGX ${promo.discount.toLocaleString()} off.`);
    }
    setShowToast(true);
  };

  const handleMapClick = async (latlng: [number, number]) => {
    const [lat, lng] = latlng;
    if (lat < -1.5 || lat > 4.2 || lng < 29.5 || lng > 35) {
      setToastMsg('Please select a location within Uganda.');
      setShowToast(true);
      return;
    }
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
        params: { format: 'json', lat, lon: lng, zoom: 18, addressdetails: 1 },
        timeout: 8000
      });
      const addr = res.data.display_name || '';
      const address = res.data.address || {};
      const road = address.road || address.pedestrian || '';
      const suburb = address.suburb || address.neighbourhood || '';
      const city = address.city || address.town || '';
      const shortName = road || suburb || city || addr.split(',')[0] || 'Selected Point';
      const loc: Location = { lat, lng, address: addr || 'Selected Point', name: shortName };
      if (searchingPickup) {
        setPickup(loc);
        setPickupSearch(shortName);
      } else {
        setDestination(loc);
        setDestSearch(shortName);
      }
    } catch {
      const loc: Location = { lat, lng, address: 'Selected Point', name: 'Selected Point' };
      if (searchingPickup) {
        setPickup(loc);
        setPickupSearch(loc.name || '');
      } else {
        setDestination(loc);
        setDestSearch('Selected Point');
      }
    }
  };

  const handleBookRide = async () => {
    if (isGuest || !isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    if (!pickup || !destination) {
      setToastMsg('Please select pickup and destination.');
      setShowToast(true);
      return;
    }
    setIsLoading(true);
    try {
      const finalFare = userOffer ?? fare?.totalFare;
      const res = await api.post(`/rides/request`, {
        serviceType,
        pickup,
        destination,
        rideType: selectedRide.dbVehicleType,
        paymentMethod,
        distanceKm: actualRouteDist > 0 ? actualRouteDist : fare?.distance,
        durationMin: actualRouteDur > 0 ? actualRouteDur : fare?.duration,
        packageDetails: serviceType === 'delivery' ? packageDetails : null,
        receiverName: serviceType === 'delivery' ? receiverName : null,
        receiverPhone: serviceType === 'delivery' ? receiverPhone : null,
        fareOffered: finalFare,
      });
      const ride = res.data.ride;
      setPendingRideId(ride.id);
      setStep(BookingStep.MATCHING);
      setIsMatching(true);
      const socket = socketService.getSocket();
      if (socket) socket.emit('request-ride', { userId: user?.id, rideId: ride.id });
    } catch (e: any) {
      setToastMsg(e.response?.data?.message || 'Failed to request booking. Please try again.');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRideId || cancellingRequest) return;
    setCancellingRequest(true);
    clearMatchingTimers();
    try {
      await api.post(`/rides/${pendingRideId}/cancel`);
      setStep(BookingStep.LOCATION);
      setIsMatching(false);
      setPendingRideId(null);
      setToastMsg('Request cancelled');
      setShowToast(true);
    } catch (e: any) {
      setToastMsg(e.response?.data?.message || 'Could not cancel the request');
      setShowToast(true);
    } finally {
      setCancellingRequest(false);
    }
  };

  const handleStepChange = (targetStep: BookingStep) => {
    if (targetStep === BookingStep.MATCHING) return; // Cannot jump to matching
    if (targetStep === BookingStep.PAYMENT && (!pickup || !destination)) {
      setToastMsg('Please select pickup and destination first.');
      setShowToast(true);
      setStep(BookingStep.LOCATION);
      return;
    }
    setStep(targetStep);
  };

  if (isInitializing) {
    return (
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--nav-bg)', color: '#fff', gap: 16 }}>
        <IonSpinner name="crescent" color="warning" />
        <p>Initializing NAVIGO...</p>
      </div>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="ride-request-content ride-request-wrapper" style={{'--background': 'var(--nav-bg)'} as any}>
        <div className="booking-page-container">
          <div className="booking-form-panel">
            <button className="back-nav-btn" onClick={() => ionRouter.push('/customer/home')}>
              <IonIcon icon={arrowBackOutline} /> Back
            </button>

        <div className="glass-booking-card">
          {step === BookingStep.HOME && (
            <div className="space-y-6">
              <div className="welcome-header">
                <span className="welcome-eyebrow">Welcome Back</span>
                <h1 className="welcome-title">Hello, {user?.fullName?.split(' ')[0] || 'Guest'}!</h1>
                <p style={{ color: '#94A3B8', fontSize: '14px', marginTop: '4px' }}>Where would you like to go today?</p>
              </div>

              <button className="quick-action-btn" onClick={() => { setStep(BookingStep.LOCATION); setSearchingPickup(false); }}>
                <div className="quick-action-icon"><IonIcon icon={searchOutline} /></div>
                <span>Enter destination...</span>
              </button>


              <div className="space-y-3">
                <p className="section-label">Recent Trips</p>
                <div className="space-y-2">
                  {recentRides.length > 0 ? (
                    recentRides.map((ride) => (
                      <div
                        key={ride.id}
                        className="recent-trip-item"
                        onClick={() => {
                          setDestination({
                            name: ride.dropName,
                            lat: ride.dropLat,
                            lng: ride.dropLng,
                            address: ride.dropName
                          });
                          setDestSearch(ride.dropName);
                          setStep(BookingStep.LOCATION);
                        }}
                      >
                        <div className="recent-trip-icon"><IonIcon icon={timeOutline} /></div>
                        <div className="flex-1 truncate">
                          <span className="block text-[13px] font-medium text-white">{ride.dropName}</span>
                          <span className="block text-[11px] text-zinc-500">Visited {new Date(ride.requestedAt).toLocaleDateString()}</span>
                        </div>
                        <span className="text-[12px] font-bold text-ember">UGX {ride.fareFinal?.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#64748B', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                      No recent trips yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === BookingStep.LOCATION && (
            <div className="space-y-6">
              <h1 className="card-title" style={{ textAlign: 'center' }}>Book Your Ride</h1>
              <div className="service-toggle" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 20 }}>
                <button onClick={() => setServiceType('ride')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: serviceType === 'ride' ? '#FF6B35' : 'transparent', color: '#fff', fontWeight: 600, fontSize: '13px', transition: '0.3s' }}>🚗 Ride</button>
                <button onClick={() => setServiceType('delivery')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: serviceType === 'delivery' ? '#FF6B35' : 'transparent', color: '#fff', fontWeight: 600, fontSize: '13px', transition: '0.3s' }}>📦 Delivery</button>
              </div>

              <div className="location-input-group">
                <h2 className="section-label" style={{ textAlign: 'center', fontSize: '18px', color: '#fff', textTransform: 'none', marginBottom: '15px' }}>Where to?</h2>
                <div className="location-search-container">
                  <div className="location-input-group-relative" style={{ position: 'relative' }}>
                    <div className="location-input-wrapper">
                      <div className="input-icon"><IonIcon icon={globeOutline} /></div>
                      <input className="location-input" placeholder="Pickup Location" value={pickupSearch} onChange={e => handleSearch(e.target.value, true)} onFocus={() => setSearchingPickup(true)} />
                    </div>
                  </div>

                  <div className="location-input-group-relative" style={{ position: 'relative' }}>
                    <div className="location-input-wrapper">
                      <div className="input-icon"><IonIcon icon={locationOutline} /></div>
                      <input className="location-input" placeholder="Destination" value={destSearch} onChange={e => handleSearch(e.target.value, false)} onFocus={() => setSearchingPickup(false)} />
                    </div>
                  </div>

                  {isSearching && (
                    <div className="search-results-list" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', textAlign: 'center' }}>
                      <IonSpinner name="crescent" color="warning" />
                      <span style={{ marginLeft: '10px', fontSize: '12px', color: '#94A3B8' }}>Searching Uganda...</span>
                    </div>
                  )}
                  {!isSearching && searchResults.length > 0 && (
                    <div className="search-results-list">
                      {searchResults.map((r, i) => (
                        <div key={i} className="search-result-item" onClick={() => selectLocation(r)}>
                          <IonIcon icon={locationOutline} style={{ color: '#FF6B35' }} />
                          <div className="result-info">
                            <span className="result-name">{r.name || r.address.split(',')[0]}</span>
                            <span className="result-addr">{r.address}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="vehicle-options-grid">
                <h3 className="section-label">Select Vehicle</h3>
                {RIDE_OPTIONS.map(opt => {
                  const est = fare ? Math.round((opt.basePrice + fare.distance * opt.pricePerKm + fare.duration * opt.pricePerMinute) * opt.surgeMultiplier) : opt.basePrice;
                  return (
                    <div key={opt.id} className={`vehicle-option-card ${selectedRide.id === opt.id ? 'selected' : ''}`} onClick={() => setSelectedRide(opt)}>
                      <div className="vehicle-main-info">
                        <span className="vehicle-emoji">
                          <img src={opt.image} alt={opt.name} className="vehicle-thumb" />
                        </span>
                        <div className="vehicle-details">
                          <span className="vehicle-type-name">{opt.name}</span>
                          <span className="vehicle-type-desc">{opt.description}</span>
                        </div>
                      </div>
                      <div className="vehicle-price-badge">UGX {est.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>

              <button className="btn-continue" disabled={!pickup || !destination} onClick={() => setStep(BookingStep.PAYMENT)}>CONTINUE</button>
            </div>
          )}

          {step === BookingStep.PAYMENT && (
            <div className="space-y-6">
              <h2 className="card-title" style={{ textAlign: 'center', fontSize: '20px' }}>{serviceType === 'ride' ? 'Fare Summary' : 'Delivery Details'}</h2>

              {serviceType === 'delivery' && (
                <div className="space-y-3" style={{ marginBottom: 20 }}>
                  <div className="location-input-wrapper">
                    <input className="location-input" placeholder="What are we delivering?" value={packageDetails} onChange={e => setPackageDetails(e.target.value)} />
                  </div>
                  <div className="location-input-wrapper">
                    <input className="location-input" placeholder="Receiver's Name" value={receiverName} onChange={e => setReceiverName(e.target.value)} />
                  </div>
                  <div className="location-input-wrapper">
                    <input className="location-input" placeholder="Receiver's Phone (07...)" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="fare-summary-box">
                <div className="fare-detail">
                  <span className="fare-label">Distance</span>
                  <span className="fare-value">{fare?.distance ?? 0} km • {fare?.duration ?? 0} min</span>
                </div>
                <div className="fare-total">{fare?.formattedTotal || 'Calculating...'}</div>
                {discount > 0 && <div style={{ fontSize: 12, color: '#10B981', marginTop: 4 }}>Discount: -UGX {discount.toLocaleString()}</div>}
              </div>

              {fare && (
                <div className="fare-bid-container" style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="section-label" style={{ marginBottom: '8px' }}>Adjust Your Offer</p>
                  <div className="fare-bid-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <button className="bid-btn" onClick={() => setUserOffer(Math.max(selectedRide.basePrice, (userOffer ?? fare.totalFare) - 500))} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}>−</button>
                    <span className="bid-amount" style={{ fontWeight: 700, color: '#fff' }}>UGX {(userOffer ?? fare.totalFare).toLocaleString()}</span>
                    <button className="bid-btn" onClick={() => setUserOffer((userOffer ?? fare.totalFare) + 500)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}>+</button>
                  </div>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>Higher offers get picked up faster</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94A3B8', padding: '0 4px' }}>
                <span style={{ textTransform: 'capitalize' }}>{serviceType}: {selectedRide.name}</span>
                <span style={{ color: 'white', fontWeight: 600 }}>Balance: UGX {walletBalance.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 15 }}>
                <button onClick={() => setPaymentMethod('cash')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: paymentMethod === 'cash' ? '#FF6B35' : 'transparent', color: '#fff', fontWeight: 600, fontSize: '13px', transition: '0.3s' }}>💵 Cash</button>
                <button onClick={() => setPaymentMethod('wallet')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: paymentMethod === 'wallet' ? '#FF6B35' : 'transparent', color: '#fff', fontWeight: 600, fontSize: '13px', transition: '0.3s' }}>💳 Wallet</button>
              </div>

              <div className="location-input-wrapper">
                <div className="input-icon"><IonIcon icon={checkmarkCircleOutline} /></div>
                <input className="location-input" placeholder="Promo Code" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} />
                <button className="back-nav-btn" style={{ fontWeight: 'bold', color: '#FF6B35', marginBottom: 0, position: 'static', background: 'none', border: 'none', padding: '0 10px', cursor: 'pointer' }} onClick={applyPromo}>Apply</button>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', padding: '0 4px' }}>Try: {Object.keys(PROMO_CODES).join(', ')}</div>

              <button className="btn-continue" disabled={isLoading || (serviceType === 'delivery' && (!packageDetails || !receiverName || !receiverPhone))} onClick={handleBookRide}>
                {isLoading ? <IonSpinner name="crescent" /> : serviceType === 'ride' ? 'CONFIRM BOOKING' : 'CONFIRM DELIVERY'}
              </button>
              <button className="back-nav-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} onClick={() => setStep(BookingStep.LOCATION)}>Change Details</button>
            </div>
          )}

          {step === BookingStep.MATCHING && (
            <div className="matching-state" style={{ textAlign: 'center', padding: 20 }}>
              <div className="matching-emoji pulse-soft" style={{ fontSize: 48, marginBottom: 16 }}>🚕</div>
              <div className="space-y-2">
                <h2 className="card-title" style={{ textAlign: 'center' }}>Finding your driver… {matchingSeconds}s</h2>
                <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>
                  We've alerted drivers near {pickup?.name || 'you'}. Auto-cancels in {Math.max(0, 120 - matchingSeconds)}s if no driver accepts.
                </p>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 16, overflow: 'hidden' }}>
                  <div style={{ width: `${(matchingSeconds / 120) * 100}%`, height: '100%', background: '#FF6B35', transition: 'width 1s linear' }} />
                </div>
              </div>
              <button
                onClick={handleCancelRequest}
                disabled={cancellingRequest}
                style={{
                  marginTop: 18,
                  width: '100%',
                  padding: '12px',
                  borderRadius: 12,
                  border: '1px solid rgba(239,68,68,0.4)',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#EF4444',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {cancellingRequest ? 'Cancelling…' : 'Cancel request'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="booking-map-panel">
        <NavigoMap
          userLocation={pickup}
          destination={destination}
          driverType={selectedRide.vehicleType}
          height="100%"
          showControls={true}
          showNearbyDrivers={step === BookingStep.HOME}
          searchResults={searchResults.map(r => ({ lat: r.lat, lng: r.lng, name: r.name || r.address.split(',')[0], address: r.address }))}
          onMapClick={handleMapClick}
          onPickupDrag={(ll) => {
            const [lat, lng] = ll;
            setPickup({ lat, lng, address: 'Dragged Pickup', name: 'Pickup' });
            setPickupSearch('Pickup');
          }}
          onDestDrag={(ll) => {
            const [lat, lng] = ll;
            setDestination({ lat, lng, address: 'Dragged Destination', name: 'Destination' });
            setDestSearch('Destination');
          }}
          onDistanceChange={(d, t) => { setActualRouteDist(d); setActualRouteDur(t); }}
        />
      </div>

      <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} color="dark" position="top" />
      <IonModal isOpen={showLoginPrompt} onDidDismiss={() => setShowLoginPrompt(false)}>
        <div className="glass-booking-card" style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', padding: 24, background: '#121212', borderRadius: 16 }}>
          <h2 className="card-title" style={{ color: '#fff' }}>Ready to Ride?</h2>
          <p style={{ color: '#94A3B8', marginBottom: '24px' }}>Sign in to book rides and earn rewards.</p>
          <button className="btn-continue" style={{ width: '100%', padding: 12, background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }} onClick={() => { setShowLoginPrompt(false); ionRouter.push('/login'); }}>Sign In</button>
          <button className="back-nav-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '16px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }} onClick={() => { setShowLoginPrompt(false); ionRouter.push('/register'); }}>Create Account</button>
        </div>
      </IonModal>
    </div>
      </IonContent>
    </IonPage>
  );
};

export default RideRequest;
