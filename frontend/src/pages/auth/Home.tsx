import React from 'react';
import { IonPage, IonContent, IonButton, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { carOutline, bicycleOutline, shieldCheckmarkOutline, starOutline, phonePortraitOutline, walletOutline, timeOutline, mapOutline, peopleOutline, giftOutline, arrowForwardOutline, phonePortraitOutline as phoneIcon } from 'ionicons/icons';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonContent className="home-content" style={{'--background': '#080c14'} as any}>
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-overlay">
            <h1 className="hero-title">🚀 NAVIGO</h1>
            <p className="hero-subtitle">Uganda's Smartest Ride-Hailing App</p>
            <p className="hero-desc">Safe rides, best prices, instant pickup. Available on any phone.</p>
            <div className="hero-buttons">
              <IonButton expand="block" className="hero-btn primary" onClick={() => history.push('/register')}>
                Get Started Free
              </IonButton>
              <IonButton expand="block" className="hero-btn secondary" fill="outline" onClick={() => history.push('/explore')}>
                See Prices Near You
              </IonButton>
            </div>
            <div className="hero-stats">
              <div><strong>15,000+</strong><span>Rides Daily</span></div>
              <div><strong>5,000+</strong><span>Drivers</span></div>
              <div><strong>4.8★</strong><span>Rating</span></div>
            </div>
          </div>
        </div>

        {/* Ride Options */}
        <div className="section">
          <h2>Choose Your Ride</h2>
          <div className="ride-cards">
            <div className="ride-card">
              <span className="ride-emoji">🏍️</span>
              <h3>Boda Boda</h3>
              <p>Fastest through traffic</p>
              <span className="price">From UGX 1,500</span>
            </div>
            <div className="ride-card">
              <span className="ride-emoji">🚗</span>
              <h3>NAVIGO Go</h3>
              <p>Affordable everyday rides</p>
              <span className="price">From UGX 3,000</span>
            </div>
            <div className="ride-card">
              <span className="ride-emoji">🚙</span>
              <h3>NAVIGO Comfort</h3>
              <p>Premium experience</p>
              <span className="price">From UGX 5,000</span>
            </div>
            <div className="ride-card">
              <span className="ride-emoji">🚐</span>
              <h3>NAVIGO XL</h3>
              <p>Groups up to 6</p>
              <span className="price">From UGX 8,000</span>
            </div>
          </div>
        </div>

        {/* Why NAVIGO */}
        <div className="section dark-section">
          <h2>Why Choose NAVIGO?</h2>
          <IonGrid>
            <IonRow>
              <IonCol size="6">
                <div className="feature-card">
                  <IonIcon icon={shieldCheckmarkOutline} />
                  <h4>Safety First</h4>
                  <p>Verified drivers, emergency SOS, live tracking</p>
                </div>
              </IonCol>
              <IonCol size="6">
                <div className="feature-card">
                  <IonIcon icon={walletOutline} />
                  <h4>Best Prices</h4>
                  <p>Competitive fares, no hidden charges</p>
                </div>
              </IonCol>
              <IonCol size="6">
                <div className="feature-card">
                  <IonIcon icon={timeOutline} />
                  <h4>Fast Pickup</h4>
                  <p>Drivers arrive in under 5 minutes</p>
                </div>
              </IonCol>
              <IonCol size="6">
                <div className="feature-card">
                  <IonIcon icon={phonePortraitOutline} />
                  <h4>Works Offline</h4>
                  <p>Book via USSD *284*624# on any phone</p>
                </div>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>

        {/* Women Safety */}
        <div className="section highlight-section">
          <h2>👩 Women Preferred Mode</h2>
          <p>Match with female drivers only — because your safety comes first.</p>
          <IonButton expand="block" fill="outline" onClick={() => history.push('/register')}>
            Learn More
          </IonButton>
        </div>

        {/* Driver Section */}
        <div className="section driver-section">
          <h2>🤑 Earn with NAVIGO</h2>
          <p>Join 5,000+ drivers earning daily. Keep 85% of every fare.</p>
          <IonButton expand="block" onClick={() => history.push('/register')}>
            Become a Driver
          </IonButton>
        </div>

        {/* CTA */}
        <div className="section cta-section">
          <h2>Ready to Ride?</h2>
          <p>Download the app or book via USSD — no internet needed!</p>
          <div className="cta-buttons">
            <IonButton expand="block" className="hero-btn primary" onClick={() => history.push('/register')}>
              Sign Up Free
            </IonButton>
            <div className="ussd-box">
              <IonIcon icon={phoneIcon} />
              <span>Dial <strong>*284*624#</strong> to book offline</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <p>© 2026 NAVIGO Uganda. All rights reserved.</p>
          <div className="footer-links">
            <span onClick={() => history.push('/login')}>Sign In</span>
            <span onClick={() => history.push('/rider/support')}>Support</span>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;