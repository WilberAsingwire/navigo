import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIonRouter } from '@ionic/react';
import {
  IonIcon, IonSpinner, IonToast, IonModal, IonPage, IonContent
} from '@ionic/react';
import {
  locationOutline, carOutline, arrowBackOutline,
  globeOutline, checkmarkCircleOutline, searchOutline,
  timeOutline, cubeOutline, cashOutline, walletOutline,
  pricetagOutline
} from 'ionicons/icons';
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
interface FareEstimate { distance: number; duration: number; baseFare: number; distanceFare: number; timeFare: number; deliveryFee: number; totalFare: number; formattedTotal: string; offerMin?: number; offerMax?: number; }
enum BookingStep { HOME = 0, LOCATION = 1, RIDE_TYPE = 2, PAYMENT = 3, MATCHING = 4 }

// Unified promo codes — single source of truth
const PROMO_CODES: Record<string, { discount: number | 'free', label: string }> = {
  NAVIGO50: { discount: 2000, label: 'UGX 2,000 off' },
  FIRSTRIDE: { discount: 'free', label: 'First ride free' },
  ZAWADI: { discount: 1500, label: 'UGX 1,500 off' },
};

// Vehicle mapping — frontend vehicleType vs DB canonical type
const RIDE_OPTIONS: RideOption[] = [
  { id: 'boda', name: 'Boda Boda', description: 'Fastest through traffic', basePrice: 800, pricePerKm: 450, pricePerMinute: 45, capacity: 1, vehicleType: 'boda', dbVehicleType: 'boda', surgeMultiplier: 1.0, color: '#FF6B35', image: bodaImg },
  { id: 'economy', name: 'NAVIGO Go', description: 'Affordable everyday rides', basePrice: 1500, pricePerKm: 750, pricePerMinute: 70, capacity: 4, vehicleType: 'go', dbVehicleType: 'economy', surgeMultiplier: 1.0, color: '#2D6A4F', image: goImg },
  { id: 'comfort', name: 'NAVIGO Comfort', description: 'Newer cars, top drivers', basePrice: 2500, pricePerKm: 950, pricePerMinute: 90, capacity: 4, vehicleType: 'comfort', dbVehicleType: 'comfort', surgeMultiplier: 1.0, color: '#1B4965', image: comfortImg },
  { id: 'xl', name: 'NAVIGO XL', description: 'Extra space for groups', basePrice: 4000, pricePerKm: 1300, pricePerMinute: 110, capacity: 6, vehicleType: 'xl', dbVehicleType: 'xl', surgeMultiplier: 1.0, color: '#E8B86D', image: xlImg }
];

const MATCHING_TIMEOUT_MS = 120000; // 2 minutes — auto-cancel if no driver

/** Linear progress segments — one per booking step, filled as the
 *  rider advances. Tapping a completed segment navigates back. */
const Stepper: React.FC<{ currentStep: BookingStep; onStepClick: (step: BookingStep) => void }> = ({ currentStep, onStepClick }) => {
  const steps = [BookingStep.LOCATION, BookingStep.RIDE_TYPE, BookingStep.PAYMENT];

  return (
    <div className="booking-stepper" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={Math.min(currentStep, steps.length)}>
      {steps.map((s) => (
        <div
          key={s}
          className={`booking-stepper-seg ${currentStep >= s ? 'done' : ''}`}
          onClick={() => currentStep > s && onStepClick(s)}
          style={currentStep > s ? { cursor: 'pointer' } : undefined}
        />
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
  const [routeStatus, setRouteStatus] = useState<'calculating' | 'ready' | 'unavailable'>('unavailable');
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

  const [vehicleQuotes, setVehicleQuotes] = useState<Record<string, any>>({});
  const [packageDetails, setPackageDetails] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  const geoWatchRef = useRef<number | null>(null);
  const matchingTimeoutRef = useRef<any>(null);
  const matchingIntervalRef = useRef<any>(null);
  const searchTimeoutRef = useRef<any>(null);
  const searchRequestRef = useRef(0);

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
    const onNoDrivers = (_data: any) => {
      // Temporary driver absence is not a failed match; the matching loop retries.
      // The matching panel already communicates that the search is still active.
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
    if (!pickup || !destination || routeStatus !== 'ready' || actualRouteDist <= 0 || actualRouteDur <= 0) {
      setFare(null);
      return;
    }
    void calculateFare();
  }, [pickup, destination, selectedRide, serviceType, discount, actualRouteDist, actualRouteDur, routeStatus]);

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

  useEffect(() => {
    if (!pickup || !destination || routeStatus !== 'ready' || actualRouteDist <= 0 || actualRouteDur <= 0) {
      setVehicleQuotes({});
      return;
    }
    let active = true;
    api.get('/rides/quotes', {
      params: { km: actualRouteDist, min: actualRouteDur, serviceType },
    }).then(res => {
      if (active && res.data?.ok) setVehicleQuotes(res.data.quotes || {});
    }).catch(() => {
      if (active) setVehicleQuotes({});
    });
    return () => { active = false; };
  }, [pickup, destination, serviceType, actualRouteDist, actualRouteDur, routeStatus]);

  useEffect(() => {
    if (step !== BookingStep.MATCHING || !pendingRideId) return;
    const timer = window.setInterval(() => {
      const socket = socketService.getSocket();
      if (socket?.connected && user?.id) {
        socket.emit('request-ride', { userId: user.id, rideId: pendingRideId });
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [step, pendingRideId, user?.id]);

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
      setPickupSearch('Kampala');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (lat < -5 || lat > 5 || lng < 29 || lng > 36) {
          setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala, Uganda', name: 'Kampala' });
          setPickupSearch('Kampala');
          return;
        }

        const fallback: Location = {
          lat,
          lng,
          address: 'Current Location',
          name: 'Current Location',
        };
        setPickup(fallback);
        setPickupSearch('Current Location');

        try {
          const res = await api.get('/poi/reverse', { params: { lat, lng } });
          const place = res.data?.place;
          if (place) {
            const resolved: Location = {
              lat,
              lng,
              address: place.address || fallback.address,
              name: place.name || fallback.name,
            };
            setPickup(resolved);
            setPickupSearch(resolved.name || 'Current Location');
          }
        } catch { /* keep GPS coordinates if reverse geocoding is unavailable */ }
      },
      () => {
        setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala, Uganda', name: 'Kampala' });
        setPickupSearch('Kampala');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  const searchLocation = async (query: string): Promise<Location[]> => {
    const q = query.trim();
    if (q.length < 2) return [];

    try {
      const res = await api.get('/poi/search', { params: { q, limit: 30 } });
      return Array.isArray(res.data?.results)
        ? res.data.results
            .map((item: any) => ({
              lat: Number(item.lat),
              lng: Number(item.lng),
              address: item.address || item.name || 'Selected place',
              name: item.name || item.address?.split(',')?.[0] || 'Selected place',
            }))
            .filter((item: Location) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
        : [];
    } catch {
      return [];
    }
  };

  const handleSearch = async (query: string, isPickup: boolean) => {
    if (isPickup) setPickupSearch(query); else setDestSearch(query);
    setSearchingPickup(isPickup);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const requestId = ++searchRequestRef.current;

    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchLocation(query);
      if (requestId !== searchRequestRef.current) return;
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
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

  const calculateFare = async () => {
    if (!pickup || !destination || routeStatus !== 'ready' || actualRouteDist <= 0 || actualRouteDur <= 0) {
      setFare(null);
      return;
    }

    try {
      const res = await api.get('/rides/quote', {
        params: {
          type: selectedRide.dbVehicleType,
          km: actualRouteDist,
          min: actualRouteDur,
          serviceType,
        },
      });
      if (!res.data?.ok) throw new Error('Fare unavailable');

      const breakdown = res.data.breakdown || {};
      const rawFare = Number(res.data.fare);
      if (!Number.isFinite(rawFare)) throw new Error('Invalid fare');

      const finalTotal = discount === 'free'
        ? 0
        : Math.max(rawFare - Number(discount || 0), 0);

      setFare({
        distance: Number(actualRouteDist.toFixed(2)),
        duration: Math.round(actualRouteDur),
        baseFare: Number(breakdown.base) || 0,
        distanceFare: Number(breakdown.distance) || 0,
        timeFare: Number(breakdown.time) || 0,
        deliveryFee: Number(breakdown.deliveryFee) || 0,
        totalFare: finalTotal,
        formattedTotal: 'UGX ' + Math.round(finalTotal).toLocaleString('en-UG'),
        offerMin: Number(res.data.offerBounds?.min) || undefined,
        offerMax: Number(res.data.offerBounds?.max) || undefined,
      });
    } catch {
      setFare(null);
    }
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
      setToastMsg(`${promo.label} — free ride applied`);
    } else {
      setDiscount(promo.discount);
      setToastMsg(`${promo.label} — UGX ${promo.discount.toLocaleString()} off`);
    }
    setShowToast(true);
  };

  const handleMapClick = async (latlng: [number, number]) => {
    const [lat, lng] = latlng;
    if (lat < -5 || lat > 5 || lng < 29 || lng > 36) {
      setToastMsg('Please select a location within Uganda.');
      setShowToast(true);
      return;
    }

    const fallback: Location = { lat, lng, address: 'Selected Point', name: 'Selected Point' };
    try {
      const res = await api.get('/poi/reverse', { params: { lat, lng } });
      const place = res.data?.place;
      const loc: Location = place
        ? {
            lat,
            lng,
            address: place.address || fallback.address,
            name: place.name || fallback.name,
          }
        : fallback;

      if (searchingPickup) {
        setPickup(loc);
        setPickupSearch(loc.name || loc.address.split(',')[0]);
      } else {
        setDestination(loc);
        setDestSearch(loc.name || loc.address.split(',')[0]);
      }
    } catch {
      if (searchingPickup) {
        setPickup(fallback);
        setPickupSearch('Selected Point');
      } else {
        setDestination(fallback);
        setDestSearch('Selected Point');
      }
    }
    setSearchResults([]);
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
    if (routeStatus !== 'ready' || actualRouteDist <= 0 || actualRouteDur <= 0 || !fare) {
      setToastMsg('Please wait for a valid road route and fare before booking.');
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
        distanceKm: actualRouteDist,
        durationMin: actualRouteDur,
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
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--nav-bg)', color: 'var(--nav-text)', gap: 16 }}>
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
                <h1 className="welcome-title">Hello, {user?.fullName?.split(' ')[0] || 'Guest'}</h1>
                <p className="welcome-sub">Where would you like to go today?</p>
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
                    <div className="empty-note">No recent trips yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === BookingStep.LOCATION && (
            <div className="space-y-6">
              <h1 className="card-title">Where to?</h1>
              <div className="seg-control" role="tablist" aria-label="Service type">
                <button role="tab" aria-selected={serviceType === 'ride'} className={`seg-btn ${serviceType === 'ride' ? 'active' : ''}`} onClick={() => setServiceType('ride')}>
                  <IonIcon icon={carOutline} /> Ride
                </button>
                <button role="tab" aria-selected={serviceType === 'delivery'} className={`seg-btn ${serviceType === 'delivery' ? 'active' : ''}`} onClick={() => setServiceType('delivery')}>
                  <IonIcon icon={cubeOutline} /> Delivery
                </button>
              </div>

              <div className="location-input-group">
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
                      <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--nav-text-secondary)' }}>Searching Uganda...</span>
                    </div>
                  )}
                  {!isSearching && searchResults.length > 0 && (
                    <div className="search-results-list">
                      {searchResults.map((r, i) => (
                        <div key={i} className="search-result-item" onClick={() => selectLocation(r)}>
                          <IonIcon icon={locationOutline} style={{ color: 'var(--navigo-orange)' }} />
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
                  const quote = vehicleQuotes[opt.dbVehicleType];
                  const est = Number.isFinite(Number(quote?.fare)) ? Number(quote.fare) : null;
                  return (
                    <div key={opt.id} className={`vehicle-option-card ${selectedRide.id === opt.id ? 'selected' : ''}`} onClick={() => { setSelectedRide(opt); setUserOffer(null); }}>
                      <div className="vehicle-main-info">
                        <span className="vehicle-emoji">
                          <img src={opt.image} alt={opt.name} className="vehicle-thumb" />
                        </span>
                        <div className="vehicle-details">
                          <span className="vehicle-type-name">{opt.name}</span>
                          <span className="vehicle-type-desc">{opt.description}</span>
                        </div>
                      </div>
                      <div className="vehicle-price-badge">{est !== null ? `UGX ${est.toLocaleString()}` : '—'}</div>
                    </div>
                  );
                })}
              </div>

              <button className="btn-continue" disabled={!pickup || !destination} onClick={() => setStep(BookingStep.PAYMENT)}>Continue</button>
            </div>
          )}

          {step === BookingStep.PAYMENT && (
            <div className="space-y-6">
              <h2 className="card-title">{serviceType === 'ride' ? 'Confirm your ride' : 'Delivery details'}</h2>

              {serviceType === 'delivery' && (
                <div className="space-y-3">
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

              {/* Fare: total is the headline, route meta is supporting */}
              <div className="fare-summary-box">
                <div className="fare-detail">
                  <span className="fare-label">{selectedRide.name}</span>
                  <span className="fare-value">{fare?.distance ?? 0} km · {fare?.duration ?? 0} min</span>
                   {fare && (
                     <span className="promo-note">
                       Base UGX {fare.baseFare.toLocaleString('en-UG')} · Distance UGX {fare.distanceFare.toLocaleString('en-UG')} · Time UGX {fare.timeFare.toLocaleString('en-UG')}{serviceType === 'delivery' && fare.deliveryFee > 0 ? ' · Delivery UGX ' + fare.deliveryFee.toLocaleString('en-UG') : ''}
                     </span>
                   )}
                  {discount === 'free' ? (
                    <span className="promo-note"><IonIcon icon={checkmarkCircleOutline} /> Free ride applied</span>
                  ) : discount > 0 ? (
                    <span className="promo-note"><IonIcon icon={checkmarkCircleOutline} /> −UGX {discount.toLocaleString()} promo</span>
                  ) : null}
                </div>
                <div className="fare-total">{fare?.formattedTotal || '—'}</div>
              </div>

              {fare && (
                <div>
                  <span className="section-label">Your offer</span>
                  <div className="bid-stepper">
                    <button className="bid-step-btn" aria-label="Decrease offer by 500 shillings" onClick={() => setUserOffer(Math.max(fare.offerMin ?? selectedRide.basePrice, (userOffer ?? fare.totalFare) - 500))}>−</button>
                    <span className="bid-amount">UGX {(userOffer ?? fare.totalFare).toLocaleString()}</span>
                    <button className="bid-step-btn" aria-label="Increase offer by 500 shillings" onClick={() => setUserOffer(Math.min(fare.offerMax ?? Number.MAX_SAFE_INTEGER, (userOffer ?? fare.totalFare) + 500))}>+</button>
                  </div>
                  <p className="bid-hint">Higher offers get picked up faster</p>
                </div>
              )}

              <div>
                <span className="section-label">Payment</span>
                <div className="seg-control" role="tablist" aria-label="Payment method">
                  <button role="tab" aria-selected={paymentMethod === 'cash'} className={`seg-btn ${paymentMethod === 'cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('cash')}>
                    <IonIcon icon={cashOutline} /> Cash
                  </button>
                  <button role="tab" aria-selected={paymentMethod === 'wallet'} className={`seg-btn ${paymentMethod === 'wallet' ? 'active' : ''}`} onClick={() => setPaymentMethod('wallet')}>
                    <IonIcon icon={walletOutline} /> Wallet · UGX {walletBalance.toLocaleString()}
                  </button>
                </div>
              </div>

              <div className="location-input-wrapper">
                <div className="input-icon"><IonIcon icon={pricetagOutline} /></div>
                <input className="location-input" placeholder="Promo code" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} />
                <button className="promo-apply-btn" onClick={applyPromo}>Apply</button>
              </div>

              <button className="btn-continue" data-loading={isLoading || undefined} disabled={isLoading || routeStatus !== 'ready' || !fare || (serviceType === 'delivery' && (!packageDetails || !receiverName || !receiverPhone))} onClick={handleBookRide}>
                {isLoading ? <IonSpinner name="crescent" /> : serviceType === 'ride' ? 'Confirm booking' : 'Confirm delivery'}
              </button>
              <button className="btn-secondary-outline" onClick={() => setStep(BookingStep.LOCATION)}>Change details</button>
            </div>
          )}

          {step === BookingStep.MATCHING && (
            <div className="matching-state" role="status" aria-live="polite">
              <div className="matching-spinner-ring" aria-hidden="true" />
              <div>
                <h2 className="matching-title">Finding your driver</h2>
                <p className="matching-sub">
                  Drivers near {pickup?.name || 'you'} have been alerted.
                  Auto-cancels in <span className="matching-countdown">{Math.max(0, 120 - matchingSeconds)}s</span> if nobody accepts.
                </p>
              </div>
              <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ width: `${(matchingSeconds / 120) * 100}%`, height: '100%', background: 'var(--navigo-orange)', transition: 'width 1s linear' }} />
              </div>
              <button className="btn-cancel-request" onClick={handleCancelRequest} disabled={cancellingRequest}>
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
        <div className="login-modal-card">
          <h2 className="login-modal-title">Ready to ride?</h2>
          <p className="login-modal-sub">Sign in to book rides and earn rewards.</p>
          <button className="btn-continue" onClick={() => { setShowLoginPrompt(false); ionRouter.push('/login'); }}>Sign in</button>
          <button className="btn-secondary-outline" onClick={() => { setShowLoginPrompt(false); ionRouter.push('/register'); }}>Create account</button>
        </div>
      </IonModal>
    </div>
      </IonContent>
    </IonPage>
  );
};

export default RideRequest;
