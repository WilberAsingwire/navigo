import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonBackButton, IonSearchbar, IonList, IonItem,
  IonLabel, IonIcon, IonButton, IonSpinner, IonFooter,
  IonBadge, IonToast, IonChip, IonAvatar, IonNote,
  IonCard, IonCardContent, IonModal
} from '@ionic/react';
import {
  locationOutline, carOutline, carSportOutline, peopleOutline,
  timeOutline, cashOutline, cardOutline, phonePortraitOutline,
  starOutline, bicycleOutline, shieldCheckmarkOutline,
  arrowForwardOutline, mapOutline, homeOutline, briefcaseOutline,
  addCircleOutline, swapHorizontalOutline, checkmarkCircleOutline,
  informationCircleOutline, closeOutline, lockClosedOutline
} from 'ionicons/icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import BodaSafeScore from '../../components/BodaSafeBadges';
import './RideRequest.css';

interface Location {
  lat: number;
  lng: number;
  address: string;
  name?: string;
}

interface RideOption {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  pricePerKm: number;
  pricePerMinute: number;
  capacity: number;
  vehicleType: string;
  surgeMultiplier: number;
  color: string;
  emoji: string;
}

interface FareEstimate {
  distance: number;
  duration: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeFare: number;
  totalFare: number;
  formattedTotal: string;
}

enum BookingStep {
  LOCATION = 0,
  RIDE_TYPE = 1,
  PAYMENT = 2,
  MATCHING = 3
}

const RIDE_OPTIONS: RideOption[] = [
  { id: 'boda', name: 'Boda Boda', description: 'Fastest • 1 passenger', basePrice: 2000, pricePerKm: 800, pricePerMinute: 100, capacity: 1, vehicleType: 'boda', surgeMultiplier: 1.0, color: '#FF6B35', emoji: '🏍️' },
  { id: 'economy', name: 'NAVIGO Go', description: 'Affordable • 4 seats', basePrice: 4000, pricePerKm: 1200, pricePerMinute: 150, capacity: 4, vehicleType: 'economy', surgeMultiplier: 1.0, color: '#2D6A4F', emoji: '🚗' },
  { id: 'comfort', name: 'NAVIGO Comfort', description: 'Premium • 4 seats', basePrice: 7000, pricePerKm: 1800, pricePerMinute: 200, capacity: 4, vehicleType: 'comfort', surgeMultiplier: 1.2, color: '#1B4965', emoji: '🚙' },
  { id: 'xl', name: 'NAVIGO XL', description: 'Groups • 6 seats', basePrice: 10000, pricePerKm: 2200, pricePerMinute: 250, capacity: 6, vehicleType: 'xl', surgeMultiplier: 1.1, color: '#E8B86D', emoji: '🚐' }
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
  const { isAuthenticated, isGuest } = useAuth();

  const [step, setStep] = useState<BookingStep>(BookingStep.LOCATION);
  const [pickup, setPickup] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [pickupSearch, setPickupSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRide, setSelectedRide] = useState(RIDE_OPTIONS[1]);
  const [fare, setFare] = useState<FareEstimate | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [driverFound, setDriverFound] = useState(false);
  const [matchingProgress, setMatchingProgress] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (pickup && destination) calculateFare();
  }, [pickup, destination, selectedRide, discount]);

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPickup({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: 'Current Location', name: '📍 Current Location' }),
        () => setPickup({ lat: 0.3136, lng: 32.5811, address: 'Kampala City Center', name: '📍 Kampala Center' }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const searchLocation = async (query: string) => {
    if (query.length < 3) return [];
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ug`);
      return res.data.map((item: any) => ({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), address: item.display_name }));
    } catch { return []; }
  };

  const handleSearch = async (query: string) => {
    setDestSearch(query);
    if (query.length >= 3) {
      setIsSearching(true);
      setSearchResults(await searchLocation(query));
      setIsSearching(false);
    }
  };

  const selectLocation = (loc: Location) => {
    setDestination(loc);
    setDestSearch(loc.address.split(',')[0]);
    setSearchResults([]);
  };

  const calculateFare = () => {
    if (!pickup || !destination) return;
    const dist = calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const speed = selectedRide.vehicleType === 'boda' ? 25 : 20;
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
      formattedTotal: `UGX ${total.toLocaleString()}`
    });
  };

  const handleBookRide = () => {
    if (isGuest || !isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    setStep(BookingStep.MATCHING);
    setIsMatching(true);
    setMatchingProgress(0);

    const interval = setInterval(() => {
      setMatchingProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + Math.random() * 15;
      });
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      setMatchingProgress(100);
      setIsMatching(false);
      setDriverFound(true);
    }, 4000);
  };

  const applyPromo = () => {
    if (promoCode.toUpperCase() === 'NAVIGO50') { setDiscount(2000); setToastMsg('🎉 UGX 2,000 off!'); }
    else if (promoCode.toUpperCase() === 'FIRSTRIDE') { setDiscount(selectedRide.basePrice); setToastMsg('🎉 First ride free!'); }
    else { setToastMsg('Invalid code. Try NAVIGO50'); }
    setShowToast(true);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={isGuest ? '/login' : '/rider/home'} />
          </IonButtons>
          <IonTitle>Book a Ride</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ride-request-content">
        {/* Step Indicator */}
        <div className="step-indicator">
          {['📍', '🚗', '💰', '🔍'].map((icon, i) => (
            <div key={i} className={`step-dot ${i <= step ? 'active' : ''} ${i < step ? 'completed' : ''}`}>
              <span className="step-icon">{icon}</span>
            </div>
          ))}
        </div>

        {/* Guest Banner */}
        {isGuest && (
          <div className="guest-banner">
            <IonIcon icon={informationCircleOutline} />
            <span>You're browsing as a guest. <b onClick={() => history.push('/login')} style={{cursor:'pointer',textDecoration:'underline'}}>Sign in</b> to book rides.</span>
          </div>
        )}

        {/* Location Step */}
        {step === BookingStep.LOCATION && (
          <div className="booking-step location-step">
            <div className="location-inputs">
              <div className="location-field">
                <div className="location-dot pickup-dot" />
                <IonSearchbar placeholder="Pickup location" value={pickupSearch} onIonInput={e => setPickupSearch(e.detail.value!)} className="location-search" disabled />
              </div>
              <div className="location-field">
                <div className="location-dot destination-dot" />
                <IonSearchbar placeholder="Where to?" value={destSearch} onIonInput={e => handleSearch(e.detail.value!)} className="location-search" />
              </div>
            </div>

            {isSearching && <div className="search-loading"><IonSpinner /> Searching...</div>}
            
            {searchResults.length > 0 && (
              <IonList className="search-results">
                {searchResults.map((r, i) => (
                  <IonItem key={i} button onClick={() => selectLocation(r)}>
                    <IonIcon icon={locationOutline} slot="start" color="primary" />
                    <IonLabel><h3>{r.address.split(',')[0]}</h3><p>{r.address}</p></IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}

            {pickup && destination && fare && (
              <div className="map-preview">
                <div className="map-placeholder">
                  <IonIcon icon={mapOutline} className="map-icon" />
                  <p>{fare.distance} km • ~{fare.duration} min</p>
                  <p style={{ color: '#FF6B35', fontWeight: 600, fontSize: 18 }}>{fare.formattedTotal}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ride Type Step */}
        {step === BookingStep.RIDE_TYPE && (
          <div className="booking-step ride-type-step">
            <h3>Choose Your Ride</h3>
            <div className="ride-options">
              {RIDE_OPTIONS.map(opt => {
                const est = fare ? Math.round(opt.basePrice + fare.distance * opt.pricePerKm + fare.duration * opt.pricePerMinute) * opt.surgeMultiplier : null;
                return (
                  <div key={opt.id} className={`ride-option-card ${selectedRide.id === opt.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRide(opt)}
                    style={{ borderColor: selectedRide.id === opt.id ? opt.color : 'transparent' }}>
                    <div className="ride-option-header">
                      <span className="ride-emoji">{opt.emoji}</span>
                      <div className="ride-info"><h4>{opt.name}</h4><p>{opt.description}</p></div>
                      {est && <div className="ride-price"><strong>UGX {est.toLocaleString()}</strong></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Step */}
        {step === BookingStep.PAYMENT && fare && (
          <div className="booking-step payment-step">
            <IonCard className="fare-card">
              <IonCardContent>
                <h3>Fare Breakdown</h3>
                <div className="fare-details">
                  <div className="fare-row"><span>Base fare</span><span>UGX {fare.baseFare.toLocaleString()}</span></div>
                  <div className="fare-row"><span>Distance ({fare.distance} km)</span><span>UGX {fare.distanceFare.toLocaleString()}</span></div>
                  <div className="fare-row"><span>Time (~{fare.duration} min)</span><span>UGX {fare.timeFare.toLocaleString()}</span></div>
                  {fare.surgeFare > 0 && <div className="fare-row surge"><span>🔥 Peak pricing</span><span>UGX {fare.surgeFare.toLocaleString()}</span></div>}
                  {discount > 0 && <div className="fare-row discount"><span>🎉 Discount</span><span>-UGX {discount.toLocaleString()}</span></div>}
                  <div className="fare-row total"><strong>Total</strong><strong>{fare.formattedTotal}</strong></div>
                </div>
              </IonCardContent>
            </IonCard>

            <div className="promo-section">
              <IonSearchbar placeholder="Promo code (NAVIGO50)" value={promoCode} onIonInput={e => setPromoCode(e.detail.value!)} className="promo-input" />
              <IonButton size="small" fill="clear" onClick={applyPromo}>Apply</IonButton>
            </div>

            <p style={{color:'rgba(255,248,240,0.5)',fontSize:12,textAlign:'center'}}>
              💡 Payment method selection coming in next update
            </p>
          </div>
        )}

        {/* Matching Step */}
        {step === BookingStep.MATCHING && (
          <div className="booking-step matching-step">
            {!driverFound ? (
              <>
                <div className="matching-animation"><div className="radar-pulse" /><IonIcon icon={carOutline} className="matching-car" /></div>
                <h3>🔍 Finding nearby drivers...</h3>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(matchingProgress, 100)}%` }} /></div>
                <p className="matching-status">
                  {matchingProgress < 30 && 'Scanning for available drivers...'}
                  {matchingProgress >= 30 && matchingProgress < 60 && 'Connecting to nearest driver...'}
                  {matchingProgress >= 60 && matchingProgress < 90 && 'Driver found! Confirming...'}
                  {matchingProgress >= 90 && 'Almost there!'}
                </p>
              </>
            ) : (
              <div className="driver-confirmed">
                <IonIcon icon={checkmarkCircleOutline} className="success-icon" />
                <h3>🚗 Driver Found!</h3>
                <div className="driver-info-card">
                  <IonAvatar><img src="https://ui-avatars.com/api/?name=John+K&background=FF6B35&color=fff&size=128" alt="Driver" /></IonAvatar>
                  <div className="driver-details">
                    <h4>John K.</h4>
                    <p><IonIcon icon={starOutline} /> 4.8 • Toyota Prius • UBA 123A</p>
                    <p className="eta">🕐 Arriving in 3 minutes</p>
                  </div>
                </div>
                <IonButton expand="block" className="confirm-btn" onClick={() => history.push('/rider/home')}>
                  View Ride <IonIcon icon={arrowForwardOutline} slot="end" />
                </IonButton>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {step !== BookingStep.MATCHING && (
          <IonFooter className="booking-footer">
            <div className="footer-content">
              {step > 0 && <IonButton fill="outline" onClick={() => setStep(step - 1)}>Back</IonButton>}
              <IonButton expand="block" className="next-btn"
                disabled={(step === 0 && (!pickup || !destination))}
                onClick={() => {
                  if (step === BookingStep.PAYMENT) handleBookRide();
                  else setStep(step + 1);
                }}>
                {step === BookingStep.LOCATION && 'Choose Ride'}
                {step === BookingStep.RIDE_TYPE && 'Review Payment'}
                {step === BookingStep.PAYMENT && (isGuest ? 'Sign In to Book' : 'Confirm & Request')}
              </IonButton>
            </div>
          </IonFooter>
        )}

        {/* Login Prompt Modal */}
        <IonModal isOpen={showLoginPrompt} onDidDismiss={() => setShowLoginPrompt(false)}>
          <div className="login-prompt-modal">
            <h2>🚀 Ready to Ride?</h2>
            <p>Sign in or create an account to book rides, track drivers, and earn rewards.</p>
            <IonButton expand="block" onClick={() => { setShowLoginPrompt(false); history.push('/login'); }}>
              Sign In
            </IonButton>
            <IonButton expand="block" fill="outline" onClick={() => { setShowLoginPrompt(false); history.push('/register'); }}>
              Create Account
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setShowLoginPrompt(false)}>
              Continue Browsing
            </IonButton>
          </div>
        </IonModal>

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} position="top" />
      </IonContent>
    </IonPage>
  );
};

export default RideRequest;