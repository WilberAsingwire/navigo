import React from 'react';
import { IonIcon, IonProgressBar } from '@ionic/react';
import { 
  shieldCheckmarkOutline, starOutline, waterOutline,
  diamondOutline, trophyOutline, medalOutline, ellipseOutline, 
  cardOutline, schoolOutline, ribbonOutline, 
  checkmarkCircleOutline, lockClosedOutline 
} from 'ionicons/icons';

interface BadgeProps {
  type: 'helmet' | 'sanitized' | 'toprated' | 'idverified' | 'trained';
  earned: boolean;
  count?: number;
}

const badgeConfig = {
  helmet: { label: 'Helmet Verified', icon: shieldCheckmarkOutline, color: '#4da6ff', desc: 'Uses approved safety helmet' },
  sanitized: { label: 'Sanitized', icon: waterOutline, color: '#2D6A4F', desc: 'Vehicle cleaned regularly' },
  toprated: { label: 'Top Rated', icon: starOutline, color: '#FFC107', desc: '4.5+ average rating' },
  idverified: { label: 'ID Verified', icon: cardOutline, color: '#00e676', desc: 'Government ID confirmed' },
  trained: { label: 'Safety Trained', icon: schoolOutline, color: '#b47fff', desc: 'Completed safety course' },
};

const BodaSafeBadge: React.FC<BadgeProps> = ({ type, earned, count }) => {
  const config = badgeConfig[type];
  
  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', gap: 8, 
      padding: '8px 12px', borderRadius: 8,
      background: earned ? `${config.color}18` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${earned ? config.color + '40' : 'rgba(255,255,255,0.05)'}`,
      opacity: earned ? 1 : 0.5,
      transition: 'all 0.3s ease',
      flex: '1 1 calc(50% - 8px)',
      minWidth: 140
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: earned ? `${config.color}30` : 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <IonIcon icon={earned ? checkmarkCircleOutline : config.icon} style={{ fontSize: 18, color: earned ? config.color : 'rgba(255,255,255,0.3)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: earned ? config.color : 'rgba(255,255,255,0.4)' }}>
          {config.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--nav-text-dim)', marginTop: 2 }}>
          {earned ? 'Verified ✓' : 'Pending'}
        </div>
      </div>
      {count !== undefined && (
        <span style={{ fontSize: 10, color: 'var(--nav-text-dim)' }}>+{count}</span>
      )}
    </div>
  );
};

interface BodaSafeScoreProps {
  badges: string[];
  rating: number;
  totalRides: number;
  completedRides?: number;
  joinDate?: string;
}

const BodaSafeScore: React.FC<BodaSafeScoreProps> = ({ 
  badges, rating, totalRides, 
  completedRides = totalRides, 
  joinDate = '2024' 
}) => {
  const earnedBadges = badges.length;
  const maxBadges = 5;
  const score = Math.min(100, Math.round((earnedBadges / maxBadges * 40) + (rating / 5 * 40) + Math.min(totalRides / 500 * 20, 20)));
  
  const getLevel = () => {
    if (score >= 90) return { name: 'Elite', color: '#00e676', icon: diamondOutline };
    if (score >= 75) return { name: 'Diamond', color: '#4da6ff', icon: diamondOutline };
    if (score >= 60) return { name: 'Gold', color: '#FFC107', icon: trophyOutline };
    if (score >= 40) return { name: 'Silver', color: '#c0c0c0', icon: medalOutline };
    if (score >= 20) return { name: 'Bronze', color: '#cd7f32', icon: medalOutline };
    return { name: 'New', color: '#ff5252', icon: ellipseOutline };
  };

  const level = getLevel();

  return (
    <div style={{ 
      background: 'var(--nav-card)',
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      border: '1px solid var(--nav-border)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IonIcon icon={level.icon} style={{ fontSize: 26, color: level.color }} />
            <div>
              <h3 style={{ color: 'var(--nav-text)', margin: 0, fontSize: 16, fontWeight: 700 }}>Boda Safe™ Score</h3>
              <span style={{ color: level.color, fontSize: 12, fontWeight: 600 }}>{level.name} Driver</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: level.color, lineHeight: 1 }}>{score}%</div>
          <div style={{ fontSize: 10, color: 'var(--nav-text-dim)' }}>Safety Score</div>
        </div>
      </div>

      {/* Progress Bar */}
      <IonProgressBar 
        value={score / 100} 
        style={{ height: 8, borderRadius: 4, marginBottom: 16 }}
        color={score >= 60 ? 'success' : score >= 40 ? 'warning' : 'danger'}
      />
      <p style={{ color: 'var(--nav-text-dim)', fontSize: 11, margin: '0 0 16px', textAlign: 'center' }}>
        {level.name === 'Elite' ? 'Maximum safety level achieved' : 
         `${Math.max(0, 90 - score)}% to next level • ${maxBadges - earnedBadges} more badges needed`}
      </p>

      {/* Badges Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <BodaSafeBadge type="helmet" earned={badges.includes('helmet')} />
        <BodaSafeBadge type="sanitized" earned={badges.includes('sanitized')} />
        <BodaSafeBadge type="toprated" earned={rating >= 4.5} />
        <BodaSafeBadge type="idverified" earned={badges.includes('idverified')} />
        <BodaSafeBadge type="trained" earned={badges.includes('trained')} />
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-around', 
        padding: '12px 0', borderTop: '1px solid var(--nav-border)',
        marginTop: 4
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--nav-text)' }}>{completedRides}</div>
          <div style={{ fontSize: 10, color: 'var(--nav-text-dim)' }}>Safe Rides</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--nav-text)' }}>{rating.toFixed(1)}</div>
          <div style={{ fontSize: 10, color: 'var(--nav-text-dim)' }}>Rating</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--nav-text)' }}>{earnedBadges}/{maxBadges}</div>
          <div style={{ fontSize: 10, color: 'var(--nav-text-dim)' }}>Badges</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--nav-text)' }}>{joinDate}</div>
          <div style={{ fontSize: 10, color: 'var(--nav-text-dim)' }}>Member Since</div>
        </div>
      </div>
    </div>
  );
};

export default BodaSafeScore;