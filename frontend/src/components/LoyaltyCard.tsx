import React, { useState } from 'react';
import { IonCard, IonCardContent, IonIcon, IonButton, IonBadge, IonToast, IonProgressBar } from '@ionic/react';
import { giftOutline, starOutline, flameOutline, trendingUpOutline } from 'ionicons/icons';

interface LoyaltyCardProps {
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

const TIER_CONFIG = {
  bronze: { name: 'Bronze', color: '#cd7f32', icon: flameOutline, nextTier: 500 },
  silver: { name: 'Silver', color: '#c0c0c0', icon: trendingUpOutline, nextTier: 1000 },
  gold: { name: 'Gold', color: '#ffd700', icon: starOutline, nextTier: 2500 },
  platinum: { name: 'Platinum', color: '#e5e4e2', icon: giftOutline, nextTier: 99999 },
};

const REWARDS = [
  { name: 'UGX 1,000 Off', points: 50, emoji: '💰' },
  { name: 'Free Boda Ride', points: 100, emoji: '🏍️' },
  { name: 'Free NAVIGO Go', points: 200, emoji: '🚗' },
  { name: 'Free Comfort', points: 350, emoji: '🚙' },
];

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ points, tier }) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const config = TIER_CONFIG[tier];
  const progress = Math.min((points / config.nextTier) * 100, 100);

  const handleRedeem = (reward: typeof REWARDS[0]) => {
    if (points >= reward.points) {
      setToastMsg(`🎉 Redeemed: ${reward.name}!`);
    } else {
      setToastMsg(`Need ${reward.points - points} more points for ${reward.name}`);
    }
    setShowToast(true);
  };

  return (
    <IonCard style={{ background: 'linear-gradient(135deg, #1B4965, #0d2137)', borderRadius: 16, border: `1px solid ${config.color}40` }}>
      <IonCardContent>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IonIcon icon={giftOutline} style={{ fontSize: 28, color: '#FF6B35' }} />
            <div>
              <h3 style={{ color: '#fff', margin: 0 }}>Zawadi Rewards</h3>
              <IonBadge style={{ background: config.color, color: '#000', fontSize: 10 }}>{config.name}</IonBadge>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ color: '#FF6B35', margin: 0, fontSize: 28 }}>{points}</h1>
            <span style={{ color: 'rgba(255,248,240,0.5)', fontSize: 11 }}>points</span>
          </div>
        </div>

        <IonProgressBar value={progress / 100} style={{ height: 6, borderRadius: 3, marginBottom: 4 }} color={progress > 50 ? 'success' : 'warning'} />
        <p style={{ color: 'rgba(255,248,240,0.4)', fontSize: 10, margin: '0 0 12px' }}>
          {tier !== 'platinum' ? `${config.nextTier - points} pts to ${TIER_CONFIG[Object.keys(TIER_CONFIG)[Object.keys(TIER_CONFIG).indexOf(tier) + 1] as keyof typeof TIER_CONFIG]?.name || 'next'} tier` : 'Maximum tier reached! 🎉'}
        </p>

        <h4 style={{ color: '#fff', fontSize: 13, marginBottom: 8 }}>Redeem Rewards</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {REWARDS.map(reward => (
            <div
              key={reward.name}
              onClick={() => handleRedeem(reward)}
              style={{
                background: points >= reward.points ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.05)',
                borderRadius: 10,
                padding: 10,
                cursor: 'pointer',
                border: points >= reward.points ? '1px solid #FF6B3540' : '1px solid transparent',
                opacity: points >= reward.points ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: 20 }}>{reward.emoji}</span>
              <p style={{ color: '#fff', fontSize: 11, margin: '4px 0' }}>{reward.name}</p>
              <span style={{ color: '#FF6B35', fontSize: 10 }}>{reward.points} pts</span>
            </div>
          ))}
        </div>
      </IonCardContent>
      <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} position="top" />
    </IonCard>
  );
};

export default LoyaltyCard;