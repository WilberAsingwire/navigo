import React from 'react';
import { IonBadge, IonIcon, IonChip, IonLabel } from '@ionic/react';
import { shieldCheckmarkOutline, starOutline, ribbonOutline, waterOutline, cardOutline, schoolOutline } from 'ionicons/icons';

interface BadgeProps {
  type: 'helmet' | 'sanitized' | 'toprated' | 'idverified' | 'trained';
  earned: boolean;
}

const badgeConfig = {
  helmet: { label: 'Helmet Verified', icon: shieldCheckmarkOutline, color: '#4da6ff' },
  sanitized: { label: 'Sanitized', icon: waterOutline, color: '#2D6A4F' },
  toprated: { label: 'Top Rated', icon: starOutline, color: '#FFC107' },
  idverified: { label: 'ID Verified', icon: cardOutline, color: '#00e676' },
  trained: { label: 'Trained', icon: schoolOutline, color: '#b47fff' },
};

const BodaSafeBadge: React.FC<BadgeProps> = ({ type, earned }) => {
  const config = badgeConfig[type];
  if (!earned) return null;
  
  return (
    <IonChip style={{ background: `${config.color}20`, color: config.color, border: `1px solid ${config.color}40`, margin: 2 }}>
      <IonIcon icon={config.icon} style={{ color: config.color }} />
      <IonLabel style={{ fontSize: 11 }}>{config.label}</IonLabel>
    </IonChip>
  );
};

interface BodaSafeScoreProps {
  badges: string[];
  rating: number;
  totalRides: number;
}

const BodaSafeScore: React.FC<BodaSafeScoreProps> = ({ badges, rating, totalRides }) => {
  const score = Math.min(100, (badges.length * 20) + (rating * 10) + Math.min(totalRides / 10, 20));
  const level = score >= 80 ? '🟢 Elite' : score >= 50 ? '🟡 Trusted' : '🔴 New';

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ color: '#fff', margin: 0 }}>Boda Safe Score</h4>
        <span style={{ fontSize: 20, fontWeight: 'bold', color: score >= 80 ? '#00e676' : score >= 50 ? '#FFC107' : '#ff5252' }}>
          {score}% {level}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <BodaSafeBadge type="helmet" earned={badges.includes('helmet')} />
        <BodaSafeBadge type="sanitized" earned={badges.includes('sanitized')} />
        <BodaSafeBadge type="toprated" earned={rating >= 4.5} />
        <BodaSafeBadge type="idverified" earned={badges.includes('idverified')} />
        <BodaSafeBadge type="trained" earned={badges.includes('trained')} />
      </div>
    </div>
  );
};

export default BodaSafeScore;