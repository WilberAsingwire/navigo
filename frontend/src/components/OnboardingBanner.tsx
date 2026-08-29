import React, { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import { rocketOutline, checkmarkCircleOutline } from 'ionicons/icons';

const FIRST_RUN_KEY = 'navigo_first_run';

export const useFirstRun = (): boolean => {
  const [isFirstRun, setIsFirstRun] = useState(false);
  useEffect(() => {
    const seen = localStorage.getItem(FIRST_RUN_KEY);
    if (!seen) {
      setIsFirstRun(true);
      localStorage.setItem(FIRST_RUN_KEY, 'false');
    }
  }, []);
  return isFirstRun;
};

const OnboardingBanner: React.FC = () => {
  const isFirstRun = useFirstRun();
  if (!isFirstRun) return null;
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,107,53,0.05))',
      border: '1px solid rgba(255,107,53,0.3)',
      borderRadius: 16,
      padding: '16px 20px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      animation: 'fadeIn 0.6s ease-out'
    }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}><IonIcon icon={rocketOutline} style={{ color: '#FF6B35' }} /></div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>Welcome to NAVIGO! 👋</h4>
        <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: 13, lineHeight: 1.4 }}>
          Book your first ride, earn Zawadi points, and enjoy safe, affordable travel across Kampala.
        </p>
      </div>
      <div style={{ flexShrink: 0 }}><IonIcon icon={checkmarkCircleOutline} style={{ color: '#10B981', fontSize: 20 }} /></div>
    </div>
  );
};

export default OnboardingBanner;
