import React, { useState, useEffect, useCallback } from 'react';
import { IonToast, IonProgressBar, IonSpinner } from '@ionic/react';
import api from '../services/api';
import './LoyaltyCard.css';

interface LoyaltyCardProps {
  /** Kept for backward compatibility with call sites; the card now always
   * fetches the rider's real points/tier/rewards from the backend, so this
   * is only used as a first-paint placeholder while that loads. */
  ridesCount?: number;
}

interface RewardDef {
  name: string;
  points: number;
  discountAmount: number;
  emoji: string;
}

interface Redemption {
  id: string;
  rewardName: string;
  pointsCost: number;
  discountAmount: number;
  voucherCode: string;
  usedOnRideId: string | null;
  usedAt: string | null;
  redeemedAt: string;
}

interface LoyaltyStatus {
  points: number;
  earnedPoints: number;
  ridesCount: number;
  rewardedReferrals: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  tierConfig: { name: string; nextTier: number; cashback: string };
  referralCode: string | null;
  redemptions: Redemption[];
  catalog: RewardDef[];
}

const TIER_EMOJI: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };
const TIER_COLOR: Record<string, string> = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' };

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ ridesCount = 0 }) => {
  const [status, setStatus] = useState<LoyaltyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'rewards' | 'vouchers' | 'refer'>('rewards');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/loyalty/status');
      if (res.data?.ok) setStatus(res.data);
    } catch {
      // Leave status null — the card renders a minimal honest fallback below.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRedeem = async (reward: RewardDef) => {
    if (redeeming) return;
    setRedeeming(reward.name);
    try {
      const res = await api.post('/loyalty/redeem', { rewardName: reward.name });
      setToastMsg(res.data?.message || 'Redeemed!');
      await load();
    } catch (e: any) {
      setToastMsg(e.response?.data?.message || 'Could not redeem this reward right now.');
    } finally {
      setRedeeming(null);
      setShowToast(true);
    }
  };

  const copyReferralCode = () => {
    const code = status?.referralCode;
    if (!code) return;
    const link = `${window.location.origin}/register?ref=${code}`;
    navigator.clipboard?.writeText(link);
    setToastMsg('📋 Referral link copied! You earn 50 pts once your friend completes their first ride.');
    setShowToast(true);
  };

  const copyVoucher = (code: string) => {
    navigator.clipboard?.writeText(code);
    setToastMsg(`📋 Voucher ${code} copied — paste it into "Promo Code" when booking.`);
    setShowToast(true);
  };

  if (loading) {
    return (
      <div className="loyalty-card">
        <div className="loyalty-content" style={{ textAlign: 'center', padding: '2rem' }}>
          <IonSpinner name="crescent" color="warning" />
        </div>
      </div>
    );
  }

  if (!status) {
    // Backend unreachable — show an honest, non-fabricated empty state
    // instead of guessing at points from a local ride count.
    return (
      <div className="loyalty-card">
        <div className="loyalty-content" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>Zawadi Rewards is unavailable right now. Pull to refresh to try again.</p>
        </div>
      </div>
    );
  }

  const { points, tier, tierConfig, redemptions, catalog, referralCode, ridesCount: realRides, rewardedReferrals } = status;
  const progress = Math.min((status.earnedPoints / tierConfig.nextTier) * 100, 100);
  const availableVouchers = redemptions.filter(r => !r.usedAt);
  const usedVouchers = redemptions.filter(r => !!r.usedAt);

  return (
    <div className="loyalty-card">
      <div className="loyalty-content">
        {/* Header */}
        <div className="loyalty-header">
          <div className="tier-info">
            <span className="tier-emoji">{TIER_EMOJI[tier]}</span>
            <div className="tier-details">
              <span className="tier-name">Zawadi Rewards</span>
              <span className="tier-badge" style={{ background: TIER_COLOR[tier], color: '#000' }}>
                {tierConfig.name} • {tierConfig.cashback}
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
          <IonProgressBar value={progress / 100} className="loyalty-progress-bar" />
          <p className="loyalty-progress-text">
            {tier !== 'platinum' ? `${tierConfig.nextTier - status.earnedPoints} pts to next tier` : '👑 Max tier!'}
          </p>
        </div>

        {/* Tabs */}
        <div className="loyalty-tabs">
          {(['rewards', 'vouchers', 'refer'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`loyalty-tab ${activeTab === tab ? 'loyalty-tab-active' : 'loyalty-tab-inactive'}`}
            >
              {tab === 'rewards' ? '🎁' : tab === 'vouchers' ? '🎟️' : '👥'} {tab === 'vouchers' ? `vouchers${availableVouchers.length ? ` (${availableVouchers.length})` : ''}` : tab}
            </button>
          ))}
        </div>

        {/* Content Areas */}
        {activeTab === 'rewards' && (
          <div className="rewards-grid">
            {catalog.map(reward => {
              const canAfford = points >= reward.points;
              const isRedeeming = redeeming === reward.name;
              return (
                <div
                  key={reward.name}
                  onClick={() => canAfford && !redeeming && handleRedeem(reward)}
                  className={`reward-tile ${canAfford ? 'reward-tile-available' : 'reward-tile-locked'}`}
                >
                  <span className="reward-emoji">{reward.emoji}</span>
                  <p className={`reward-name ${canAfford ? '' : 'reward-name-locked'}`}>{reward.name}</p>
                  {canAfford ? (
                    <span className="reward-action action-redeem">{isRedeeming ? '…' : 'Redeem'}</span>
                  ) : (
                    <span className="reward-action action-locked">🔒 {reward.points} pts</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'vouchers' && (
          <div className="challenges-list">
            {availableVouchers.length === 0 && usedVouchers.length === 0 && (
              <div className="challenge-item" style={{ cursor: 'default' }}>
                <span className="challenge-emoji">🎟️</span>
                <span className="challenge-name">No vouchers yet — redeem a reward above to get one.</span>
              </div>
            )}
            {availableVouchers.map(v => (
              <div key={v.id} className="challenge-item" onClick={() => copyVoucher(v.voucherCode)}>
                <span className="challenge-emoji">🎟️</span>
                <span className="challenge-name">{v.rewardName} — code {v.voucherCode}</span>
                <span className="challenge-points" style={{ color: '#10B981' }}>Tap to copy</span>
              </div>
            ))}
            {usedVouchers.map(v => (
              <div key={v.id} className="challenge-item" style={{ opacity: 0.5, cursor: 'default' }}>
                <span className="challenge-emoji">✅</span>
                <span className="challenge-name">{v.rewardName} — used</span>
                <span className="challenge-points">—</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'refer' && (
          <div className="refer-container">
            <p className="refer-text">You get 50 pts once your friend completes their first ride</p>
            <div className="refer-code-box">
              <span className="refer-code">{referralCode || '—'}</span>
            </div>
            <button className="btn-copy-code" onClick={copyReferralCode} disabled={!referralCode}>
              Copy Referral Link
            </button>
            <p style={{ fontSize: 11, color: '#64748B', marginTop: 10, textAlign: 'center' }}>
              {rewardedReferrals > 0
                ? `${rewardedReferrals} friend${rewardedReferrals === 1 ? ' has' : 's have'} earned you points so far.`
                : 'Share your link — points are only credited once a friend actually completes a ride.'}
            </p>
          </div>
        )}
      </div>
      <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={3500} position="top" color="dark" />
    </div>
  );
};

export default LoyaltyCard;
