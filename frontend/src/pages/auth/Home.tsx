import React, { useState, useEffect, useRef } from 'react';
import { IonPage, IonContent, IonIcon, useIonRouter } from '@ionic/react';
import {
  shieldCheckmarkOutline, starOutline,
  phonePortraitOutline, mapOutline,
  arrowForwardOutline, callOutline,
  checkmarkCircleOutline, locationOutline,
  flashOutline, menuOutline, closeOutline,
  timeOutline, peopleOutline,
  medalOutline, trophyOutline, diamondOutline
} from 'ionicons/icons';
import './Home.css';
import useHaptic from '../../hooks/useHaptic';
import ThemeToggle from '../../components/ThemeToggle';
import Logo from '../../components/Logo';
import TransparentVehicleImage from '../../components/TransparentVehicleImage';
import bodaNew from '../../assets/vehicles/boda-new.png';
import goNew from '../../assets/vehicles/go-new.png';
import comfortNew from '../../assets/vehicles/comfort-new.png';
import xlNew from '../../assets/vehicles/xl-new.png';

const Home: React.FC = () => {
  const history = useHistory();
  const ionRouter = useIonRouter();
  const { light } = useHaptic();
  const [activeRide, setActiveRide] = useState('boda');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [streetVideoPaused, setStreetVideoPaused] = useState(false);
  const streetVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.home-nav')) setIsMenuOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('click', handleClick), 100);
    return () => { clearTimeout(t); document.removeEventListener('click', handleClick); };
  }, [isMenuOpen]);

  const navigate = (path: string) => {
    light();
    setIsMenuOpen(false);
    ionRouter.push(path);
  };

  const rideOptions = [
    {
      id: 'boda',
      name: 'Boda Boda',
      short: 'Boda',
      image: bodaNew,
      desc: 'Zip through traffic',
      seats: '1',
      features: ['Helmet included', 'Boda Safe™ verified'],
      color: '#FF6B35',
      popular: true,
      price: '450',
      minFare: '1,500',
      eta: '2-5 min',
    },
    {
      id: 'go',
      name: 'NAVIGO Go',
      short: 'Go',
      image: goNew,
      desc: 'Affordable car rides',
      seats: '4',
      features: ['4 seats', 'AC comfort'],
      color: '#0EA5E9',
      popular: false,
      price: '750',
      minFare: '3,000',
      eta: '4-9 min',
    },
    {
      id: 'comfort',
      name: 'Comfort',
      short: 'Comfort',
      image: comfortNew,
      desc: 'Premium cars',
      seats: '4',
      features: ['4.8+ rated', 'Professional drivers'],
      color: '#111827',
      popular: false,
      price: '950',
      minFare: '5,000',
      eta: '5-12 min',
    },
    {
      id: 'xl',
      name: 'NAVIGO XL',
      short: 'XL',
      image: xlNew,
      desc: 'Group travel',
      seats: '6',
      features: ['6 seats', 'Luggage space'],
      color: '#6366F1',
      popular: false,
      price: '1,300',
      minFare: '8,000',
      eta: '6-15 min',
    },
  ];

  const active = rideOptions.find(r => r.id === activeRide) || rideOptions[0];

  return (
    <IonPage>
      <IonContent className="home-content">
        <main className="main-wrapper">
          {/* NAV */}
          <nav className="home-nav">
            <Logo variant="full" size="medium" onClick={() => navigate('/')} className="nav-logo-real" />
            <div className="nav-right">
              <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                <div className="nav-link-text" onClick={() => navigate('/explore')}>Explore</div>
                <div className="nav-link-text" onClick={() => navigate('/login')}>Sign In</div>
                <ThemeToggle size="medium" />
                <button className="nav-signup-pill" onClick={() => navigate('/register')}>Sign Up</button>
              </div>
              <button className="mobile-menu-toggle" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}>
                <IonIcon icon={isMenuOpen ? closeOutline : menuOutline} />
              </button>
            </div>
          </nav>

          {/* HERO */}
          <section className="hero-section">
            <div className="hero-bg">
              <div className="hero-gradient-mesh" />
              <div className="hero-overlay" />
            </div>


            <div className="hero-story-video" aria-hidden="true">
              <video
                ref={streetVideoRef}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="https://images.pexels.com/photos/27731041/pexels-photo-27731041.jpeg?cs=srgb&amp;w=1200&amp;auto=format&amp;fit=crop"
                onCanPlay={(event) => {
                  const video = event.currentTarget;
                  void video.play()
                    .then(() => setStreetVideoPaused(false))
                    .catch(() => setStreetVideoPaused(true));
                }}
                onError={() => setStreetVideoPaused(true)}
              >
                <source
                  src="https://videos.pexels.com/video-files/30917019/13219337_2560_1440_24fps.mp4"
                  type="video/mp4"
                />
              </video>
              <div className="hero-story-video-shade" />
            </div>
            <div className="hero-visual-stage" aria-hidden="true">
              <div className="hero-visual-glow hero-visual-glow-orange" />
              <div className="hero-visual-glow hero-visual-glow-cyan" />

              <div className="hero-route-art">
                <span className="hero-route-node start" />
                <span className="hero-route-path" />
                <span className="hero-route-node end" />
                <span className="hero-route-traveller">
                  <TransparentVehicleImage src={bodaNew} alt="" turntable className="hero-route-vehicle vehicle-turntable-img" />
                </span>
              </div>

              <div className="hero-live-card">
                <span className="hero-live-card-dot" />
                <span>
                  <strong>Live network</strong>
                  <small>Drivers available nearby</small>
                </span>
              </div>
              <div className="hero-distance-card">
                <span className="hero-distance-label">Kampala → Entebbe</span>
                <strong>Live route preview</strong>
              </div>
            </div>


            <button
              className="hero-story-video-toggle"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                const video = streetVideoRef.current;
                if (!video) return;
                if (video.paused) {
                  void video.play()
                    .then(() => setStreetVideoPaused(false))
                    .catch(() => setStreetVideoPaused(true));
                } else {
                  video.pause();
                  setStreetVideoPaused(true);
                }
              }}
            >
              <span className="video-control-dot" />
              {streetVideoPaused ? 'Play story' : 'Pause story'}
            </button>

            <div className="hero-text" data-reveal="left">
              <div className="hero-badge">
                <span className="badge-dot" />
                <IonIcon icon={flashOutline} className="badge-icon" />
                Built for moving across Uganda
              </div>

              <h1 className="hero-title">
                Move Smart.<br />
                Pay Less.<br />
                <span className="highlight">Arrive Safe.</span>
              </h1>

              <p className="hero-desc">
                Uganda's smartest way to move. <strong>Boda Safe™</strong> verified drivers,
                women-preferred mode, and offline USSD booking. Ride with confidence
                across cities, towns and roads across Uganda.
              </p>

              <div className="hero-buttons">
                <button className="hero-btn primary" onClick={() => navigate('/register')}>
                  <span>Get Started Free</span>
                  <IonIcon icon={arrowForwardOutline} />
                </button>
                <button className="hero-btn secondary" onClick={() => navigate('/explore')}>
                  <IonIcon icon={mapOutline} />
                  <span>See Prices Near You</span>
                </button>
              </div>

              <div className="hero-trust">
                <div className="trust-avatars">
                  <IonIcon icon={shieldCheckmarkOutline} />
                  <IonIcon icon={starOutline} />
                  <IonIcon icon={peopleOutline} />
                </div>
                <span className="trust-text"><strong>Safety-first</strong> · <strong>Live tracking</strong> · <strong>USSD ready</strong></span>
              </div>
            </div>

            {/* RIDE PREVIEW CARD - FIXED */}
            <div className="hero-ride-preview">
              <div className="ride-preview-card">
                <div className="preview-header">
                  <span className="preview-title">Where to?</span>
                  <div className="preview-icon-wrap">
                    <IonIcon icon={locationOutline} />
                  </div>
                </div>

                <div className="preview-main">
                  <div className="preview-route">
                    <div className="route-stop">
                      <div className="stop-dot-wrap"><div className="stop-dot"></div></div>
                      <div className="stop-info">
                        <span className="stop-label">Pickup</span>
                        <span className="stop-text">Current Location</span>
                      </div>
                    </div>
                    <div className="preview-route-line"></div>
                    <div className="route-stop">
                      <div className="stop-dot-wrap"><div className="stop-dot destination"></div></div>
                      <div className="stop-info">
                        <span className="stop-label">Dropoff</span>
                        <span className="stop-text">Uganda Central</span>
                      </div>
                    </div>
                  </div>

                  <div className="preview-vehicle">
                    <TransparentVehicleImage src={active.image} alt={active.name} className="preview-vehicle-img vehicle-art-clean vehicle-turntable-img" turntable />
                    <div className="vehicle-meta">
                      <span className="vehicle-eta"><IonIcon icon={timeOutline} /> {active.eta}</span>
                      <span className="vehicle-seats"><IonIcon icon={peopleOutline} /> {active.seats}</span>
                    </div>
                  </div>
                </div>

                <div className="ride-selection-pills">
                  {rideOptions.map(ride => (
                    <button
                      key={ride.id}
                      className={`ride-pill ${activeRide === ride.id ? 'active' : ''}`}
                      onClick={() => { light(); setActiveRide(ride.id); }}
                    >
                      <TransparentVehicleImage src={ride.image} alt="" className="pill-img vehicle-art-clean vehicle-turntable-img" turntable />
                      <span>{ride.short}</span>
                    </button>
                  ))}
                </div>

                <div className="fare-preview">
                  <div className="fare-left">
                    <span className="fare-label">Estimated Fare</span>
                    <span className="fare-sub">{active.desc}</span>
                  </div>
                  <span className="fare-amount">from UGX {active.minFare}</span>
                </div>

                <button className="preview-book-btn" onClick={() => navigate('/register')}>
                  Book {active.short} Now <IonIcon icon={arrowForwardOutline} />
                </button>
              </div>
            </div>
          </section>

          {/* CHOOSE RIDE */}
          <section className="section" data-reveal>
            <div className="section-head">
              <h2 className="section-title">Choose Your Ride</h2>
              <p className="section-sub">From quick boda trips to luxury group rides — we've got you covered</p>
            </div>
            <div className="ride-carousel">
              {rideOptions.map((ride) => (
                <div key={ride.id} className={`ride-card ${ride.popular ? 'featured' : ''}`} onClick={() => navigate('/register')}>
                  {ride.popular && <div className="ride-badge">Most Popular</div>}
                  <div className="card-img-wrap">
                    <TransparentVehicleImage src={ride.image} alt={ride.name} className="card-vehicle-img vehicle-art-clean vehicle-turntable-img" turntable />
                  </div>
                  <h3 className="card-title">{ride.name}</h3>
                  <p className="card-desc">{ride.desc}</p>
                  <div className="ride-features">
                    {ride.features.map((f, i) => (
                      <div key={i} className="feature-item"><IonIcon icon={checkmarkCircleOutline} /> {f}</div>
                    ))}
                  </div>
                  <div className="card-footer">
                    <span className="ride-rate">UGX {ride.price}<span className="per-km">/km</span></span>
                    <span className="ride-eta-chip"><IonIcon icon={timeOutline} /> {ride.eta}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="section alt" data-reveal>
            <div className="how-it-works">
              <h2 className="section-title">How It Works</h2>
              <p className="section-sub">Get where you're going in three simple steps</p>
              <div className="timeline">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-connector" />
                  <h3 className="step-title">Request</h3>
                  <p className="step-text">Set your destination and choose your ride preference.</p>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-connector" />
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

          {/* SAFETY */}
          <section className="section" data-reveal>
            <h2 className="section-title">Safety First</h2>
            <p className="section-sub">Your security is our non-negotiable priority</p>
            <div className="safety-grid">
              <div className="safety-item">
                <div className="safety-icon-wrap"><IonIcon icon={shieldCheckmarkOutline} className="safety-icon" /></div>
                <h4 className="safety-title">ID Verified</h4>
                <p className="safety-desc">Every driver undergoes mandatory government ID verification.</p>
              </div>
              <div className="safety-item">
                <div className="safety-icon-wrap"><IonIcon icon={starOutline} className="safety-icon" /></div>
                <h4 className="safety-title">4.5+ Rating</h4>
                <p className="safety-desc">Only the highest-rated drivers remain on our platform.</p>
              </div>
              <div className="safety-item">
                <div className="safety-icon-wrap"><IonIcon icon={locationOutline} className="safety-icon" /></div>
                <h4 className="safety-title">Live Tracking</h4>
                <p className="safety-desc">Share your ride progress in real-time with loved ones.</p>
              </div>
              <div className="safety-item">
                <div className="safety-icon-wrap"><IonIcon icon={callOutline} className="safety-icon" /></div>
                <h4 className="safety-title">24/7 Support</h4>
                <p className="safety-desc">Emergency SOS and support available every second of the day.</p>
              </div>
            </div>
          </section>

          {/* REWARDS */}
          <section className="section alt" data-reveal>
            <h2 className="section-title">Zawadi Rewards</h2>
            <p className="section-sub">Ride more, earn more. Redeem points for free trips and airtime</p>
            <div className="rewards-grid">
              <div className="tier-card bronze">
                <div className="tier-icon-container"><IonIcon icon={medalOutline} /></div>
                <h3 className="tier-title">Bronze</h3>
                <p className="tier-pts">0 - 500 pts</p>
                <div className="tier-benefit">Basic Rewards</div>
              </div>
              <div className="tier-card silver">
                <div className="tier-icon-container"><IonIcon icon={medalOutline} /></div>
                <h3 className="tier-title">Silver</h3>
                <p className="tier-pts">500 - 1k pts</p>
                <div className="tier-benefit">5% Discount</div>
              </div>
              <div className="tier-card gold">
                <div className="tier-icon-container"><IonIcon icon={trophyOutline} /></div>
                <h3 className="tier-title">Gold</h3>
                <p className="tier-pts">1k - 2.5k pts</p>
                <div className="tier-benefit">Priority Booking</div>
              </div>
              <div className="tier-card platinum">
                <div className="tier-icon-container"><IonIcon icon={diamondOutline} /></div>
                <h3 className="tier-title">Platinum</h3>
                <p className="tier-pts">2.5k+ pts</p>
                <div className="tier-benefit">VIP Experience</div>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="footer">
            <div className="footer-grid">
              <div className="footer-col brand">
                <div style={{ marginBottom: 16 }}><Logo variant="full" size="medium" onClick={() => navigate('/')} /></div>
                <p>Uganda's smartest ride-hailing app. Safe, affordable, and reliable for everyone. Boda Safe™ verified.</p>
                <div className="footer-badges">
                  <span className="footer-badge">Made in Uganda</span>
                  <span className="footer-badge">Boda Safe™</span>
                </div>
              </div>
              <div className="footer-col">
                <h4 className="footer-col-title">Ride</h4>
                <span className="footer-link" onClick={() => navigate('/explore')}>Book a Ride</span>
                <span className="footer-link" onClick={() => navigate('/customer/history')}>Ride History</span>
                <span className="footer-link" onClick={() => navigate('/ussd')}>Offline Booking</span>
              </div>
              <div className="footer-col">
                <h4 className="footer-col-title">Drive</h4>
                <span className="footer-link" onClick={() => navigate('/register')}>Become a Driver</span>
                <span className="footer-link" onClick={() => navigate('/driver/earnings')}>Earnings Calculator</span>
              </div>
              <div className="footer-col">
                <h4 className="footer-col-title">Company</h4>
                <span className="footer-link">About Us</span>
                <span className="footer-link" onClick={() => navigate('/customer/support')}>Support</span>
                <span className="footer-link">Privacy Policy</span>
                <span className="footer-link">Terms of Service</span>
              </div>
            </div>
            <div className="footer-bottom">
              <p>© 2026 NAVIGO Technologies Uganda. All rights reserved.</p>
              <p>🇺🇬 Proudly Ugandan • Made for Uganda • Boda Safe™ Certified</p>
            </div>
          </footer>

          <div className="sticky-bottom-bar">
            <button className="ussd-pill" onClick={() => navigate('/ussd')}>
              <IonIcon icon={phonePortraitOutline} />
              <span>Book via USSD: <strong>*284*624#</strong></span>
            </button>
          </div>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Home;
