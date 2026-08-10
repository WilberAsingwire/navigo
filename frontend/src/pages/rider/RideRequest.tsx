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
    try {
      const res = await axios.get('https://photon.komoot.io/api/', {
        params: { q: query, limit: 10, lat: pickup?.lat || 0.3476, lon: pickup?.lng || 32.5825, reprioritize: 1 }
      });
      if (!res.data || !res.data.features) return [];
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
    <div className="min-h-screen w-full bg-[#090D16] text-white p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
      {/* Left Column: Booking Form & Cards */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <button
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white font-medium text-sm mb-2 transition-colors"
          onClick={() => history.push('/rider/home')}
        >
          <IonIcon icon={arrowBackOutline} /> Back
        </button>

        <div className="bg-[#121824] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
          <h1 className="text-2xl font-bold mb-4">Book Your Ride</h1>

          {step === BookingStep.LOCATION && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-center mb-4">Where to?</h2>
                <div className="flex flex-col gap-3">
                  <div className="relative flex items-center gap-3 bg-[#1A2232] border border-slate-700/80 rounded-xl p-3.5 focus-within:border-[#FF5A1F] focus-within:ring-1 focus-within:ring-[#FF5A1F] transition-all">
                    <div className="text-slate-400"><IonIcon icon={globeOutline} /></div>
                    <input
                      className="bg-transparent border-none text-white font-medium text-sm w-full outline-none placeholder:text-slate-400"
                      placeholder="Pickup Location"
                      value={pickupSearch}
                      onChange={e => handleSearch(e.target.value, true)}
                      onFocus={() => setSearchingPickup(true)}
                    />
                  </div>
                  <div className="relative flex items-center gap-3 bg-[#1A2232] border border-slate-700/80 rounded-xl p-3.5 focus-within:border-[#FF5A1F] focus-within:ring-1 focus-within:ring-[#FF5A1F] transition-all">
                    <div className="text-slate-400"><IonIcon icon={locationOutline} /></div>
                    <input
                      className="bg-transparent border-none text-white font-medium text-sm w-full outline-none placeholder:text-slate-400"
                      placeholder="Destination"
                      value={destSearch}
                      onChange={e => handleSearch(e.target.value, false)}
                      onFocus={() => setSearchingPickup(false)}
                    />
                  </div>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="bg-[#0B111B] border border-white/10 rounded-xl overflow-hidden shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-none" onClick={() => selectLocation(r)}>
                      <IonIcon icon={locationOutline} className="text-[#FF5A1F]" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{r.name || r.address.split(',')[0]}</span>
                        <span className="text-xs text-slate-400">{r.address}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Select Vehicle</h3>
                <div className="grid grid-cols-1 gap-3">
                  {RIDE_OPTIONS.map(opt => {
                    const est = fare ? Math.round((opt.basePrice + fare.distance * opt.pricePerKm + fare.duration * opt.pricePerMinute) * opt.surgeMultiplier) : opt.basePrice;
                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${selectedRide.id === opt.id ? 'bg-[#FF5A1F]/10 border-[#FF5A1F] shadow-[0_0_15px_rgba(255,90,31,0.1)]' : 'bg-[#1A2232] border-slate-700/80 hover:border-slate-500'}`}
                        onClick={() => setSelectedRide(opt)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{opt.emoji}</span>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{opt.name}</span>
                            <span className="text-xs text-slate-400">{opt.description}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">UGX {est.toLocaleString()}</div>
                          <div className="text-[10px] text-[#FF5A1F] font-semibold">3 mins away</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                className="bg-[#FF5A1F] hover:bg-[#FF4500] text-white font-extrabold text-base tracking-wider py-4 rounded-xl shadow-[0_4px_25px_rgba(255,90,31,0.4)] w-full transition-all text-center uppercase cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!pickup || !destination}
                onClick={() => setStep(BookingStep.PAYMENT)}
              >
                CONTINUE
              </button>
            </div>
          )}

          {step === BookingStep.PAYMENT && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-center">Fare Summary</h2>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 uppercase tracking-tight">Distance</span>
                  <span className="font-medium">{fare?.distance} km</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-[#FF5A1F]">{fare?.formattedTotal}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm text-slate-400 px-1">
                <span>Ride Type: {selectedRide.name}</span>
                <span>Cash Payment</span>
              </div>
              <div className="relative flex items-center gap-3 bg-[#1A2232] border border-slate-700/80 rounded-xl p-3.5 focus-within:border-[#FF5A1F] transition-all">
                <div className="text-slate-400"><IonIcon icon={checkmarkCircleOutline} /></div>
                <input
                  className="bg-transparent border-none text-white font-medium text-sm w-full outline-none placeholder:text-slate-400"
                  placeholder="Promo Code"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value)}
                />
                <button className="text-[#FF5A1F] font-bold text-sm hover:text-white transition-colors" onClick={applyPromo}>Apply</button>
              </div>
              <button
                className="bg-[#FF5A1F] hover:bg-[#FF4500] text-white font-extrabold text-base tracking-wider py-4 rounded-xl shadow-[0_4px_25px_rgba(255,90,31,0.4)] w-full transition-all text-center uppercase cursor-pointer disabled:opacity-50"
                disabled={isLoading}
                onClick={handleBookRide}
              >
                {isLoading ? <IonSpinner name="crescent" /> : 'CONFIRM BOOKING'}
              </button>
              <button
                className="text-slate-400 hover:text-white text-sm font-medium w-full text-center transition-colors"
                onClick={() => setStep(BookingStep.LOCATION)}
              >
                Change Ride Details
              </button>
            </div>
          )}

          {step === BookingStep.MATCHING && (
            <div className="flex flex-col items-center justify-center text-center py-12 space-y-6">
              <div className="text-6xl animate-bounce">🚕</div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Finding your driver...</h2>
                <p className="text-slate-400 text-sm">Please wait while we match you with the nearest driver.</p>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#FF5A1F] h-full transition-all duration-500"
                  style={{ width: `${matchingProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Interactive Map */}
      <div className="lg:col-span-7 h-[500px] lg:h-[calc(100vh-2rem)] rounded-2xl overflow-hidden border border-white/10 relative z-0 sticky top-4 shadow-2xl">
        <NavigoMap
          userLocation={pickup}
          destination={destination}
          height="100%"
          showControls={false}
          onMapClick={handleMapClick}
        />
      </div>

      <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} color="dark" position="top" />
      <IonModal isOpen={showLoginPrompt} onDidDismiss={() => setShowLoginPrompt(false)}>
        <div className="bg-[#090D16] p-8 rounded-2xl text-center space-y-6 max-w-md mx-auto mt-20 border border-white/10">
          <h2 className="text-2xl font-bold text-white">Ready to Ride?</h2>
          <p className="text-slate-400">Sign in to book rides and earn rewards.</p>
          <button className="bg-[#FF5A1F] hover:bg-[#FF4500] text-white font-bold py-3 px-8 rounded-xl w-full transition-all" onClick={() => { setShowLoginPrompt(false); history.push('/login'); }}>Sign In</button>
          <button className="text-white hover:underline text-sm transition-colors" onClick={() => { setShowLoginPrompt(false); history.push('/register'); }}>Create Account</button>
        </div>
      </IonModal>
    </div>
  );
};

export default RideRequest;
