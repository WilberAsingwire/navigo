import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage, IonContent, IonIcon, IonSpinner, IonToast, IonModal, IonAvatar
} from '@ionic/react';
import {
  locationOutline, carOutline, checkmarkCircleOutline, arrowForwardOutline,
  informationCircleOutline
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

  useEffect(() => {
    getCurrentLocation();
    fetchSavedPlaces();

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
        },
        (err) => {
          console.log('GPS Error:', err.message);
          setPickup({ lat: 0.3476, lng: 32.5825, address: 'Kampala', name: '📍 Kampala' });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  };

  const searchLocation = async (query: string) => {
    if (query.length < 2) return [];
    try {
      const res = await axios.get('https://photon.komoot.io/api/', {
        params: {
          q: query,
          limit: 10,
          lat: pickup?.lat,
          lon: pickup?.lng,
          reprioritize: 1
        }
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
    }
  };

  const getSheetClass = () => {
    switch (step) {
      case BookingStep.LOCATION: return 'sheet-location';
      case BookingStep.RIDE_TYPE: return 'sheet-ride-type';
      case BookingStep.PAYMENT: return 'sheet-payment';
      case BookingStep.MATCHING: return 'sheet-matching';
      default: return 'sheet-location';
    }
  };

  return (
    <IonPage>
      <IonContent className="ride-request-content">
        {/* MAP BACKGROUND */}
        <div className="map-background">
          <NavigoMap
            userLocation={{lat: pickup?.lat || 0, lng: pickup?.lng || 0}}
            destination={destination}
            height="100%"
            showControls={false}
            onMapClick={handleMapClick}
          />
        </div>

        {/* FLOATING BOTTOM SHEET */}
        <div className={`booking-sheet ${getSheetClass()}`}>
          <div className="sheet-content">

            {step === BookingStep.LOCATION && (
              <div className="location-step">
                <h3 style={{color: '#FFFFFF', marginBottom: 16, fontWeight: 600}}>Where to?</h3>
                <div className="input-group">
                  <div className="location-field">
                    <div className="location-dot pickup-dot" />
                    <input
                      className="location-input"
                      placeholder="Your pickup location"
                      value={pickupSearch}
                      onChange={e => handleSearch(e.target.value, true)}
                      onFocus={() => setSearchingPickup(true)}
                    />
                  </div>
                  <div className="location-field">
                    <div className="location-dot destination-dot" />
                    <input
                      className="location-input"
                      placeholder="Enter destination"
                      value={destSearch}
                      onChange={e => handleSearch(e.target.value, false)}
                      onFocus={() => setSearchingPickup(false)}
                    />
                  </div>
                </div>

                {savedPlaces.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 8 }}>
                    {savedPlaces.map(p => (
                      <div
                        key={p.id}
                        onClick={() => useSavedPlace(p, searchingPickup)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          padding: '6px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <IonIcon icon={locationOutline} style={{ marginRight: 4, color: '#FF5A1F' }} /> {p.label}
                      </div>
                    ))}
                  </div>
                )}

                {isSearching && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 12 }}>
                    <IonSpinner name="crescent" style={{ width: 14, height: 14 }} /> Searching...
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((r, i) => (
                      <div key={i} className="search-item" onClick={() => selectLocation(r)}>
                        <IonIcon icon={locationOutline} style={{ color: '#FF5A1F' }} />
                        <div className="search-label">
                          <h3>{r.name || r.address.split(',')[0]}</h3>
                          <p>{r.address.split(',').slice(1, 3).join(',')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === BookingStep.RIDE_TYPE && (
              <div className="ride-type-step">
                <h3 style={{color: '#FFFFFF', marginBottom: 16, fontWeight: 600}}>Select Ride</h3>
                <div className="ride-options-grid">
                  {RIDE_OPTIONS.map(opt => {
                    const est = fare ? Math.round((opt.basePrice + fare.distance * opt.pricePerKm + fare.duration * opt.pricePerMinute) * opt.surgeMultiplier) : null;
                    return (
                      <div
                        key={opt.id}
                        className={`ride-card ${selectedRide.id === opt.id ? 'selected' : ''}`}
                        onClick={() => setSelectedRide(opt)}
                      >
                        <div className="ride-icon">{opt.emoji}</div>
                        <div className="ride-details">
                          <h4>{opt.name}</h4>
                          <p>{opt.description}</p>
                        </div>
                        <div className="ride-price">
                          <strong>{est ? `UGX ${est.toLocaleString()}` : '...'}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  background: 'rgba(255, 105, 180, 0.1)',
                  border: womenOnly ? '1px solid #FF69B4' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 16,
                  padding: 14,
                  marginTop: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>👩</span>
                    <div>
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Women Preferred</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Match with female drivers only</div>
                    </div>
                  </div>
                  <div
                    onClick={() => setWomenOnly(!womenOnly)}
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: womenOnly ? '#FF69B4' : 'rgba(255,255,255,0.2)',
                      position: 'relative', cursor: 'pointer', transition: '0.3s'
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3, left: womenOnly ? 23 : 3, transition: '0.3s'
                    }} />
                  </div>
                </div>
              </div>
            )}

            {step === BookingStep.PAYMENT && fare && (
              <div className="payment-step">
                <h3 style={{color: '#FFFFFF', marginBottom: 16, fontWeight: 600}}>Fare Review</h3>
                <div className="fare-breakdown">
                  <div className="fare-row">
                    <span>Base Fare</span>
                    <span>UGX {fare.baseFare.toLocaleString()}</span>
                  </div>
                  <div className="fare-row">
                    <span>Distance ({fare.distance} km)</span>
                    <span>UGX {fare.distanceFare.toLocaleString()}</span>
                  </div>
                  <div className="fare-row">
                    <span>Time (~{fare.duration} min)</span>
                    <span>UGX {fare.timeFare.toLocaleString()}</span>
                  </div>
                  {fare.surgeFare > 0 && (
                    <div className="fare-row" style={{ color: '#E85D75' }}>
                      <span>Peak Pricing</span>
                      <span>UGX {fare.surgeFare.toLocaleString()}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="fare-row" style={{ color: '#2D6A4F' }}>
                      <span>Discount</span>
                      <span>-UGX {discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="fare-row total">
                    <strong>Total</strong>
                    <strong>{fare.formattedTotal}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <input
                    className="location-input"
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value)}
                    style={{ padding: 0 }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={applyPromo}
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {step === BookingStep.MATCHING && (
              <div className="matching-step">
                {!driverFound ? (
                  <div className="matching-container">
                    <div className="matching-visual">
                      <div className="radar-circle radar-1" />
                      <div className="radar-circle radar-2" />
                      <div className="radar-circle radar-3" />
                      <div className="matching-car-icon">
                        <IonIcon icon={carOutline} />
                      </div>
                    </div>
                    <h3 style={{color: '#FFFFFF', marginBottom: 8, fontWeight: 600}}>Finding Your Driver</h3>
                    {womenOnly && <p style={{color: '#FF69B4', fontSize: 13, marginBottom: 16}}>👩 Female drivers only</p>}
                    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ width: `${matchingProgress}%`, height: '100%', background: '#FF5A1F', transition: 'width 0.3s linear' }} />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                      {matchingProgress < 30 ? 'Scanning area...' : matchingProgress < 60 ? 'Requesting drivers...' : matchingProgress < 90 ? 'Driver found!' : 'Connecting...'}
                    </p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                      <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 48, color: '#2D6A4F' }} />
                    </div>
                    <h3 style={{color: '#FFFFFF', marginBottom: 20, fontWeight: 600}}>Driver Found!</h3>
                    <div className="driver-card">
                      <IonAvatar className="driver-avatar">
                        <img
                          src={`https://ui-avatars.com/api/?name=${matchedDriver?.name || 'Driver'}&background=FF5A1F&color=fff&size=128`}
                          alt="Driver"
                        />
                      </IonAvatar>
                      <div className="driver-meta">
                        <h4>{matchedDriver?.name || 'Driver'}</h4>
                        <p><IonIcon icon={locationOutline} style={{ fontSize: 12, marginRight: 4 }} /> {matchedDriver?.vehicle || 'Toyota Prius'} • {matchedDriver?.plate || 'UBA 123A'}</p>
                        <div className="eta-badge">Arriving in 3 minutes</div>
                      </div>
                    </div>
                    <BodaSafeScore
                      badges={['helmet','sanitized','idverified']}
                      rating={matchedDriver?.rating || 4.8}
                      totalRides={156}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {step !== BookingStep.MATCHING && (
            <div className="sheet-footer">
              {step > 0 && (
                <button className="btn-secondary" onClick={() => setStep(step - 1)}>
                  Back
                </button>
              )}
              <button
                className="btn-primary"
                disabled={step === 0 && (!pickup || !destination)}
                onClick={() => {
                  if (step === BookingStep.PAYMENT) handleBookRide();
                  else setStep(step + 1);
                }}
              >
                {step === 0 ? 'Choose Ride' : step === 1 ? 'Review Payment' : isGuest ? 'Sign In to Book' : `Confirm${womenOnly ? ' 👩' : ''} & Request`}
              </button>
            </div>
          )}
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMsg}
          duration={3000}
          color="dark"
        />

        <IonModal isOpen={showLoginPrompt} onDidDismiss={() => setShowLoginPrompt(false)}>
          <div style={{
            background: '#0A0E17',
            color: '#fff',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 30,
            textAlign: 'center',
            gap: 20
          }}>
            <h2 style={{ fontWeight: 700 }}>Ready to Ride?</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>Sign in to book rides and earn rewards.</p>
            <button className="btn-primary" style={{ width: '100%', maxWidth: 300 }} onClick={() => { setShowLoginPrompt(false); history.push('/login'); }}>
              Sign In
            </button>
            <button className="btn-secondary" style={{ width: '100%', maxWidth: 300 }} onClick={() => { setShowLoginPrompt(false); history.push('/register'); }}>
              Create Account
            </button>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RideRequest;
