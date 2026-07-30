import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonBackButton, IonSearchbar, IonList, IonItem,
  IonLabel, IonIcon, IonButton, IonSpinner, IonFooter,
  IonBadge, IonToast, IonChip, IonAvatar,
  IonCard, IonCardContent, IonModal
} from '@ionic/react';
import {
  locationOutline, carOutline, peopleOutline,
  timeOutline, cashOutline, phonePortraitOutline,
  starOutline, bicycleOutline, shieldCheckmarkOutline,
  arrowForwardOutline, checkmarkCircleOutline,
  informationCircleOutline
} from 'ionicons/icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import BodaSafeScore from '../../components/BodaSafeBadges';
import NavigoMap from '../../components/NavigoMap';
import './RideRequest.css';

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
  const R = 6371; const dLat = ((lat2 - lat1) * Math.PI) / 180; const dLng = ((lng2 - lng1) * Math.PI) / 180;
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
  const [searchingPickup, setSearchingPickup] = useState(true);
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
  const [womenOnly, setWomenOnly] = useState(false);

  useEffect(() => { getCurrentLocation(); }, []);
  useEffect(() => { if (pickup && destination) calculateFare(); }, [pickup, destination, selectedRide, discount]);

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      // Try to get cached position first for instant display
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPickup({ lat, lng, address: 'Getting address...', name: '📍 Your Location' });
          try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const addr = res.data.display_name || '';
            const road = res.data.address?.road || '';
            const suburb = res.data.address?.suburb || res.data.address?.neighbourhood || '';
            const city = res.data.address?.city || res.data.address?.town || '';
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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }
  };

  const searchLocation = async (query: string) => {
    if (query.length < 2) return [];
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { 
          format: 'json', 
          q: query, 
          limit: 10, 
          countrycodes: 'ug',
          addressdetails: 1, 
          namedetails: 1,
          extratags: 1,
          dedupe: 1
        },
        headers: { 'Accept-Language': 'en', 'User-Agent': 'NAVIGO-RideApp/1.0' }
      });
      return res.data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
        name: item.namedetails?.name || item.address?.road || item.address?.shop || item.address?.amenity || item.display_name.split(',')[0]
      }));
    } catch { return []; }
  };

  const handleSearch = async (query: string, isPickup: boolean) => {
    if (isPickup) setPickupSearch(query); else setDestSearch(query);
    setSearchingPickup(isPickup);
    if (query.length >= 2) { setIsSearching(true); setSearchResults(await searchLocation(query)); setIsSearching(false); }
    else { setSearchResults([]); }
  };

  const selectLocation = (loc: Location) => {
    if (searchingPickup) { setPickup(loc); setPickupSearch(loc.name || loc.address.split(',')[0]); }
    else { setDestination(loc); setDestSearch(loc.name || loc.address.split(',')[0]); }
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
    setFare({ distance: Math.round(dist * 10) / 10, duration: Math.round(dur), baseFare: base, distanceFare: distFare, timeFare, surgeFare: surge, totalFare: total, formattedTotal: 'UGX ' + total.toLocaleString() });
  };

  const applyPromo = () => {
    if (promoCode.toUpperCase() === 'NAVIGO50') { setDiscount(2000); setToastMsg('🎉 UGX 2,000 off!'); }
    else if (promoCode.toUpperCase() === 'FIRSTRIDE') { setDiscount(selectedRide.basePrice); setToastMsg('🎉 First ride free!'); }
    else { setToastMsg('Invalid code. Try NAVIGO50'); }
    setShowToast(true);
  };

  const handleBookRide = () => {
    if (isGuest || !isAuthenticated) { setShowLoginPrompt(true); return; }
    setStep(BookingStep.MATCHING); setIsMatching(true); setMatchingProgress(0);
    const interval = setInterval(() => { setMatchingProgress(p => { if (p >= 100) { clearInterval(interval); return 100; } return p + Math.random() * 15; }); }, 500);
    setTimeout(() => { clearInterval(interval); setMatchingProgress(100); setIsMatching(false); setDriverFound(true); }, 4000);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border"><IonToolbar><IonButtons slot="start"><IonBackButton defaultHref={isGuest ? '/login' : '/rider/home'} /></IonButtons><IonTitle style={{color:'#fff'}}>Book a Ride</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ride-request-content">
        <div className="step-indicator">{['📍','🚗','💰','🔍'].map((icon,i)=><div key={i} className={`step-dot ${i<=step?'active':''} ${i<step?'completed':''}`}><span className="step-icon">{icon}</span></div>)}</div>
        {isGuest&&<div className="guest-banner"><IonIcon icon={informationCircleOutline}/><span>Guest mode. <b onClick={()=>history.push('/login')} style={{cursor:'pointer',textDecoration:'underline',color:'#FF6B35'}}>Sign in</b> to book.</span></div>}
        
        {step===BookingStep.LOCATION&&(
          <div className="booking-step location-step">
            <div className="location-inputs">
              <div className="location-field"><div className="location-dot pickup-dot"/><IonSearchbar placeholder="Your pickup location" value={pickupSearch} onIonInput={e=>handleSearch(e.detail.value!,true)} onFocus={()=>setSearchingPickup(true)} className="location-search" debounce={200}/></div>
              <div className="location-field"><div className="location-dot destination-dot"/><IonSearchbar placeholder="Where to?" value={destSearch} onIonInput={e=>handleSearch(e.detail.value!,false)} onFocus={()=>setSearchingPickup(false)} className="location-search" debounce={200}/></div>
            </div>
            {isSearching&&<div className="search-loading"><IonSpinner name="crescent"/> Searching places near you...</div>}
            {searchResults.length>0&&<IonList className="search-results">{searchResults.map((r,i)=><IonItem key={i} button onClick={()=>selectLocation(r)} className="search-item"><IonIcon icon={locationOutline} slot="start" color="warning"/><IonLabel className="search-label"><h3>{r.name||r.address.split(',')[0]}</h3><p>{r.address.split(',').slice(1,3).join(',')}</p></IonLabel></IonItem>)}</IonList>}
            {pickup&&destination&&<div style={{marginTop:16,borderRadius:16,overflow:'hidden'}}><NavigoMap userLocation={{lat:pickup.lat,lng:pickup.lng}} destination={{lat:destination.lat,lng:destination.lng}} height="280px"/>{fare&&<div style={{textAlign:'center',padding:'10px',background:'rgba(0,0,0,0.8)',color:'#fff',fontWeight:600,fontSize:14}}>📍 {fare.distance} km &nbsp; 🕐 ~{fare.duration} min &nbsp; 💰 <span style={{color:'#FF6B35'}}>{fare.formattedTotal}</span></div>}</div>}
          </div>
        )}

        {step===BookingStep.RIDE_TYPE&&(
          <div className="booking-step ride-type-step"><h3 style={{color:'#fff'}}>Choose Your Ride</h3><div className="ride-options">{RIDE_OPTIONS.map(opt=>{const est=fare?Math.round((opt.basePrice+fare.distance*opt.pricePerKm+fare.duration*opt.pricePerMinute)*opt.surgeMultiplier):null;return(<div key={opt.id} className={`ride-option-card ${selectedRide.id===opt.id?'selected':''}`} onClick={()=>setSelectedRide(opt)} style={{borderColor:selectedRide.id===opt.id?opt.color:'transparent'}}><div className="ride-option-header"><span className="ride-emoji">{opt.emoji}</span><div className="ride-info"><h4>{opt.name}</h4><p>{opt.description}</p></div>{est&&<div className="ride-price"><strong>UGX {est.toLocaleString()}</strong></div>}</div></div>)})}</div>
            {selectedRide&&<div style={{background:'rgba(255,105,180,0.08)',borderRadius:12,padding:14,marginTop:14,border:womenOnly?'2px solid #FF69B4':'2px solid transparent'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:26}}>👩</span><div><strong style={{color:'#fff',fontSize:14}}>Women Preferred</strong><p style={{color:'rgba(255,248,240,0.6)',fontSize:11,margin:2}}>Match with female drivers only</p></div></div><div onClick={()=>setWomenOnly(!womenOnly)} style={{width:52,height:28,borderRadius:14,background:womenOnly?'#FF69B4':'rgba(255,255,255,0.2)',position:'relative',cursor:'pointer',transition:'0.3s',flexShrink:0}}><div style={{width:22,height:22,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:womenOnly?27:3,transition:'0.3s'}}/></div></div></div>}
          </div>
        )}

        {step===BookingStep.PAYMENT&&fare&&<div className="booking-step payment-step"><IonCard className="fare-card"><IonCardContent><h3 style={{color:'#FF6B35'}}>Fare Breakdown</h3><div className="fare-details"><div className="fare-row"><span>Base fare</span><span>UGX {fare.baseFare.toLocaleString()}</span></div><div className="fare-row"><span>Distance ({fare.distance} km)</span><span>UGX {fare.distanceFare.toLocaleString()}</span></div><div className="fare-row"><span>Time (~{fare.duration} min)</span><span>UGX {fare.timeFare.toLocaleString()}</span></div>{fare.surgeFare>0&&<div className="fare-row surge"><span>Peak pricing</span><span>UGX {fare.surgeFare.toLocaleString()}</span></div>}{discount>0&&<div className="fare-row discount"><span>Discount</span><span>-UGX {discount.toLocaleString()}</span></div>}<div className="fare-row total"><strong>Total</strong><strong style={{color:'#FF6B35',fontSize:18}}>{fare.formattedTotal}</strong></div></div></IonCardContent></IonCard><div className="promo-section"><IonSearchbar placeholder="Promo code (NAVIGO50)" value={promoCode} onIonInput={e=>setPromoCode(e.detail.value!)} className="promo-input"/><IonButton size="small" fill="clear" onClick={applyPromo} style={{color:'#FF6B35'}}>Apply</IonButton></div></div>}

        {step===BookingStep.MATCHING&&<div className="booking-step matching-step">{!driverFound?<><div className="matching-animation"><div className="radar-pulse"/><IonIcon icon={carOutline} className="matching-car"/></div><h3 style={{color:'#fff'}}>Finding nearby drivers...</h3>{womenOnly&&<p style={{color:'#FF69B4',fontSize:13}}>👩 Female drivers only</p>}<div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(matchingProgress,100)}%`}}/></div><p className="matching-status">{matchingProgress<30?'Scanning...':matchingProgress<60?'Connecting...':matchingProgress<90?'Driver found!':'Almost there!'}</p></>:<div className="driver-confirmed"><IonIcon icon={checkmarkCircleOutline} className="success-icon"/><h3 style={{color:'#fff'}}>Driver Found!</h3><div className="driver-info-card"><IonAvatar><img src="https://ui-avatars.com/api/?name=Sarah+K&background=FF69B4&color=fff&size=128" alt="Driver"/></IonAvatar><div className="driver-details"><h4>{womenOnly?'Sarah K.':'John K.'}</h4><p><IonIcon icon={starOutline}/> 4.8 • Toyota Prius • UBA 123A</p><p className="eta">Arriving in 3 minutes</p></div></div><BodaSafeScore badges={['helmet','sanitized','idverified']} rating={4.8} totalRides={156}/><IonButton expand="block" className="confirm-btn" onClick={()=>history.push('/rider/active-ride')}>View Ride <IonIcon icon={arrowForwardOutline} slot="end"/></IonButton></div>}</div>}

        {step!==BookingStep.MATCHING&&<IonFooter className="booking-footer"><div className="footer-content">{step>0&&<IonButton fill="outline" onClick={()=>setStep(step-1)} style={{color:'#fff'}}>Back</IonButton>}<IonButton expand="block" className="next-btn" disabled={step===0&&(!pickup||!destination)} onClick={()=>{if(step===BookingStep.PAYMENT)handleBookRide();else setStep(step+1)}}>{step===0?'Choose Ride':step===1?'Review Payment':isGuest?'Sign In to Book':`Confirm${womenOnly?' 👩':''} & Request`}</IonButton></div></IonFooter>}

        <IonModal isOpen={showLoginPrompt} onDidDismiss={()=>setShowLoginPrompt(false)}><div className="login-prompt-modal"><h2 style={{color:'#fff'}}>Ready to Ride?</h2><p style={{color:'rgba(255,248,240,0.6)'}}>Sign in to book rides and earn rewards.</p><IonButton expand="block" onClick={()=>{setShowLoginPrompt(false);history.push('/login')}}>Sign In</IonButton><IonButton expand="block" fill="outline" onClick={()=>{setShowLoginPrompt(false);history.push('/register')}}>Create Account</IonButton></div></IonModal>
      </IonContent>
    </IonPage>
  );
};

export default RideRequest;