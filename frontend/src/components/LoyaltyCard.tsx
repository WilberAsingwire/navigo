import React, { useState, useEffect } from 'react';
import { IonToast, IonProgressBar } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { Haptic } from '../services/HapticService';
import './LoyaltyCard.css';

interface LoyaltyCardProps {
  points?: number;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
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

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({
  points: propPoints = 0,
  tier: propTier = 'bronze',
  referralCode = 'NAVIGO50'
}) => {
  const { user } = useAuth();
  // Real loyalty points based on ride history from localStorage (AuthContext no longer has rideHistoryLength)
  const userRides = parseInt(localStorage.getItem('navigo_ride_count') || localStorage.getItem('navigo_completed_rides') || '0');
  const userReferrals = parseInt(localStorage.getItem('navigo_referrals') || '0');
  const redeemedRewards: string[] = JSON.parse(localStorage.getItem('navigo_redeemed') || '[]');

  // Dynamic points: 10 pts per ride + 50 per referral
  const realPoints = userRides * 10 + userReferrals * 50 + propPoints;
  const points = Math.max(realPoints, propPoints || 0);
  const tier = propTier || (points >= 2500 ? 'platinum' : points >= 1000 ? 'gold' : points >= 500 ? 'silver' : 'bronze');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'rewards' | 'challenges' | 'refer'>('rewards');
  const config = TIER_CONFIG[tier];
  const progress = Math.min((points / config.nextTier) * 100, 100);

  const handleRedeem = (reward: typeof ALL_REWARDS[0]) => {
    if (points >= reward.points) {
      const alreadyRedeemed = redeemedRewards.includes(reward.name);
      if (!alreadyRedeemed) {
        Haptic.success();
        redeemedRewards.push(reward.name);
        localStorage.setItem('navigo_redeemed', JSON.stringify(redeemedRewards));
        const discountAmount = reward.points * 10;
        setToastMsg(`🎉 Redeemed: ${reward.name}! UGX ${discountAmount.toLocaleString()} discount applied.`);
      } else {
        Haptic.error();
        setToastMsg(`Already redeemed: ${reward.name}`);
      }
    } else {
      Haptic.error();
      setToastMsg(`Need ${reward.points - points} more pts for ${reward.name}`);
    }
    setShowToast(true);
  };

  const copyReferralCode = () => {
    Haptic.tick();
    navigator.clipboard?.writeText(referralCode);
    const current = parseInt(localStorage.getItem('navigo_referrals') || '0');
    localStorage.setItem('navigo_referrals', String(current + 1));
    setToastMsg('📋 Code copied! Share to earn 50 pts.');
    setShowToast(true);
  };

  return (
    <div className="loyalty-card">
      <div className="loyalty-content">
        {/* Header */}
        <div className="loyalty-header">
          <div className="tier-info">
            <span className="tier-emoji">{config.emoji}</span>
            <div className="tier-details">
              <span className="tier-name">Zawadi Rewards</span>
              <span className="tier-badge" style={{ background: config.color, color: '#000' }}>
                {config.name} • {config.cashback}
              </span>
            </div>
          </div>
          <div className="points-display">
            <span className="points-value">{points}</span>
            <span className="points-label">pts</span>
          </div>
        </div>

        {/* Progress */}
        <div className="loyalty-progress-container">
          <IonProgressBar
            value={progress / 100}
            className="loyalty-progress-bar"
          />
          <p className="loyalty-progress-text">
            {tier !== 'platinum' ? `${config.nextTier - points} pts to next tier` : '👑 Max tier!'}
          </p>
        </div>

        {/* Tabs */}
        <div className="loyalty-tabs">
          {(['rewards', 'challenges', 'refer'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`loyalty-tab ${activeTab === tab ? 'loyalty-tab-active' : 'loyalty-tab-inactive'}`}
            >
              {tab === 'rewards' ? '🎁' : tab === 'challenges' ? '🎯' : '👥'} {tab}
            </button>
          ))}
        </div>

        {/* Content Areas */}
        {activeTab === 'rewards' && (
          <div className="rewards-grid">
            {ALL_REWARDS.map(reward => {
              const canAfford = points >= reward.points;
              return (
                <div
                  key={reward.name}
                  onClick={() => handleRedeem(reward)}
                  className={`reward-tile ${canAfford ? 'reward-tile-available' : 'reward-tile-locked'}`}
                >
                  <span className="reward-emoji">{reward.emoji}</span>
                  <p className={`reward-name ${canAfford ? '' : 'reward-name-locked'}`}>{reward.name}</p>
                  {canAfford ? (
                    <span className="reward-action action-redeem">Redeem</span>
                  ) : (
                    <span className="reward-action action-locked">
                      🔒 {reward.points} pts
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="challenges-list">
            {[
              { name: 'Complete 5 rides', points: 50, emoji: '🎯', check: () => parseInt(localStorage.getItem('navigo_ride_count') || '0') >= 5 },
              { name: 'Refer a friend', points: 100, emoji: '👥', check: () => (parseInt(localStorage.getItem('navigo_referrals') || '0')) > 0 },
              { name: 'Rate 3 drivers', points: 30, emoji: '⭐', check: () => true },
              { name: 'Women Preferred', points: 25, emoji: '👩', check: () => true }
            ].map(c => (
              <div key={c.name} className="challenge-item" onClick={() => {
                if (c.check()) {
                  setToastMsg(`✅ Challenge completed! +${c.points} pts`);
                } else {
                  setToastMsg(`Not yet: ${c.name}`);
                }
                setShowToast(true);
              }}>
                <span className="challenge-emoji">{c.emoji}</span>
                <span className="challenge-name">{c.name}</span>
                <span className="challenge-points">+{c.points}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'refer' && (
          <div className="refer-container">
            <p className="refer-text">You get 50 pts • Friend gets UGX 2,000 off</p>
            <div className="refer-code-box">
              <span className="refer-code">{referralCode}</span>
            </div>
            <button className="btn-copy-code" onClick={copyReferralCode}>Copy Code</button>
          </div>
        )}
      </div>
      <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3000} position="top" color="dark" />
    </div>
  );
};

export default LoyaltyCard;