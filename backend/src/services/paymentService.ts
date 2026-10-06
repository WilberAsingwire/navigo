import axios from 'axios';

interface PaymentVerificationResponse {
  status: 'success' | 'failed';
  amount?: number;
  currency?: string;
  tx_ref?: string;
  error?: string;
}

interface PayoutRequest {
  amount: number;
  phone: string;
  provider: 'mtn' | 'airtel';
  reference: string;
  name?: string;
}

interface PayoutResponse {
  /** 'gateway' = sent to the provider, 'manual' = queued for admin processing */
  mode: 'gateway' | 'manual';
  status: 'processing' | 'pending' | 'failed';
  gatewayRef?: string;
  error?: string;
}

class PaymentService {
  private readonly secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

  async verifyTransaction(transactionId: string): Promise<PaymentVerificationResponse> {
    if (!this.secretKey) {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ CRITICAL: FLUTTERWAVE_SECRET_KEY missing in production!');
        return { status: 'failed', error: 'Payment gateway not configured' };
      }

      console.warn('⚠️ FLUTTERWAVE_SECRET_KEY not set. Using simulation mode for development.');
      // Simulation mode: if tx_ref starts with 'TEST_', we assume it's successful
      if (transactionId.startsWith('TEST_')) {
        return { status: 'success', amount: 1000, currency: 'UGX', tx_ref: transactionId };
      }
      return { status: 'failed', error: 'Payment gateway not configured' };
    }

    try {
      const response = await axios.get(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          Accept: 'application/json',
        },
        timeout: 15000,
      });

      const data = response.data.data;
      if (data.status === 'successful') {
        if (String(data.currency || '').toUpperCase() !== 'UGX') {
          return { status: 'failed', error: 'Only UGX payments are accepted.' };
        }
        return {
          status: 'success',
          amount: Number(data.amount),
          currency: String(data.currency).toUpperCase(),
          tx_ref: data.tx_ref,
        };
      }

      return { status: 'failed', error: 'Transaction not successful' };
    } catch (error: any) {
      console.error('Payment Verification Error:', error.response?.data || error.message);
      return { status: 'failed', error: error.response?.data?.message || 'Verification request failed' };
    }
  }

  /**
   * Request a payout (NAVIGO → driver's Mobile Money wallet).
   *
   * Flutterwave payouts use the Transfers API, not the Collections API.
   * They are intentionally opt-in because production transfers require a
   * funded/approved Flutterwave account and provider-side testing.
   * Without FLUTTERWAVE_PAYOUTS_ENABLED=true, payouts remain in the manual
   * admin queue.
   */
  async requestPayout(req: PayoutRequest): Promise<PayoutResponse> {
    if (!this.secretKey || process.env.FLUTTERWAVE_PAYOUTS_ENABLED !== 'true') {
      console.warn(`⚠️ Flutterwave payouts disabled — payout ${req.reference} queued for manual admin processing.`);
      return { mode: 'manual', status: 'pending' };
    }

    try {
      // Flutterwave's v3 Uganda mobile-money transfer uses /transfers with
      // account_bank=MPS and a recipient number in 256 format.
      const ugxPhone = `256${req.phone.replace(/^0/, '')}`;
      const response = await axios.post(
        'https://api.flutterwave.com/v3/transfers',
        {
          account_bank: 'MPS',
          account_number: ugxPhone,
          amount: req.amount,
          currency: 'UGX',
          beneficiary_name: req.name || 'NAVIGO Driver',
          reference: req.reference,
          narration: 'NAVIGO driver payout',
          callback_url: `${process.env.PUBLIC_BACKEND_URL || ''}/api/wallet/payout/callback`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 20000,
        }
      );

      const data = response.data?.data;
      const transferStatus = String(data?.status || '').toUpperCase();
      if (data && ['NEW', 'PENDING', 'PROCESSING', 'SUCCESSFUL'].includes(transferStatus)) {
        return {
          mode: 'gateway',
          status: transferStatus === 'SUCCESSFUL' ? 'processing' : 'processing',
          gatewayRef: data.reference || String(data.id),
        };
      }
      return { mode: 'gateway', status: 'failed', error: data?.status || 'Provider rejected the payout' };
    } catch (error: any) {
      console.error('Payout Error:', error.response?.data || error.message);
      return { mode: 'gateway', status: 'failed', error: error.response?.data?.message || 'Payout request failed' };
    }
  }
}

export const paymentService = new PaymentService();
