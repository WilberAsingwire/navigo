import React, { useState } from 'react';
import { IonPage, IonContent, IonButton, IonIcon, IonGrid, IonRow, IonCol, useIonRouter } from '@ionic/react';
import {
  carOutline, bicycleOutline, shieldCheckmark outline, starOutline,
  phonePortraitOutline, walletOutline, timeOutline, mapOutline,
  peopleOutline, giftOutline, arrowForwardOutline, callOutline,
  cashOutline, lockClosedOutline, heartOutline, speedometerOutline,
  checkmarkCircleOutline, locationOutline, moonOutline, sunnyOutline,
  flashOutline, menuOutline, closeOutline
} from 'ionicons/icons';
import './Home.css';
import { useTheme } from '../../context/ThemeContext';

const Home: React.FC = () => {
  const ionRouter = useIonRouter();
  const { theme, toggleTheme } = useTheme();
  const [activeRide, setActiveRide] = useState('boda');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const rideOptions = [
    {
      id: 'boda',
      name: 'Boda Boda',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
          <path d="M8 15h8M10 12h4M12 9v6" strokeLinecap="round" />
          <path d="M12 15v3M9 18h6" />
        </svg>
      ),
      price: '1,500',
      desc: 'Zip through traffic',
      features: ['Helmet included', 'Trained rider']
    },
    {
      id: 'go',
      name: 'NAVIGO Go',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="7" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
      ),
      price: '3,000',
      desc: 'Affordable car rides',
      features: ['4 seats', 'AC comfort']
    },
    {
      id: 'comfort',
      name: 'Comfort',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="10" width="20" height="8" rx="3" />
          <path d="M6 10V6a6 6 0 0 1 12 0v4" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      ),
      price: '5,000',
      desc: 'Premium cars',
      features: ['4.8+ rated', 'Professional']
    },
    {
      id: 'xl',
      name: 'NAVIGO XL',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="10" width="20" height="8" rx="2" />
          <path d="M4 10V6a6 6 0 0 1 12 0v4" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      ),
      price: '8,000',
      desc: 'Group travel',
      features: ['6 seats', 'Luggage space']
    },
  ];

  return (
    <IonPage>
      <IonContent className="home-content">
        <main className="main-wrapper">
          {/* STICKY NAVBAR */}
          <nav className="home-nav">
            <div className="nav-logo">🚀 NAVIGO</div>
            <div className="nav-right">
              <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                <div className="nav-link-text" onClick={() => { ionRouter.push('/explore'); setIsMenuOpen(false); }}>Explore</div>
                <div className="nav-link-text" onClick={() => { ionRouter.push('/login'); setIsMenuOpen(false); }}>Sign In</div>
                <div className="theme-toggle" onClick={toggleTheme}>
                  <IonIcon icon={theme === 'light' ? 'moonOutline' : 'sunnyOutline'} />
                </div>
                <IonButton size="small" className="nav-signup-btn" onClick={() => { ionRouter.push('/register'); setIsMenuOpen(false); }}>Sign Up</IonButton>
              </div>

              <div className="mobile-menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <IonIcon icon={isMenuOpen ? closeOutline : menuOutline} />
              </div>
            </div>
          </nav>

          {/* HERO SECTION */}
          <section className="hero-section">
            <div className="hero-text">
              <div className="hero-badge">
                <IonIcon icon={flashOutline} /> Uganda's #1 Ride-Hailing App
              </div>
              <h1 className="hero-title">
                Move Smart.<br/>
                Pay Less.<br/>
                <span className="highlight">Arrive Safe.</span>
              </h1>
              <p className="hero-desc">
                Uganda's smartest way to move. Boda Safe™ verified drivers, women-preferred mode, and offline USSD booking. Ride with confidence across every corner of the city.
              </p>
              <div className="hero-buttons">
                <IonButton expand="block" className="hero-btn primary" onClick={() => ionRouter.push('/register')}>
                  Get Started Free <IonIcon icon={arrowForwardOutline} slot="end" />
                </IonButton>
                <IonButton expand="block" className="hero-btn secondary" fill="outline" onClick={() => ionRouter.push('/explore')}>
                  <IonIcon icon={mapOutline} slot="start" /> See Prices Near You
                </IonButton>
              </div>
            </div>

            <div className="hero-ride-preview">
              <div className="ride-preview-card">
                <div className="preview-header">
                  <span className="preview-title">Where to?</span>
                  <IonIcon icon={locationOutline} className="preview-icon" />
                </div>

                <div className="preview-route">
                  <div className="route-stop">
                    <div className="stop-dot"></div>
                    <span className="stop-text">Current Location</span>
                  </div>
                  <div className="preview-route-line"></div>
                  <div className="route-stop">
                    <div className="stop-dot destination"></div>
                    <span className="stop-text">Kampala Central</span>
                  </div>
                </div>

                <div className="ride-selection-pills">
                  {rideOptions.map(ride => (
                    <div
                      key={ride.id}
                      className={`ride-pill ${activeRide === ride.id ? 'active' : ''}`}
                      onClick={() => setActiveRide(ride.id)}
                    >
                      {ride.icon} {ride.name}
                    </div>
                  ))}
                </div>

                <div className="fare-preview">
                  <span className="fare-label">Estimated Fare</span>
                  <span className="fare-amount">UGX {rideOptions.find(r => r.id === activeRide)?.price}</span>
                </div>
              </div>
            </div>
          </section>

          {/* RIDE SELECTION CAROUSEL */}
          <section className="section">
            <h2 className="section-title">Choose Your Ride</h2>
            <p className="section-sub">From quick boda trips to luxury group rides — we've got you covered</p>

            <div className="ride-carousel">
              {rideOptions.map((ride, idx) => (
                <div key={ride.id} className={`ride-card ${idx === 0 ? 'featured' : ''}`}>
                  {idx === 0 && <div className="ride-badge">Most Popular</div>}
                  <span className="ride-icon">{ride.icon}</span>
                  <h3 className="card-title">{ride.name}</h3>
                  <p className="card-desc">{ride.desc}</p>
                  <div className="ride-features">
                    {ride.features.map((f, i) => (
                      <div key={i} className="feature-item">
                        <IonIcon icon={checkmarkCircleOutline} /> {f}
                      </div>
                    ))}
                  </div>
                  <span className="ride-rate">UGX {ride.price}<span className="per-km">/km</span></span>
                </div>
              ))}
            </div>
          </section>

          {/* HOW IT WORKS TIMELINE */}
          <section className="section">
            <div className="how-it-works">
              <h2 className="section-title">How It Works</h2>
              <p className="section-sub">Get where you're going in three simple steps</p>

              <div className="timeline">
                <div className="step">
                  <div className="step-number">1</div>
                  <h3 className="step-title">Request</h3>
                  <p className="step-text">Set your destination and choose your ride preference.</p>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <h3 className="step-title">Match</h3>
                  <p className="step-text">We connect you with the nearest Boda Safe™ verified driver.</p>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <h3 className="step-title">Arrive</h3>
                  <p className="step-text">Enjoy a safe, affordable trip to your destination.</p>
                </div>
              </div>
            </div>
          </section>

          {/* SAFETY SHOWCASE */}
          <section className="section">
            <h2 className="section-title">Safety First</h2>
            <p className="section-sub">Your security is our non-negotiable priority</p>

            <div className="safety-grid">
              <div className="safety-item">
                <IonIcon icon={shieldCheckmarkOutline} className="safety-icon" />
                <h4 className="safety-title">ID Verified</h4>
                <p className="safety-desc">Every driver undergoes mandatory government ID verification.</p>
              </div>
              <div className="safety-item">
                <IonIcon icon={starOutline} className="safety-icon" />
                <h4 className="safety-title">4.5+ Rating</h4>
                <p className="safety-desc">Only the highest-rated drivers remain on our platform.</p>
              </div>
              <div className="safety-item">
                <IonIcon icon={locationOutline} className="safety-icon" />
                <h4 className="safety-title">Live Tracking</h4>
                <p className="safety-desc">Share your ride progress in real-time with loved ones.</p>
              </div>
              <div className="safety-item">
                <IonIcon icon={callOutline} className="safety-icon" />
                <h4 className="safety-title">24/7 Support</h4>
                <p className="safety-desc">Emergency SOS and support available every second of the day.</p>
              </div>
            </div>
          </section>

          {/* ZAWADI REWARDS */}
          <section className="section">
            <h2 className="section-title">Zawadi Rewards</h2>
            <p className="section-sub">Ride more, earn more. Redeem points for free trips and airtime</p>

            <div className="rewards-grid">
              <div className="tier-card bronze">
                <div className="tier-icon-container">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 12 17 15.79 13.89"/><line x1="12" y1="17" x2="12" y2="22"/></svg>
                </div>
                <h3 className="tier-title">Bronze</h3>
                <p className="tier-pts">0 - 500 pts</p>
                <div className="tier-benefit">Basic Rewards</div>
              </div>
              <div className="tier-card silver">
                <div className="tier-icon-container">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 12 17 15.79 13.89"/><line x1="12" y1="17" x2="12" y2="22"/></svg>
                </div>
                <h3 className="tier-title">Silver</h3>
                <p className="tier-pts">500 - 1k pts</p>
                <div className="tier-benefit">5% Discount</div>
              </div>
              <div className="tier-card gold">
                <div className="tier-icon-container">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 12 17 15.79 13.89"/><line x1="12" y1="17" x2="12" y2="22"/></svg>
                </div>
                <h3 className="tier-title">Gold</h3>
                <p className="tier-pts">1k - 2.5k pts</p>
                <div className="tier-benefit">Priority Booking</div>
              </div>
              <div className="tier-card platinum">
                <div className="tier-icon-container">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 12 17 15.79 13.89"/><line x1="12" y1="17" x2="12" y2="22"/></svg>
                </div>
                <h3 className="tier-title">Platinum</h3>
                <p className="tier-pts">2.5k+ pts</p>
                <div className="tier-benefit">VIP Experience</div>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="footer">
            <div className="footer-grid">
              <div className="footer-col">
                <h4 className="footer-logo">🚀 NAVIGO</h4>
                <p>Uganda's smartest ride-hailing app. Safe, affordable, and reliable for everyone.</p>
              </div>
              <div className="footer-col">
                <h4 className="footer-col-title">Ride</h4>
                <span className="footer-link" onClick={() => ionRouter.push('/rider/book')}>Book a Ride</span>
                <span className="footer-link" onClick={() => ionRouter.push('/rider/history')}>Ride History</span>
                <span className="footer-link" onClick={() => ionRouter.push('/ussd')}>Offline Booking</span>
              </div>
              <div className="footer-col">
                <h4 className="footer-col-title">Drive</h4>
                <span className="footer-link" onClick={() => ionRouter.push('/register')}>Become a Driver</span>
                <span className="footer-link" onClick={() => ionRouter.push('/driver/earnings')}>Earnings Calculator</span>
              </div>
              <div className="footer-col">
                <h4 className="footer-col-title">Company</h4>
                <span className="footer-link">About Us</span>
                <span className="footer-link" onClick={() => ionRouter.push('/rider/support')}>Support</span>
                <span className="footer-link">Privacy Policy</span>
                <span className="footer-link">Terms of Service</span>
              </div>
            </div>
            <div className="footer-bottom">
              <p>© 2026 NAVIGO Technologies Uganda. All rights reserved.</p>
              <p>🇺🇬 Proudly Ugandan • Made in Kampala</p>
            </div>
          </footer>

          {/* STICKY BOTTOM USSD BAR */}
          <div className="sticky-bottom-bar">
            <div className="ussd-pill" onClick={() => ionRouter.push('/ussd')}>
              <IonIcon icon={phonePortraitOutline} />
              <span className="ussd-text">Book via USSD: <strong style={{color: 'white'}}>*284*624#</strong></span>
            </div>
          </div>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Home;
