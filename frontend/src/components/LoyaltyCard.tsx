import React, { useState } from 'react';
import { IonCard, IonCardContent, IonIcon, IonButton, IonBadge, IonToast, IonProgressBar, IonModal } from '@ionic/react';
import { giftOutline, starOutline, flameOutline, trendingUpOutline, peopleOutline, calendarOutline, trophyOutline, checkmarkCircleOutline, arrowForwardOutline } from 'ionicons/icons';

interface LoyaltyCardProps {
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  referralCode?: string;
}

const TIER_CONFIG = {
  bronze: { name: 'Bronze', color: '#cd7f32', icon: flameOutline, nextTier: 500, emoji: '🥉', cashback: '2%' },
  silver: { name: 'Silver', color: '#c0c0c0', icon: trendingUpOutline, nextTier: 1000, emoji: '🥈', cashback: '5%' },
  gold: { name: 'Gold', color: '#ffd700', icon: starOutline, nextTier: 2500, emoji: '🥇', cashback: '10%' },
  platinum: { name: 'Platinum', color: '#e5e4e2', icon: giftOutline, nextTier: 99999, emoji: '💎', cashback: '15%' },
};

const ALL_REWARDS = [
  { name: 'UGX 1,000 Off', points: 50, emoji: '💰', category: 'discount' },
  { name: 'Free Boda Ride', points: 100, emoji: '🏍️', category: 'ride' },
  { name: 'UGX 500 Airtime', points: 150, emoji: '📱', category: 'airtime' },
  { name: 'Free NAVIGO Go', points: 200, emoji: '🚗', category: 'ride' },
  { name: 'Free Comfort', points: 350, emoji: '🚙', category: 'ride' },
  { name: 'MTN Data 1GB', points: 400, emoji: '🌐', category: 'data' },
  { name: 'Free XL Ride', points: 500, emoji: '🚐', category: 'ride' },
  { name: 'UGX 10,000 Cash', points: 800, emoji: '💵', category: 'cash' },
];

const WEEKLY_CHALLENGES = [
  { name: 'Complete 5 rides', points: 50, emoji: '🎯' },
  { name: 'Refer a friend', points: 100, emoji: '👥' },
  { name: 'Rate 3 drivers', points: 30, emoji: '⭐' },
  { name: 'Use Women Preferred', points: 25, emoji: '👩' },
];

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ points, tier, referralCode = 'NAVIGO50' }) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showRewards, setShowRewards] = useState(false);
  const [redeemedReward, setRedeemedReward] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rewards' | 'challenges' | 'refer'>('rewards');
  const config = TIER_CONFIG[tier];
  const progress = Math.min((points / config.nextTier) * 100, 100);

  const handleRedeem = (reward: typeof ALL_REWARDS[0]) => {
    if (points >= reward.points) {
      setRedeemedReward(reward.name);
      setToastMsg(`🎉 Congratulations! You redeemed: ${reward.name}!`);
    } else {
      setToastMsg(`You need ${reward.points - points} more points for ${reward.name}. Keep riding!`);
    }
    setShowToast(true);
  };

  const copyReferralCode = () => {
    navigator.clipboard?.writeText(referralCode);
    setToastMsg('📋 Referral code copied! Share with friends to earn 50 points each.');
    setShowToast(true);
  };

  return (
    <IonCard style={{ background: 'linear-gradient(135deg, #1B4965 0%, #0d2137 100%)', borderRadius: 20, border: `1px solid ${config.color}30`, overflow: 'visible', marginBottom: 16 }}>
      <IonCardContent style={{ padding: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 28 }}>{config.emoji}</span>
              <div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 700 }}>Zawadi Rewards</h3>
                <IonBadge style={{ background: config.color, color: '#000', fontSize: 10, fontWeight: 600 }}>{config.name} • {config.cashback} Cashback</IonBadge>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#FF6B35', lineHeight: 1 }}>{points.toLocaleString()}</div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>POINTS</span>
          </div>
        </div>

        {/* Progress */}
        <IonProgressBar value={progress / 100} style={{ height: 8, borderRadius: 4, marginBottom: 6 }} color={progress > 50 ? 'success' : 'warning'} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '0 0 16px', textAlign: 'center' }}>
          {tier !== 'platinum' 
            ? `🚀 ${config.nextTier - points} pts to ${Object.values(TIER_CONFIG)[Object.keys(TIER_CONFIG).indexOf(tier) + 1]?.emoji} ${Object.values(TIER_CONFIG)[Object.keys(TIER_CONFIG).indexOf(tier) + 1]?.name} tier`
            : '👑 Maximum tier achieved! Enjoy 15% cashback on all rides'}
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
          {(['rewards', 'challenges', 'refer'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
                background: activeTab === tab ? 'rgba(255,107,53,0.2)' : 'transparent',
                color: activeTab === tab ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600
              }}>
              {tab === 'rewards' ? '🎁 Rewards' : tab === 'challenges' ? '🎯 Challenges' : '👥 Refer'}
            </button>
          ))}
        </div>

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ALL_REWARDS.map(reward => {
              const canAfford = points >= reward.points;
              return (
                <div key={reward.name} onClick={() => handleRedeem(reward)}
                  style={{
                    background: canAfford ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.04)',
                    borderRadius: 12, padding: 12, cursor: 'pointer', textAlign: 'center',
                    border: canAfford ? '1px solid rgba(255,107,53,0.3)' : '1px solid transparent',
                    opacity: canAfford ? 1 : 0.5, transition: '0.2s',
                  }}>
                  <span style={{ fontSize: 28 }}>{reward.emoji}</span>
                  <p style={{ color: '#fff', fontSize: 11, margin: '6px 0 2px', fontWeight: 600 }}>{reward.name}</p>
                  <span style={{ color: canAfford ? '#FF6B35' : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }}>
                    {canAfford ? '✓ Redeem' : `${reward.points} pts`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {WEEKLY_CHALLENGES.map(challenge => (
              <div key={challenge.name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10 }}>
                <span style={{ fontSize: 22 }}>{challenge.emoji}</span>
                <span style={{ color: '#fff', fontSize: 13, flex: 1 }}>{challenge.name}</span>
                <IonBadge color="warning" style={{ fontSize: 11 }}>+{challenge.points} pts</IonBadge>
              </div>
            ))}
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textAlign: 'center', margin: 0 }}>Resets every Monday • Complete all for bonus 100 pts!</p>
          </div>
        )}

        {/* Refer Tab */}
        {activeTab === 'refer' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>👥</div>
            <h4 style={{ color: '#fff', margin: '0 0 4px' }}>Refer Friends, Earn Points</h4>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 16px' }}>You get 50 pts • Friend gets UGX 2,000 off their first ride</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, marginBottom: 10 }}>
              <span style={{ color: '#FF6B35', fontWeight: 700, fontSize: 16, flex: 1, textAlign: 'center', letterSpacing: 2 }}>{referralCode}</span>
            </div>
            <IonButton expand="block" size="small" onClick={copyReferralCode} style={{ '--background': '#FF6B35', '--border-radius': 10, fontSize: 12 } as any}>
              Copy Referral Code
            </IonButton>
          </div>
        )}

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <IonButton fill="clear" size="small" onClick={() => setShowRewards(true)} style={{ color: '#FF6B35', fontSize: 11 }}>
            View All Rewards <IonIcon icon={arrowForwardOutline} slot="end" />
          </IonButton>
        </div>
      </IonCardContent>

      <IonToast isOpen={showToast} onDidDismiss={() => { setShowToast(false); setRedeemedReward(null); }} message={toastMsg} duration={3500} position="top" color={redeemedReward ? 'success' : 'warning'} />
    </IonCard>
  );
};

export default LoyaltyCard;