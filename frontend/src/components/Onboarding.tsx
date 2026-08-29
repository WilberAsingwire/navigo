import React, { useState } from 'react';
import { IonButton, IonProgressBar, IonIcon } from '@ionic/react';
import { rocketOutline, giftOutline, shieldCheckmarkOutline, arrowForwardOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { Haptic } from '../services/HapticService';
import './Onboarding.css';

interface OnboardingProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    title: 'Navigate Your World',
    description: 'Experience the fastest, most reliable ride-hailing in Uganda. From Boda to XL, we get you there in style.',
    emoji: '🏍️',
    icon: rocketOutline,
    color: '#FF6B35',
  },
  {
    title: 'Earn Zawadi Rewards',
    description: 'Every ride brings you closer to gold. Earn points, climb tiers, and redeem them for free rides and cash!',
    emoji: '🎁',
    icon: giftOutline,
    color: '#4285F4',
  },
  {
    title: 'Ride with Boda Safe™',
    description: 'Your safety is our priority. Verified drivers, live tracking, and emergency SOS built-in for peace of mind.',
    emoji: '🛡️',
    icon: shieldCheckmarkOutline,
    color: '#4CAF50',
  },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    Haptic.tick();
    if (currentStep < SLIDES.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      Haptic.success();
      onComplete();
    }
  };

  const slide = SLIDES[currentStep];
  const progress = ((currentStep + 1) / SLIDES.length) * 100;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        {/* Progress Bar */}
        <div className="onboarding-progress-wrapper">
          <IonProgressBar value={progress / 100} color="warning" />
        </div>

        <div className="onboarding-content">
          <div className="onboarding-visual">
            <div className="visual-circle" style={{ borderColor: slide.color }}>
              <span className="visual-emoji">{slide.emoji}</span>
              <IonIcon icon={slide.icon} className="visual-icon" style={{ color: slide.color }} />
            </div>
          </div>

          <h1 className="onboarding-title">{slide.title}</h1>
          <p className="onboarding-description">{slide.description}</p>

          <div className="onboarding-dots">
            {SLIDES.map((_, idx) => (
              <div key={idx} className={`dot ${idx === currentStep ? 'active' : ''}`} />
            ))}
          </div>
        </div>

        <div className="onboarding-footer">
          {currentStep < SLIDES.length - 1 ? (
            <IonButton
              expand="block"
              className="btn-next"
              onClick={nextStep}
              style={{ '--background': slide.color }}
            >
              Next <IonIcon slot="end" icon={arrowForwardOutline} />
            </IonButton>
          ) : (
            <IonButton
              expand="block"
              className="btn-finish"
              onClick={nextStep}
              style={{ '--background': '#FF6B35' }}
            >
              Get Started <IonIcon slot="end" icon={checkmarkCircleOutline} />
            </IonButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
