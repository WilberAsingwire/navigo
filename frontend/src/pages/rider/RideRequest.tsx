import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonIcon, IonSpinner, IonToast, IonModal, IonAvatar
} from '@ionic/react';
import {
  locationOutline, carOutline, arrowBackOutline,
  globeOutline, checkmarkCircleOutline
} from 'ionicons/icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import NavigoMap from '../../components/NavigoMap';
import socketService from '../../services/socketService';
import './RideRequest.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BASE_URL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;

interface Location { lat: number; lng: number; address: string; name?: string; }
interface RideOption { id: string; name: string; description: string; basePrice: number; pricePerKm: number; pricePerMinute: number; capacity: number; vehicleType: string; surgeMultiplier: number; color: string; emoji: string; }
interface FareEstimate { distance: number; duration: number; baseFare: number; distanceFare: number; timeFare: number; surgeFare: number; totalFare: number; formattedTotal: string; }
enum BookingStep { LOCATION = 0, RIDE_TYPE = 1, PAYMENT = 2, MATCHING = 3 }

const RIDE_OPTIONS: RideOption[] = [
  { id: 'boda', name: 'Boda Boda', description: 'Fastest through traffic', basePrice: 1500, pricePerKm: 600, pricePerMinute: 80, capacity: 1, vehicleType: 'boda', surgeMultiplier: 1.0, color: '#FF6B35', emoji: '🏍️' },
  { id: 'economy', name: 'NAVIGO Go', description: 'Affordable everyday rides', basePrice: 2000, pricePerKm: 900, pricePerMinute: 100, capacity: 4, vehicleType: 'economy', surgeMultiplier: 1.0, color: '#2D6A4F', emoji: '🚗' },
  { id: 'comfort', name: 'NAVIGO Comfort', description: 'Newer cars, top drivers', basePrice: 4000, pricePerKm: 1200, pricePerMinute: 150, capacity: 4, vehicleType: 'comfort', surgeMultiplier: 1.2, color: '#1B4965', emoji: '🚙' },
  { id: 'xl', name: 'NAVIGO XL', description: 'Extra space for groups', basePrice: 6000, pricePerKm: 1800, pricePerMinute: 200, capacity: 6, vehicleType: 'xl', surgeMultiplier: 1.1, color: '#E8B86D', emoji: '🚐' }
];

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const RideRequest: React.FC = () => {
  const history = useHistory();
  const { isAuthenticated, isGuest, user } = useAuth();
  const [step, setStep] = useState<BookingStep>(BookingStep.LOCATION);
  const [pickup, setPickup] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [pickupSearch, setPickupSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchingPickup, setSearchingPickup] = useState(true);
  const [selectedRide, setSelectedRide] = useState(RIDE_OPTIONS[1]);
  const [fare, setFare] = useState<FareEstimate | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [driverFound, setDriverFound] = useState(false);
  const [matchedDriver, setMatchedDriver] = useState<any>(null);
  const [matchingProgress, setMatchingProgress] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await getCurrentLocation();
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setIsInitializing(false);
      }
    };
    init();

    if (isAuthenticated && user) {
      const socket = socketService.connect(user.id);
      socket.on('ride-accepted', (data: any) => {
        setDriverFound(true);
        setIsMatching(false);
        setMatchingProgress(100);
        setMatchedDriver(data);

        // SECURE ROOM JOIN: Join the ride room to receive live location updates
        socket.emit('join-ride-room', { rideId: data.rideId });
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
  }, [pickup, destination, selectedRide, discount]);

  const getCurrentLocation = () => {
    return new Promise<void>((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setPickup({ lat, lng, address: 'Fetching precise location...', name: '📍 Your Location' });
            try {
              const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
              const data = res.data;
              const addr = data.display_name || '';
              const address = data.address || {};

              // More robust address parsing for the "Short Name"
              const houseNumber = address.house_number || '';
              const road = address.road || address.pedestrian || address.footway || '';
              const suburb = address.suburb || address.neighbourhood || address.village || '';
              const city = address.city || address.town || address.municipality || '';

              let preciseName = '';
              if (houseNumber && road) preciseName = `${houseNumber} ${road}`;
              else if (road) preciseName = road;
              else if (suburb) preciseName = suburb;
              else preciseName = city || addr.split(',')[0];

              setPickup({ lat, lng, address: addr, name: '📍 ' + preciseName });
              setPickupSearch(preciseName);
            } catch {
              setPickup({ lat, lng, address: 'Your Location', name: '📍 Current Location' });
            }
            resolve();
          },
          (err) => {
            console.error('GPS Error:', err.message);
            setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala', name: '📍 Kampala' });
            resolve();
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala', name: '📍 Kampala' });
        resolve();
      }
    });
  };


  const searchLocation = async (query: string) => {
    if (query.length < 2) return [];
    console.log(`🔍 Searching for: "${query}"`);

    const UGANDA_BBOX = {
      minLat: -1.5,
      maxLat: 4.2,
      minLon: 29.5,
      maxLon: 35.0
    };

    try {
      // TRY NOMINATIM FIRST - It's generally more reliable for Ugandan regional searches
      console.log('📡 Attempting Nominatim Search (Primary)...');
      const nomRes = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 10,
          viewbox: `${UGANDA_BBOX.minLon},${UGANDA_BBOX.minLat},${UGANDA_BBOX.maxLon},${UGANDA_BBOX.maxLat}`,
          bounded: 1
        }
      });

      let results = nomRes.data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
        name: item.display_name.split(',')[0]
      }));

      console.log(`✅ Nominatim found ${results.length} matches`);

      // FALLBACK TO PHOTON
      if (results.length === 0) {
        console.log('⚠️ Nominatim found nothing. Attempting Photon Fallback...');
        const photonRes = await axios.get('https://photon.komoot.io/api/', {
          params: {
            q: query,
            limit: 10,
            lat: pickup?.lat || 0.3476,
            lon: pickup?.lng || 32.5825,
            reprioritize: 1
          }
        });

        let photonResults = photonRes.data?.features?.map((item: any) => {
          const props = item.properties;
          const geom = item.geometry.coordinates;
          return {
            lat: geom[1],
            lng: geom[0],
            address: props.name || props.city || props.street || props.state || 'Unknown Location',
            name: props.name || props.city || props.street || 'Unknown Location'
          };
        }) || [];

        results = photonResults.filter((r: any) =>
          r.lat >= UGANDA_BBOX.minLat && r.lat <= UGANDA_BBOX.maxLat &&
          r.lng >= UGANDA_BBOX.minLon && r.lng <= UGANDA_BBOX.maxLon
        );
        console.log(`✅ Photon found ${results.length} matches`);
      }

      return results;
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
      }, 300);
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

  const calculateFare = () => {
    if (!pickup || !destination) return;
    const dist = calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const speed = selectedRide.vehicleType === 'boda' ? 28 : 22;
    const dur = (dist / speed) * 60;
    const base = selectedRide.basePrice;
    const distFare = Math.round(dist * selectedRide.pricePerKm);
    const timeFare = Math.round(dur * selectedRide.pricePerMinute);
    const surge = Math.round((base + distFare + timeFare) * (selectedRide.surgeMultiplier - 1));
    const total = Math.max(base + distFare + timeFare + surge - discount, base);
    setFare({
      distance: Math.round(dist * 10) / 10,
      duration: Math.round(dur),
      baseFare: base,
      distanceFare: distFare,
      timeFare,
      surgeFare: surge,
      totalFare: total,
      formattedTotal: 'UGX ' + total.toLocaleString()
    });
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
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
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
        setDestSearch(shortName || '');
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
      const res = await axios.post(`${BASE_URL}/api/rides/request`, {
        pickup, destination, rideType: selectedRide.vehicleType, paymentMethod: 'cash', fare: fare?.totalFare
      });
      const ride = res.data.ride;
      setStep(BookingStep.MATCHING);
      setIsMatching(true);
      setMatchingProgress(0);
      const socket = socketService.getSocket();
      if (socket) socket.emit('request-ride', { userId: user?.id, rideId: ride.id });
      const interval = setInterval(() => {
        setMatchingProgress(p => {
          if (p >= 100) { clearInterval(interval); return 100; }
          return p + Math.random() * 15;
        });
      }, 500);
      setTimeout(() => { clearInterval(interval); }, 15000);
    } catch (e) {
      setToastMsg('Failed to request ride. Please try again.');
      setShowToast(true);
    } finally {
      setIsLoading(false);
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
    <div className="booking-page-container">
      <div className="booking-form-panel">
        <button
          className="back-nav-btn"
          onClick={() => history.push('/rider/home')}
        >
          <IonIcon icon={arrowBackOutline} /> Back
        </button>

        <div className="glass-booking-card">
          <h1 className="card-title">Book Your Ride</h1>

          {step === BookingStep.LOCATION && (
            <div className="space-y-6">
              <div className="location-input-group">
                <h2 className="section-label" style={{ textAlign: 'center', fontSize: '18px', color: '#fff', textTransform: 'none', marginBottom: '15px' }}>Where to?</h2>
                <div className="location-search-container">
                  <div className="location-input-group-relative" style={{ position: 'relative' }}>
                    <div className="location-input-wrapper">
                      <div className="input-icon"><IonIcon icon={globeOutline} /></div>
                      <input
                        className="location-input"
                        placeholder="Pickup Location"
                        value={pickupSearch}
                        onChange={e => handleSearch(e.target.value, true)}
                        onFocus={() => setSearchingPickup(true)}
                      />
                    </div>
                    {searchingPickup && isSearching && (
                      <div className="search-results-list" style={{ justifyContent: 'center', alignItems: 'center', padding: '20px', textAlign: 'center', display: 'flex' }}>
                        <IonSpinner name="crescent" color="warning" />
                        <span style={{ marginLeft: '10px', fontSize: '12px', color: '#94A3B8' }}>Searching Uganda...</span>
                      </div>
                    )}
                    {!searchingPickup || (!isSearching && searchingPickup && searchResults.length > 0) ? null : null}
                    {/* This logic is getting complex, let's just handle the rendering below */}
                  </div>

                  <div className="location-input-group-relative" style={{ position: 'relative' }}>
                    <div className="location-input-wrapper">
                      <div className="input-icon"><IonIcon icon={locationOutline} /></div>
                      <input
                        className="location-input"
                        placeholder="Destination"
                        value={destSearch}
                        onChange={e => handleSearch(e.target.value, false)}
                        onFocus={() => setSearchingPickup(false)}
                      />
                    </div>
                  </div>

                  {/* Shared results list - positioned at bottom of container */}
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
                          <IonIcon icon={locationOutline} style={{ color: '#FF5A1F' }} />
                          <div className="result-info">
                            <span className="result-name">{r.name || r.address.split(',')[0]}</span>
                            <span className="result-addr">{r.address}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!isSearching && searchResults.length === 0 && (pickupSearch.length >= 2 || destSearch.length >= 2) && (
                    <div className="search-results-list" style={{ padding: '15px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                      No locations found in Uganda. Try a different keyword.
                    </div>
                  )}
                </div>
              </div>

              <div className="vehicle-options-grid">
                <h3 className="section-label">Select Vehicle</h3>
                {RIDE_OPTIONS.map(opt => {
                  const est = fare ? Math.round((opt.basePrice + fare.distance * opt.pricePerKm + fare.duration * opt.pricePerMinute) * opt.surgeMultiplier) : opt.basePrice;
                  return (
                    <div
                      key={opt.id}
                      className={`vehicle-option-card ${selectedRide.id === opt.id ? 'selected' : ''}`}
                      onClick={() => setSelectedRide(opt)}
                    >
                      <div className="vehicle-main-info">
                        <span className="vehicle-emoji">{opt.emoji}</span>
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

              <button
                className="btn-continue"
                disabled={!pickup || !destination}
                onClick={() => setStep(BookingStep.PAYMENT)}
              >
                CONTINUE
              </button>
            </div>
          )}

          {step === BookingStep.PAYMENT && (
            <div className="space-y-6">
              <h2 className="card-title" style={{ textAlign: 'center', fontSize: '20px' }}>Fare Summary</h2>
              <div className="fare-summary-box">
                <div className="fare-detail">
                  <span className="fare-label">Distance</span>
                  <span className="fare-value">{fare?.distance} km</span>
                </div>
                <div className="fare-total">{fare?.formattedTotal}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#94A3B8', padding: '0 4px' }}>
                <span>Ride Type: {selectedRide.name}</span>
                <span>Cash Payment</span>
              </div>
              <div className="location-input-wrapper">
                <div className="input-icon"><IonIcon icon={checkmarkCircleOutline} /></div>
                <input
                  className="location-input"
                  placeholder="Promo Code"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value)}
                />
                <button className="back-nav-btn" style={{ fontWeight: 'bold', color: '#FF5A1F', marginBottom: 0 }} onClick={applyPromo}>Apply</button>
              </div>
              <button
                className="btn-continue"
                disabled={isLoading}
                onClick={handleBookRide}
              >
                {isLoading ? <IonSpinner name="crescent" /> : 'CONFIRM BOOKING'}
              </button>
              <button
                className="back-nav-btn"
                style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
                onClick={() => setStep(BookingStep.LOCATION)}
              >
                Change Ride Details
              </button>
            </div>
          )}

          {step === BookingStep.MATCHING && (
            <div className="matching-state">
              <div className="matching-emoji">🚕</div>
              <div className="space-y-2">
                <h2 className="card-title" style={{ textAlign: 'center' }}>Finding your driver...</h2>
                <p style={{ color: '#94A3B8', fontSize: '14px' }}>Please wait while we match you with the nearest driver.</p>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${matchingProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="booking-map-panel">
        <NavigoMap
          userLocation={pickup}
          destination={destination}
          height="100%"
          showControls={true}
          onMapClick={handleMapClick}
        />
      </div>

      <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} color="dark" position="top" />
      <IonModal isOpen={showLoginPrompt} onDidDismiss={() => setShowLoginPrompt(false)}>
        <div className="glass-booking-card" style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
          <h2 className="card-title">Ready to Ride?</h2>
          <p style={{ color: '#94A3B8', marginBottom: '24px' }}>Sign in to book rides and earn rewards.</p>
          <button className="btn-continue" onClick={() => { setShowLoginPrompt(false); history.push('/login'); }}>Sign In</button>
          <button className="back-nav-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }} onClick={() => { setShowLoginPrompt(false); history.push('/register'); }}>Create Account</button>
        </div>
      </IonModal>
    </div>
  );
};

export default RideRequest;
