export type PromoKind = 'fixed' | 'free';

export interface PromoDefinition {
  code: string;
  kind: PromoKind;
  amount: number;
  label: string;
}

export interface AppliedPromo {
  code: string;
  kind: PromoKind;
  amount: number;
  label: string;
  originalFare: number;
  finalFare: number;
}

export const PROMO_CODES: Record<string, PromoDefinition> = {
  NAVIGO50: { code: 'NAVIGO50', kind: 'fixed', amount: 2000, label: 'UGX 2,000 off' },
  FIRSTRIDE: { code: 'FIRSTRIDE', kind: 'free', amount: 0, label: 'First ride free' },
  ZAWADI: { code: 'ZAWADI', kind: 'fixed', amount: 1500, label: 'UGX 1,500 off' },
};

export function applyPromo(total: number, rawCode?: string | null): AppliedPromo | null {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;

  const promo = PROMO_CODES[code];
  if (!promo) throw new Error('Invalid promo code');

  const originalFare = Math.max(0, Math.round(Number(total) || 0));
  const finalFare = promo.kind === 'free'
    ? 0
    : Math.max(0, originalFare - promo.amount);

  return {
    ...promo,
    originalFare,
    finalFare,
  };
}
