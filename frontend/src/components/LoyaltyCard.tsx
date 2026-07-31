import React, { useState } from 'react';
import { IonCard, IonCardContent, IonIcon, IonButton, IonBadge, IonToast, IonProgressBar } from '@ionic/react';
import { giftOutline, starOutline, flameOutline, trendingUpOutline } from 'ionicons/icons';

interface LoyaltyCardProps {
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  referralCode?: string;
}

const TIER_CONFIG = {
  bronze: { name: 'Bronze', color: '#cd7f32', nextTier: 500, emoji: '🥉', cashback: '2%' },
  silver: { name: 'Silver', color: '#c0c0c0', nextTier: 1000, emoji: '🥈', cashback: '5%' },
  gold: { name: 'Gold', color: '#ffd700', nextTier: 2500, emoji: '🥇', cashback: '10%' },
  platinum: { name: 'Platinum', color: '#e5e4e2', nextTier: 99999, emoji: '💎', cashback: '15%' },
};

const ALL_REWARDS = [
  { name: 'UGX 1,000 Off', points: 50, emoji: '💰' },
  { name: 'Free Boda Ride', points: 100, emoji: '🏍️' },
  { name: 'UGX 500 Airtime', points: 150, emoji: '📱' },
  { name: 'Free NAVIGO Go', points: 200, emoji: '🚗' },
  { name: 'Free Comfort', points: 350, emoji: '🚙' },
  { name: 'MTN Data 1GB', points: 400, emoji: '🌐' },
  { name: 'Free XL Ride', points: 500, emoji: '🚐' },
  { name: 'UGX 10,000 Cash', points: 800, emoji: '💵' },
];

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ points, tier, referralCode = 'NAVIGO50' }) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'rewards' | 'challenges' | 'refer'>('rewards');
  const config = TIER_CONFIG[tier];
  const progress = Math.min((points / config.nextTier) * 100, 100);

  const handleRedeem = (reward: typeof ALL_REWARDS[0]) => {
    if (points >= reward.points) {
      setToastMsg(`🎉 Redeemed: ${reward.name}!`);
    } else {
      setToastMsg(`Need ${reward.points - points} more pts for ${reward.name}`);
    }
    setShowToast(true);
  };

  const copyReferralCode = () => {
    navigator.clipboard?.writeText(referralCode);
    setToastMsg('📋 Code copied! Share to earn 50 pts.');
    setShowToast(true);
  };

  return (
    <IonCard style={{ background: 'linear-gradient(135deg, #1B4965 0%, #0d2137 100%)', borderRadius: 16, border: `1px solid ${config.color}30`, marginBottom: 12 }}>
      <IonCardContent style={{ padding: 14 }}>
        {/* Header - Compact */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 22 }}>{config.emoji}</span>
            <div>
  <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, display: 'block' }}>Zawadi Rewards</span>
  <IonBadge style={{ background: config.color, color: '#000', fontSize: 9, marginTop: 3 }}>{config.name} • {config.cashback}</IonBadge>
</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{points}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginLeft: 2 }}>pts</span>
          </div>
        </div>

        {/* Progress Bar - Orange fill */}
        <IonProgressBar value={progress / 100} style={{ height: 5, borderRadius: 3, marginBottom: 4, '--background': '#2A2A2A', '--progress-background': '#FF6B35' } as any} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, margin: '0 0 10px', textAlign: 'center' }}>
          {tier !== 'platinum' ? `${config.nextTier - points} pts to next tier` : '👑 Max tier!'}
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 }}>
          {(['rewards', 'challenges', 'refer'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flex: 1, padding: '6px 0', border: 'none', borderRadius: 6, cursor: 'pointer', background: activeTab === tab ? 'rgba(255,107,53,0.2)' : 'transparent', color: activeTab === tab ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600 }}>
              {tab === 'rewards' ? '🎁' : tab === 'challenges' ? '🎯' : '👥'} {tab}
            </button>
          ))}
        </div>

        {/* Rewards Grid - 2 columns, compact */}
        {activeTab === 'rewards' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {ALL_REWARDS.map(reward => {
              const canAfford = points >= reward.points;
              return (
                <div key={reward.name} onClick={() => handleRedeem(reward)}
                  style={{ background: canAfford ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 8, cursor: 'pointer', textAlign: 'center', border: canAfford ? '1px solid rgba(255,107,53,0.25)' : '1px solid transparent', opacity: canAfford ? 1 : 0.5 }}>
                  <span style={{ fontSize: 18 }}>{reward.emoji}</span>
                  <p style={{ color: '#fff', fontSize: 9, margin: '3px 0', fontWeight: 600 }}>{reward.name}</p>
                  <span style={{ color: canAfford ? '#FF6B35' : 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 700 }}>{canAfford ? 'Redeem' : `${reward.points} pts`}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Challenges */}
        {activeTab === 'challenges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[{ name: 'Complete 5 rides', points: 50, emoji: '🎯' }, { name: 'Refer a friend', points: 100, emoji: '👥' }, { name: 'Rate 3 drivers', points: 30, emoji: '⭐' }, { name: 'Women Preferred', points: 25, emoji: '👩' }].map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 8 }}>
                <span style={{ fontSize: 16 }}>{c.emoji}</span>
                <span style={{ color: '#fff', fontSize: 11, flex: 1 }}>{c.name}</span>
                <IonBadge style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: 9 }}>+{c.points}</IonBadge>
              </div>
            ))}
          </div>
        )}

        {/* Refer */}
        {activeTab === 'refer' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: 11, margin: '0 0 8px' }}>You get 50 pts • Friend gets UGX 2,000 off</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8, marginBottom: 6 }}>
              <span style={{ color: '#FF6B35', fontWeight: 700, fontSize: 14, flex: 1, textAlign: 'center', letterSpacing: 2 }}>{referralCode}</span>
            </div>
            <IonButton expand="block" size="small" onClick={copyReferralCode} style={{ '--background': '#FF6B35', '--border-radius': 8, fontSize: 11 } as any}>Copy Code</IonButton>
          </div>
        )}
      </IonCardContent>

      <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} position="top" color="dark" />
    </IonCard>
  );
};

export default LoyaltyCard;