import React, { useState, useEffect, useRef } from 'react';
import { useIonRouter } from '@ionic/react';
import {
  IonIcon, IonSpinner, IonToast, IonModal, IonAvatar, IonPage, IonContent
} from '@ionic/react';
import {
  locationOutline, carOutline, arrowBackOutline,
  globeOutline, checkmarkCircleOutline, searchOutline,
  timeOutline, chevronForwardOutline
} from 'ionicons/icons';
import axios from 'axios';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import NavigoMap from '../../components/NavigoMap';
import socketService from '../../services/socketService';
import bodaImg from '../../assets/vehicles/boda.png';
import goImg from '../../assets/vehicles/go.png';
import comfortImg from '../../assets/vehicles/comfort.png';
import xlImg from '../../assets/vehicles/xl.png';
import './RideRequest.css';

interface Location { lat: number; lng: number; address: string; name?: string; }
interface RideOption { id: string; name: string; description: string; basePrice: number; pricePerKm: number; pricePerMinute: number; capacity: number; vehicleType: string; surgeMultiplier: number; color: string; image: string; }
interface FareEstimate { distance: number; duration: number; baseFare: number; distanceFare: number; timeFare: number; surgeFare: number; totalFare: number; formattedTotal: string; }
enum BookingStep { HOME = 0, LOCATION = 1, RIDE_TYPE = 2, PAYMENT = 3, MATCHING = 4 }

const POPULAR_PLACES: Location[] = [
  { name: 'Uganda Central Square', lat: 0.3136, lng: 32.5811, address: 'Uganda Central' },
  { name: 'Entebbe Airport', lat: 0.0437, lng: 32.4369, address: 'Entebbe' },
  { name: ' Acacia Mall', lat: 0.3348, lng: 32.5873, address: 'Kololo, Kampala' },
  { name: 'Uganda University', lat: 0.3361, lng: 32.5711, address: 'Kampala' },
];

const RIDE_OPTIONS: RideOption[] = [
  { id: 'boda', name: 'Boda Boda', description: 'Fastest through traffic', basePrice: 1500, pricePerKm: 600, pricePerMinute: 80, capacity: 1, vehicleType: 'boda', surgeMultiplier: 1.0, color: '#FF6B35', image: bodaImg },
  { id: 'economy', name: 'NAVIGO Go', description: 'Affordable everyday rides', basePrice: 2000, pricePerKm: 900, pricePerMinute: 100, capacity: 4, vehicleType: 'go', surgeMultiplier: 1.0, color: '#2D6A4F', image: goImg },
  { id: 'comfort', name: 'NAVIGO Comfort', description: 'Newer cars, top drivers', basePrice: 4000, pricePerKm: 1200, pricePerMinute: 150, capacity: 4, vehicleType: 'comfort', surgeMultiplier: 1.2, color: '#1B4965', image: comfortImg },
  { id: 'xl', name: 'NAVIGO XL', description: 'Extra space for groups', basePrice: 6000, pricePerKm: 1800, pricePerMinute: 200, capacity: 6, vehicleType: 'xl', surgeMultiplier: 1.1, color: '#E8B86D', image: xlImg }
];


function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  const [driverFound, setDriverFound] = useState(false);
  const [matchedDriver, setMatchedDriver] = useState<any>(null);
  const [pendingRideId, setPendingRideId] = useState<string | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [recentRides, setRecentRides] = useState<any[]>([]);

  // Delivery specific state
  const [packageDetails, setPackageDetails] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  useEffect(() => {
    // Never block the booking UI on slow geolocation or API calls:
    // render immediately and let the data fill in as it arrives.
    // (Previously this awaited all three sequentially, so a dead or slow
    // backend URL left users stuck on "Initializing Experience…" forever.)
    setIsInitializing(false);
    getCurrentLocation();
    fetchWalletBalance();
    fetchRecentRides();

    if (isAuthenticated && user) {
      const socket = socketService.connect(user.id);
      socket.on('ride-accepted', (data: any) => {
        setDriverFound(true);
        setIsMatching(false);
        setPendingRideId(null);
        setMatchedDriver(data);
        socket.emit('join-ride-room', { rideId: data.rideId });
        // Redirect to active ride page
        setTimeout(() => {
          ionRouter.push('/customer/active-ride');
        }, 1500);
      });
      socket.on('no-drivers-found', (data: any) => {
        setIsMatching(false);
        setToastMsg(data.message);
        setShowToast(true);
        setStep(BookingStep.LOCATION);
      });
      return () => {
        socket.off('ride-accepted');
        socket.off('no-drivers-found');
      };
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (pickup && destination) calculateFare();
  }, [pickup, destination, selectedRide, discount, actualRouteDist, actualRouteDur]);

  const fetchWalletBalance = async () => {
    try {
      const res = await api.get(`/wallet/balance`);
      if (res.data.ok) setWalletBalance(res.data.balance);
    } catch (e) {
      console.error('Wallet fetch error:', e);
    }
  };

  const fetchRecentRides = async () => {
    try {
      const res = await api.get(`/rides/recent`);
      if (res.data) setRecentRides(res.data);
    } catch (e) {
      console.error('Recent rides fetch error:', e);
    }
  };

  const getCurrentLocation = () => {
    return new Promise<void>((resolve) => {
      if ('geolocation' in navigator) {
        // CONTINUOUS HIGH-ACCURACY TRACKING — very very accurate
        navigator.geolocation.watchPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = pos.coords.accuracy;
            console.log(`📍 Very accurate GPS: lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}, accuracy=${accuracy}m`);
            setPickup({ lat, lng, address: `High-precision location (±${Math.round(accuracy)}m)`, name: '📍 Your Precise Location' });
            setPickupSearch('Your Precise Location');

            // Reverse geocode at zoom 18 for maximum detail
            try {
              const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&zoom=18&addressdetails=1`, { timeout: 8000 });
              const data = res.data;
              const addr = data.display_name || '';
              const address = data.address || {};
              const houseNumber = address.house_number || '';
              const road = address.road || address.pedestrian || address.footway || address.path || '';
              const suburb = address.suburb || address.neighbourhood || address.village || address.hamlet || '';
              const city = address.city || address.town || address.municipality || address.county || '';
              let preciseName = '';
              if (houseNumber && road) preciseName = `${houseNumber} ${road}`;
              else if (road) preciseName = road;
              else if (suburb) preciseName = suburb;
              else if (city) preciseName = city;
              else preciseName = addr.split(',')[0] || addr;
              setPickup({ lat, lng, address: addr, name: '📍 ' + preciseName });
              setPickupSearch(preciseName || 'Your Precise Location');
            } catch {
              // Already set high-precision above
            }
          },
          (err) => {
            console.error('GPS Watch Error:', err.message);
            setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala', name: '📍 Kampala' });
            resolve();
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
        setTimeout(() => resolve(), 3000);
      } else {
        setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala', name: '📍 Kampala' });
        resolve();
      }
    });
  };

  const searchLocation = async (query: string) => {
    if (query.length < 2) return [];
    const UGANDA_BBOX = { minLat: -1.5, maxLat: 4.2, minLon: 29.5, maxLon: 35.0 };
    try {
      // BROAD NOMINATIM: include everything — shops, businesses, buildings, landmarks
      const nomRes = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: `${query}, Uganda`,
          format: 'json',
          addressdetails: 1,
          limit: 20,
          viewbox: `${UGANDA_BBOX.minLon},${UGANDA_BBOX.minLat},${UGANDA_BBOX.maxLon},${UGANDA_BBOX.maxLat}`,
          bounded: 1
        },
        timeout: 8000
      });
      let results = nomRes.data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
        name: item.display_name.split(',')[0]
      }));

      // BROAD OVERPASS SEARCH — everything shown on the map should appear here
      if (results.length < 15) {
        const overpassQuery = `
          [out:json][timeout:25];
          (
            node["name"~"${query}",i](around:30000,0.3476,32.5825);
            way["name"~"${query}",i](around:30000,0.3476,32.5825);
            relation["name"~"${query}",i](around:30000,0.3476,32.5825);
            node["amenity"~"${query}",i](around:30000,0.3476,32.5825);
          );
          out center;
        `;
        try {
          const overpassRes = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`, { headers: { 'Accept': 'application/json' } });
          const overpassData = await overpassRes.json();
          if (overpassData.elements && overpassData.elements.length > 0) {
            const overpassResults = overpassData.elements.map((el: any) => {
              const lat = el.lat || el.center?.lat;
              const lng = el.lon || el.center?.lon;
              const tags = el.tags || {};
              const name = tags.name || tags.amenity || tags.shop || tags.office || 'Unknown Place';
              return { lat, lng, address: name, name: '📍 ' + name };
            }).filter((r: any) => r.lat && r.lng);
            results = results.concat(overpassResults);
          }
        } catch (e) {
          console.log('Overpass search fallback failed:', e);
        }
      }

      // PHOTON BROADER FALLBACK
      if (results.length === 0) {
        const photonRes = await axios.get('https://photon.komoot.io/api/', {
          params: { q: query, limit: 15, lat: pickup?.lat || 0.3476, lon: pickup?.lng || 32.5825, reprioritize: 1 },
          timeout: 8000
        });
        let photonResults = photonRes.data?.features?.map((item: any) => {
          const props = item.properties;
          const geom = item.geometry.coordinates;
          return { lat: geom[1], lng: geom[0], address: props.name || props.city || props.street || props.state || props.osm_value || 'Unknown Location', name: props.name || props.city || props.street || props.osm_value || 'Unknown Location' };
        }) || [];
        results = photonResults.filter((r: any) => r.lat >= UGANDA_BBOX.minLat && r.lat <= UGANDA_BBOX.maxLat && r.lng >= UGANDA_BBOX.minLon && r.lng <= UGANDA_BBOX.maxLon);
      }

      // Deduplicate by lat/lng (rounded to 4 decimals)
      const unique = new Map();
      results.forEach((r: any) => {
        const key = `${Math.round(r.lat * 10000)}-${Math.round(r.lng * 10000)}`;
        if (!unique.has(key)) unique.set(key, r);
      });
      return Array.from(unique.values());
    } catch (e: any) {
      console.error('❌ Search Error:', e.response?.data || e.message);
      return [];
    }
  };

  const searchTimeoutRef = useRef<any>(null);
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
      }, 150);
    } else {
      setSearchResults([]);
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

  const calculateFare = async () => {
    if (!pickup || !destination) return;
    const dist = actualRouteDist > 0 ? actualRouteDist : calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const speed = selectedRide.vehicleType === 'boda' ? 28 : 22;
    const dur = actualRouteDur > 0 ? actualRouteDur : (dist / speed) * 60;

    try {
      const res = await api.get(`/rides/quote`, {
        params: { type: selectedRide.vehicleType, km: dist, min: dur }
      });
      if (res.data.ok) {
        const total = Math.max(res.data.fare - discount, selectedRide.basePrice);
        setFare({
          distance: Math.round(dist * 10) / 10,
          duration: Math.round(dur),
          baseFare: selectedRide.basePrice,
          distanceFare: 0, // Backend quote is total, we don't break it down here
          timeFare: 0,
          surgeFare: 0,
          totalFare: total,
          formattedTotal: 'UGX ' + total.toLocaleString()
        });
      }
    } catch (e) {
      console.error('Quote error:', e);
    }
  };

  const applyPromo = () => {
    if (promoCode.toUpperCase() === 'NAVIGO50') {
      setDiscount(2000);
      setToastMsg('🎉 UGX 2,000 off!');
    } else if (promoCode.toUpperCase() === 'FIRSTRIDE') {
      setDiscount(selectedRide.basePrice);
      setToastMsg('🎉 First ride free!');
    } else {
      setToastMsg('Invalid code. Try NAVIGO50');
    }
    setShowToast(true);
  };

  const handleMapClick = async (latlng: [number, number]) => {
    const [lat, lng] = latlng;
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { timeout: 8000 });
      const addr = res.data.display_name || '';
      const address = res.data.address || {};
      const road = address.road || address.pedestrian || address.footway || '';
      const suburb = address.suburb || address.neighbourhood || address.village || '';
      const city = address.city || address.town || address.municipality || '';
      const shortName = road || suburb || city || addr.split(',')[0];
      const loc: Location = { lat, lng, address: addr, name: '📍 ' + shortName };
      if (searchingPickup) {
        setPickup(loc);
        setPickupSearch(shortName || '');
      } else {
        setDestination(loc);
        setDestSearch(shortName || '');
      }
    } catch {
      const loc: Location = { lat, lng, address: 'Unknown Location', name: '📍 Selected Point' };
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
    setIsLoading(true);
    try {
      const finalFare = userOffer ?? fare?.totalFare;
      const res = await api.post(`/rides/request`, {
        serviceType,
        pickup,
        destination,
        rideType: selectedRide.vehicleType,
        paymentMethod: 'cash',
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
    } catch (e) {
      setToastMsg('Failed to request booking. Please try again.');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRideId || cancellingRequest) return;
    setCancellingRequest(true);
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

  if (isInitializing) {
    return (
      <div className="loading-screen">
        <IonSpinner name="crescent" color="warning" />
        <p>Initializing Experience...</p>
      </div>
    );
  }

  return (
    <IonPage>
      <IonContent>
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
                <h1 className="welcome-title">Hello, {user?.fullName || 'Guest'}!</h1>
                <p style={{ color: '#94A3B8', fontSize: '14px', marginTop: '4px' }}>Where would you like to go today?</p>
              </div>

              <button className="quick-action-btn" onClick={() => { setStep(BookingStep.LOCATION); setSearchingPickup(false); }}>
                <div className="quick-action-icon"><IonIcon icon={searchOutline} /></div>
                <span>Enter destination...</span>
              </button>

              <div className="space-y-3">
                <p className="section-label">Popular Destinations</p>
                <div className="popular-places-grid">
                  {POPULAR_PLACES.map(p => (
                    <div key={p.name} className="place-chip" onClick={() => { setDestination(p); setDestSearch(p.name); setStep(BookingStep.LOCATION); }}>
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>

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
                    <input className="location-input" placeholder="Receiver's Phone" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="fare-summary-box">
                <div className="fare-detail">
                  <span className="fare-label">Distance</span>
                  <span className="fare-value">{fare?.distance} km</span>
                </div>
                <div className="fare-total">{fare?.formattedTotal}</div>
              </div>

              {fare && (
                <div className="fare-bid-container" style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="section-label" style={{ marginBottom: '8px' }}>Adjust Your Offer</p>
                  <div className="fare-bid-controls">
                    <button className="bid-btn" onClick={() => setUserOffer((userOffer ?? fare.totalFare) - 500)}>−</button>
                    <span className="bid-amount">UGX {(userOffer ?? fare.totalFare).toLocaleString()}</span>
                    <button className="bid-btn" onClick={() => setUserOffer((userOffer ?? fare.totalFare) + 500)}>+</button>
                  </div>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>Higher offers get picked up faster</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94A3B8', padding: '0 4px' }}>
                <span style={{ textTransform: 'capitalize' }}>{serviceType} Type: {selectedRide.name}</span>
                <span style={{ color: 'white', fontWeight: 600 }}>Balance: UGX {walletBalance.toLocaleString()}</span>
              </div>

              <div className="location-input-wrapper">
                <div className="input-icon"><IonIcon icon={checkmarkCircleOutline} /></div>
                <input className="location-input" placeholder="Promo Code" value={promoCode} onChange={e => setPromoCode(e.target.value)} />
                <button className="back-nav-btn" style={{ fontWeight: 'bold', color: '#FF6B35', marginBottom: 0, position: 'static', background: 'none', border: 'none', padding: '0 10px' }} onClick={applyPromo}>Apply</button>
              </div>

              <button className="btn-continue" disabled={isLoading || (serviceType === 'delivery' && (!packageDetails || !receiverName || !receiverPhone))} onClick={handleBookRide}>
                {isLoading ? <IonSpinner name="crescent" /> : serviceType === 'ride' ? 'CONFIRM BOOKING' : 'CONFIRM DELIVERY'}
              </button>
              <button className="back-nav-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} onClick={() => setStep(BookingStep.LOCATION)}>Change Details</button>
            </div>
          )}

          {step === BookingStep.MATCHING && (
            <div className="matching-state">
              <div className="matching-emoji pulse-soft">🚕</div>
              <div className="space-y-2">
                <h2 className="card-title" style={{ textAlign: 'center' }}>Finding your driver…</h2>
                <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>
                  We've alerted drivers near {pickup?.name || 'you'}. You'll be connected the moment one accepts.
                </p>
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
          onMapClick={handleMapClick}
          onDistanceChange={(d, t) => { setActualRouteDist(d); setActualRouteDur(t); }}
        />
      </div>

      <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} color="dark" position="top" />
      <IonModal isOpen={showLoginPrompt} onDidDismiss={() => setShowLoginPrompt(false)}>
        <div className="glass-booking-card" style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
          <h2 className="card-title">Ready to Ride?</h2>
          <p style={{ color: '#94A3B8', marginBottom: '24px' }}>Sign in to book rides and earn rewards.</p>
          <button className="btn-continue" onClick={() => { setShowLoginPrompt(false); ionRouter.push('/login'); }}>Sign In</button>
          <button className="back-nav-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }} onClick={() => { setShowLoginPrompt(false); ionRouter.push('/register'); }}>Create Account</button>
        </div>
      </IonModal>
    </div>
      </IonContent>
    </IonPage>
  );
};

export default RideRequest;
