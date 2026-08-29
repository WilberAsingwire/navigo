import React from 'react';
import { IonIcon, IonProgressBar } from '@ionic/react';
import {
  shieldCheckmarkOutline, starOutline,
  cardOutline, checkmarkCircleOutline, timeOutline
} from 'ionicons/icons';

/**
 * Trust indicators shown here MUST be backed by real data the backend can
 * verify — this component previously showed "Helmet Verified", "Sanitized"
 * and "Safety Trained" badges as always-earned for every single driver
 * (the props were hardcoded ['helmet','sanitized','idverified','trained']
 * at every call site), which is fabricated trust signaling with no
 * verification behind it. We only show things that are actually true:
 *   - ID Verified: the driver's account has verificationStatus === 'approved'
 *     (an admin actually reviewed their documents — see AdminApprovals.tsx)
 *   - Rating: the driver's real average rating from completed rides
 *   - Completed Rides: the driver's real totalTrips count
 * If NAVIGO adds real helmet-compliance or safety-training checks later,
 * badges for those can be reintroduced backed by an actual data source.
 */
interface DriverTrustCardProps {
  isVerified: boolean;
  rating: number;
  totalRides: number;
}

const DriverTrustCard: React.FC<DriverTrustCardProps> = ({ isVerified, rating, totalRides }) => {
  const ratingOk = rating >= 4.5;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: 26, color: isVerified ? '#00e676' : '#94A3B8' }} />
        <div>
          <h3 style={{ color: '#fff', margin: 0, fontSize: 15, fontWeight: 700 }}>Driver Trust Status</h3>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Based on verified account data only</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {/* ID Verified — real, backed by admin approval */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10,
          background: isVerified ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isVerified ? 'rgba(0,230,118,0.25)' : 'rgba(255,255,255,0.05)'}`,
          flex: '1 1 calc(50% - 8px)', minWidth: 140
        }}>
          <IonIcon icon={isVerified ? checkmarkCircleOutline : cardOutline} style={{ fontSize: 18, color: isVerified ? '#00e676' : 'rgba(255,255,255,0.35)' }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: isVerified ? '#00e676' : 'rgba(255,255,255,0.4)' }}>ID Verified</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{isVerified ? 'Approved by NAVIGO admin' : 'Awaiting admin review'}</div>
          </div>
        </div>

        {/* Top Rated — real, from actual rider ratings */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10,
          background: ratingOk ? 'rgba(255,193,7,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${ratingOk ? 'rgba(255,193,7,0.25)' : 'rgba(255,255,255,0.05)'}`,
          flex: '1 1 calc(50% - 8px)', minWidth: 140
        }}>
          <IonIcon icon={starOutline} style={{ fontSize: 18, color: ratingOk ? '#FFC107' : 'rgba(255,255,255,0.35)' }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: ratingOk ? '#FFC107' : 'rgba(255,255,255,0.4)' }}>Top Rated</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{ratingOk ? '4.5+ average rating' : `${rating.toFixed(1)} avg so far`}</div>
          </div>
        </div>
      </div>

      {/* Real stats */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '14px 0 2px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{totalRides}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Completed Rides</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{rating.toFixed(1)} ⭐</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Average Rating</div>
        </div>
      </div>
    </div>
  );
};

export default DriverTrustCard;
