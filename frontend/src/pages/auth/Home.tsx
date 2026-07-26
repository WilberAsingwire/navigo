import React from 'react';
import { IonPage, IonContent, IonButton, IonIcon, IonGrid, IonRow, IonCol } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  carOutline, bicycleOutline, shieldCheckmarkOutline, starOutline, 
  phonePortraitOutline, walletOutline, timeOutline, mapOutline, 
  peopleOutline, giftOutline, arrowForwardOutline, callOutline,
  cashOutline, lockClosedOutline, heartOutline, speedometerOutline,
  checkmarkCircleOutline, locationOutline
} from 'ionicons/icons';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonContent className="home-content" style={{'--background': '#080c14'} as any}>
        
        {/* NAVBAR */}
        <div className="home-nav">
          <span className="nav-logo">🚀 NAVIGO</span>
          <div className="nav-links">
            <span onClick={() => history.push('/login')}>Sign In</span>
            <IonButton size="small" color="warning" onClick={() => history.push('/register')}>Sign Up</IonButton>
          </div>
        </div>

        {/* HERO */}
        <div className="hero-section">
          <div className="hero-badge">🇺🇬 Uganda's #1 Ride-Hailing App</div>
          <h1 className="hero-title">Move Smart.<br/>Pay Less.<br/><span className="highlight">Arrive Safe.</span></h1>
          <p className="hero-desc">The only app with Boda Safe certified drivers, women-preferred mode, and offline booking. Better than Uber. Cheaper than Bolt. Safer than SafeBoda.</p>
          <div className="hero-buttons">
            <IonButton expand="block" className="hero-btn primary" onClick={() => history.push('/register')}>
              Get Started Free <IonIcon icon={arrowForwardOutline} slot="end" />
            </IonButton>
            <IonButton expand="block" className="hero-btn secondary" fill="outline" onClick={() => history.push('/explore')}>
              <IonIcon icon={mapOutline} slot="start" /> See Prices Near You
            </IonButton>
          </div>
          <div className="hero-stats">
            <div><strong>15,000+</strong><span>Rides Daily</span></div>
            <div><strong>5,000+</strong><span>Verified Drivers</span></div>
            <div><strong>4.8★</strong><span>User Rating</span></div>
            <div><strong>50+</strong><span>Cities</span></div>
          </div>
        </div>

        {/* USSD OFFLINE */}
        <div className="ussd-banner">
          <IonIcon icon={phonePortraitOutline} />
          <div>
            <strong>No Smartphone? No Internet? No Problem!</strong>
            <p>Dial <span className="ussd-code">*284*624#</span> to book a ride from ANY phone — even kabiriti!</p>
          </div>
        </div>

        {/* RIDE OPTIONS */}
        <div className="section">
          <h2>🏍️ Choose Your Ride</h2>
          <p className="section-sub">From quick boda trips to group rides — we've got you covered</p>
          <div className="ride-cards">
            <div className="ride-card featured">
              <div className="ride-badge">Most Popular</div>
              <span className="ride-emoji">🏍️</span>
              <h3>Boda Boda</h3>
              <p>Zip through traffic in minutes</p>
              <div className="ride-features">
                <span><IonIcon icon={checkmarkCircleOutline} /> Helmet included</span>
                <span><IonIcon icon={checkmarkCircleOutline} /> Trained rider</span>
              </div>
              <span className="price">UGX 1,500<span>/km</span></span>
            </div>
            <div className="ride-card">
              <span className="ride-emoji">🚗</span>
              <h3>NAVIGO Go</h3>
              <p>Affordable car rides</p>
              <div className="ride-features">
                <span><IonIcon icon={checkmarkCircleOutline} /> 4 seats</span>
                <span><IonIcon icon={checkmarkCircleOutline} /> AC comfort</span>
              </div>
              <span className="price">UGX 3,000<span>/km</span></span>
            </div>
            <div className="ride-card">
              <span className="ride-emoji">🚙</span>
              <h3>Comfort</h3>
              <p>Newer cars, top drivers</p>
              <div className="ride-features">
                <span><IonIcon icon={checkmarkCircleOutline} /> Premium cars</span>
                <span><IonIcon icon={checkmarkCircleOutline} /> 4.8+ rated</span>
              </div>
              <span className="price">UGX 5,000<span>/km</span></span>
            </div>
            <div className="ride-card">
              <span className="ride-emoji">🚐</span>
              <h3>NAVIGO XL</h3>
              <p>Groups up to 6 people</p>
              <div className="ride-features">
                <span><IonIcon icon={checkmarkCircleOutline} /> 6 seats</span>
                <span><IonIcon icon={checkmarkCircleOutline} /> Luggage space</span>
              </div>
              <span className="price">UGX 8,000<span>/km</span></span>
            </div>
          </div>
        </div>

        {/* WHY NAVIGO */}
        <div className="section dark-section">
          <h2>⭐ Why 2 Million+ Ugandans Choose NAVIGO</h2>
          <IonGrid>
            <IonRow>
              <IonCol size="6"><div className="feature-card"><IonIcon icon={shieldCheckmarkOutline} /><h4>Boda Safe™ Certified</h4><p>Every driver verified, trained & rated</p></div></IonCol>
              <IonCol size="6"><div className="feature-card"><IonIcon icon={walletOutline} /><h4>Lowest Prices</h4><p>Up to 30% cheaper than competitors</p></div></IonCol>
              <IonCol size="6"><div className="feature-card"><IonIcon icon={speedometerOutline} /><h4>Fastest Pickup</h4><p>Average 3 min wait time</p></div></IonCol>
              <IonCol size="6"><div className="feature-card"><IonIcon icon={phonePortraitOutline} /><h4>Works Offline</h4><p>Book via USSD on any phone</p></div></IonCol>
              <IonCol size="6"><div className="feature-card"><IonIcon icon={heartOutline} /><h4>Women Preferred</h4><p>Match with female drivers only</p></div></IonCol>
              <IonCol size="6"><div className="feature-card"><IonIcon icon={lockClosedOutline} /><h4>Emergency SOS</h4><p>One-tap police & ambulance</p></div></IonCol>
            </IonRow>
          </IonGrid>
        </div>

        {/* SAFETY */}
        <div className="section safety-section">
          <div className="safety-badge">🛡️ BODA SAFE CERTIFIED</div>
          <h2>Your Safety Is Our #1 Priority</h2>
          <p>Every driver undergoes background checks, helmet training, and vehicle inspection before they can accept rides.</p>
          <div className="safety-features">
            <div><IonIcon icon={shieldCheckmarkOutline} /> ID Verified</div>
            <div><IonIcon icon={starOutline} /> 4.5+ Rating Required</div>
            <div><IonIcon icon={locationOutline} /> Live GPS Tracking</div>
            <div><IonIcon icon={callOutline} /> 24/7 Support</div>
          </div>
        </div>

        {/* WOMEN PREFERRED */}
        <div className="section women-section">
          <h2>👩 Women Preferred Mode</h2>
          <p>Request female drivers only — because every woman deserves to feel safe while traveling.</p>
          <IonButton expand="block" className="women-btn" onClick={() => history.push('/register')}>
            Enable Women Preferred
          </IonButton>
        </div>

        {/* DRIVERS */}
        <div className="section driver-section">
          <h2>🤑 Earn With NAVIGO</h2>
          <p className="section-sub">Join 5,000+ drivers earning daily. We take only 10% — you keep 90%.</p>
          <div className="driver-stats">
            <div><strong>UGX 50K-150K</strong><span>Daily Earnings</span></div>
            <div><strong>90%</strong><span>You Keep</span></div>
            <div><strong>Instant</strong><span>Cash Payouts</span></div>
          </div>
          <IonButton expand="block" className="hero-btn primary" onClick={() => history.push('/register')}>
            Start Earning Today
          </IonButton>
        </div>

        {/* ZAWADI REWARDS */}
        <div className="section rewards-section">
          <h2>🎁 Zawadi Rewards</h2>
          <p>Earn points on every ride. Redeem for free rides, airtime, and more!</p>
          <div className="reward-tiers">
            <div className="tier"><span>🥉</span><strong>Bronze</strong><p>0-500 pts</p></div>
            <div className="tier"><span>🥈</span><strong>Silver</strong><p>500-1000 pts</p></div>
            <div className="tier"><span>🥇</span><strong>Gold</strong><p>1000-2500 pts</p></div>
            <div className="tier"><span>💎</span><strong>Platinum</strong><p>2500+ pts</p></div>
          </div>
        </div>

        {/* CTA */}
        <div className="section cta-section">
          <h2>Ready to Move?</h2>
          <p>Join Uganda's fastest-growing ride-hailing app. Download or dial — it's your choice.</p>
          <div className="cta-buttons">
            <IonButton expand="block" className="hero-btn primary" onClick={() => history.push('/register')}>
              Sign Up Free <IonIcon icon={arrowForwardOutline} slot="end" />
            </IonButton>
            <div className="ussd-box large">
              <IonIcon icon={phonePortraitOutline} />
              <div>
                <strong>No internet? Dial *284*624#</strong>
                <p>Works on ANY phone — MTN, Airtel, all networks</p>
              </div>
            </div>
          </div>
        </div>
        {/* APP DOWNLOAD */}
<div className="section app-section">
  <h2>📱 Get the Full Experience</h2>
  <p>Install NAVIGO on your phone for faster booking, live tracking, and exclusive rewards.</p>
  <div className="app-buttons">
    <div className="app-btn">
      <span>🤖</span>
      <div>
        <strong>Android App</strong>
        <p>Download .APK</p>
      </div>
    </div>
    <div className="app-btn">
      <span>🍎</span>
      <div>
        <strong>iOS App</strong>
        <p>Coming Soon</p>
      </div>
    </div>
  </div>
</div>

{/* FLOATING SUPPORT */}
<div className="floating-support" onClick={() => history.push('/rider/support')}>
  <IonIcon icon={callOutline} />
</div>

        {/* FOOTER */}
        <div className="footer">
          <div className="footer-grid">
            <div>
              <h4>🚀 NAVIGO</h4>
              <p>Uganda's smartest ride-hailing app. Safe, affordable, reliable.</p>
            </div>
            <div>
              <h4>Ride</h4>
              <span onClick={() => history.push('/rider/book')}>Book a Ride</span>
              <span onClick={() => history.push('/rider/history')}>Ride History</span>
              <span onClick={() => history.push('/ussd')}>Offline Booking</span>
            </div>
            <div>
              <h4>Drive</h4>
              <span onClick={() => history.push('/register')}>Become a Driver</span>
              <span onClick={() => history.push('/driver/earnings')}>Earnings</span>
            </div>
            <div>
              <h4>Company</h4>
              <span>About Us</span>
              <span onClick={() => history.push('/rider/support')}>Support</span>
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 NAVIGO Technologies Uganda. All rights reserved.</p>
            <p>🇺🇬 Proudly Ugandan • Made in Kampala</p>
          </div>
        </div>

      </IonContent>
    </IonPage>
  );
};

export default Home;