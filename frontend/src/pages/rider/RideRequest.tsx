import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonIcon, IonSpinner, IonToast, IonAvatar, IonModal
} from '@ionic/react';
import {
  locationOutline, carOutline, checkmarkCircleOutline, arrowBackOutline,
  bicycleOutline, globeOutline
} from 'ionicons/icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import BodaSafeScore from '../../components/BodaSafeBadges';
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
  const [womenOnly, setWomenOnly] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await getCurrentLocation();
        await fetchSavedPlaces();
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

  const fetchSavedPlaces = async () => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem('navigo_token');
      const res = await axios.get(`${BASE_URL}/api/users/saved-places/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedPlaces(res.data);
    } catch (err) {
      console.error('Error fetching saved places:', err);
    }
  };

  const getCurrentLocation = () => {
    return new Promise<void>((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setPickup({ lat, lng, address: 'Getting address...', name: '📍 Your Location' });
            try {
              const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
              const addr = res.data.display_name || '';
              const address = res.data.address || {};
              const road = address.road || address.pedestrian || address.footway || '';
              const suburb = address.suburb || address.neighbourhood || address.village || '';
              const city = address.city || address.town || address.municipality || '';
              const shortName = road || suburb || city || addr.split(',')[0];
              setPickup({ lat, lng, address: addr, name: '📍 ' + shortName });
              setPickupSearch(road || shortName);
            } catch {
              setPickup({ lat, lng, address: 'Your Location', name: '📍 Current Location' });
            }
            resolve();
          },
          (err) => {
            console.log('GPS Error:', err.message);
            setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala', name: '📍 Kampala' });
            resolve();
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala', name: '📍 Kampala' });
        resolve();
      }
    });
  };

  const searchLocation = async (query: string) => {
    if (query.length < 2) return [];
    try {
      const res = await axios.get('https://photon.komoot.io/api/', {
        params: { q: query, limit: 10, lat: pickup?.lat, lon: pickup?.lng, reprioritize: 1 }
      });
      return res.data.features.map((item: any) => {
        const props = item.properties;
        const geom = item.geometry.coordinates;
        return {
          lat: geom[1],
          lng: geom[0],
          address: props.name || props.city || props.street || props.state || 'Unknown Location',
          name: props.name || props.city || props.street || 'Unknown Location'
        };
      });
    } catch { return []; }
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

  const useSavedPlace = (place: any, isPickup: boolean) => {
    const loc: Location = {
      lat: Number(place.lat),
      lng: Number(place.lng),
      address: place.address,
      name: place.label
    };
    if (isPickup) {
      setPickup(loc);
      setPickupSearch(place.label);
    } else {
      setDestination(loc);
      setDestSearch(place.label);
    }
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
        setDestSearch(loc.name || '');
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
        pickup,
        destination,
        rideType: selectedRide.vehicleType,
        paymentMethod: 'cash',
        fare: fare?.totalFare
      });

      const ride = res.data.ride;
      setStep(BookingStep.MATCHING);
      setIsMatching(true);
      setMatchingProgress(0);

      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('request-ride', { userId: user?.id, rideId: ride.id });
      }

      const interval = setInterval(() => {
        setMatchingProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            return 100;
          }
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
        <p>Initializing Maps...</p>
      </div>
    );
  }

  return (
    <div className="booking-page-wrapper">
      {/* Header Bar */}
      <div className="booking-header">
        <button className="back-btn" onClick={() => history.push('/rider/home')}>
          <IonIcon icon={arrowBackOutline} /> Back to Home
        </button>
        <h1 className="booking-title">Book Your Ride</h1>
        <div style={{ width: 80 }} /> {/* Spacer for centering */}
      </div>

      <div className="booking-main-container">
        {/* Left Side: Inputs & Selection */}
        <div className="booking-form-section">

          {/* Location Card */}
          <div className="glass-input-card">
            <div className="input-row">
              <div className="input-wrapper">
                <div className="input-icon-badge">
                  <IonIcon icon={globeOutline} />
                </div>
                <input
                  className="glass-input"
                  placeholder="Pickup Location"
                  value={pickupSearch}
                  onChange={e => handleSearch(e.target.value, true)}
                  onFocus={() => setSearchingPickup(true)}
                />
              </div>
              <div className="input-divider" />
              <div className="input-wrapper">
                <div className="input-icon-badge">
                  <IonIcon icon={locationOutline} />
                </div>
                <input
                  className="glass-input"
                  placeholder="Where to?"
                  value={destSearch}
                  onChange={e => handleSearch(e.target.value, false)}
                  onFocus={() => setSearchingPickup(false)}
                />
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map((r, i) => (
                  <div key={i} className="search-result-item" onClick={() => selectLocation(r)}>
                    <IonIcon icon={locationOutline} />
                    <div className="result-text">
                      <div className="result-name">{r.name || r.address.split(',')[0]}</div>
                      <div className="result-addr">{r.address}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Selection */}
          <div className="vehicle-selection-grid">
            {RIDE_OPTIONS.map(opt => {
              const est = fare ? Math.round((opt.basePrice + fare.distance * opt.pricePerKm + fare.duration * opt.pricePerMinute) * opt.surgeMultiplier) : null;
              return (
                <div
                  key={opt.id}
                  className={`vehicle-card ${selectedRide.id === opt.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRide(opt)}
                >
                  <div className="vehicle-info">
                    <span className="vehicle-emoji">{opt.emoji}</span>
                    <div className="vehicle-text">
                      <span className="vehicle-name">{opt.name}</span>
                      <span className="vehicle-desc">{opt.description}</span>
                    </div>
                  </div>
                  <div className="vehicle-price">
                    <span className="price-value">{est ? `UGX ${est.toLocaleString()}` : '...'}</span>
                    <span className="price-eta">3 mins away</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Confirm Booking Button */}
          <button
            className="btn-confirm-booking"
            disabled={!pickup || !destination || isLoading}
            onClick={handleBookRide}
          >
            {isLoading ? <IonSpinner name="crescent" /> : 'CONFIRM BOOKING'}
          </button>
        </div>

        {/* Right Side: Map Visualization */}
        <div className="booking-map-section">
          <NavigoMap
            userLocation={{lat: pickup?.lat || 0, lng: pickup?.lng || 0}}
            destination={destination}
            height="100%"
            showControls={false}
            onMapClick={handleMapClick}
          />
        </div>
      </div>

      {/* Modals & Toasts */}
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMsg}
        duration={3000}
        color="dark"
        position="top"
      />

      <IonModal isOpen={showLoginPrompt} onDidDismiss={() => setShowLoginPrompt(false)}>
        <div className="login-prompt-modal">
          <h2>Ready to Ride?</h2>
          <p>Sign in to book rides and earn rewards.</p>
          <button className="btn-primary" onClick={() => { setShowLoginPrompt(false); history.push('/login'); }}>Sign In</button>
          <button className="btn-secondary" onClick={() => { setShowLoginPrompt(false); history.push('/register'); }}>Create Account</button>
        </div>
      </IonModal>
    </div>
  );
};

export default RideRequest;