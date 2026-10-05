import React, { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import { rocketOutline, checkmarkCircleOutline } from 'ionicons/icons';

// Unified onboarding key — used by App.tsx onboarding flow
const FIRST_RUN_KEY = 'navigo_onboarding_complete';

export const useFirstRun = (): boolean => {
  const [isFirstRun, setIsFirstRun] = useState(false);
  useEffect(() => {
    const seen = localStorage.getItem(FIRST_RUN_KEY);
    if (!seen) {
      setIsFirstRun(true);
      // Don't mark complete here — let user dismiss banner to mark complete
    }
  }, []);
  return isFirstRun;
};

const OnboardingBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const isFirstRun = useFirstRun();

  useEffect(() => {
    if (isFirstRun) setVisible(true);
  }, [isFirstRun]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(FIRST_RUN_KEY, 'true');
  };

  if (!visible) return null;
  return (
    <div style={{
      background: 'var(--navigo-orange-soft)',
      border: '1px solid rgba(255,107,53,0.3)',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      animation: 'fadeIn 0.6s ease-out'
    }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}><IonIcon icon={rocketOutline} style={{ color: 'var(--navigo-orange)' }} /></div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: 0, color: 'var(--nav-text)', fontWeight: 700, fontSize: 15 }}>Welcome to NAVIGO</h4>
        <p style={{ margin: '4px 0 0', color: 'var(--nav-text-secondary)', fontSize: 13, lineHeight: 1.4 }}>
          Book your first ride, earn Zawadi points, and enjoy safe, affordable travel across Kampala.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <IonIcon icon={checkmarkCircleOutline} style={{ color: '#10B981', fontSize: 20, cursor: 'pointer' }} onClick={dismiss} />
        <span onClick={dismiss} style={{ color: 'var(--nav-text-secondary)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Dismiss</span>
      </div>
    </div>
  );
};

export default OnboardingBanner;
