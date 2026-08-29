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

interface InitiatePaymentRequest {
  amount: number;
  reference: string;
  email: string;
  name: string;
  phone?: string;
  redirectUrl: string;
}

interface InitiatePaymentResponse {
  mode: 'gateway' | 'simulation';
  checkoutUrl?: string;
  error?: string;
}

class PaymentService {
  private readonly secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

  /**
   * Start a real, hosted Flutterwave checkout for a wallet top-up.
   * The rider is redirected to `checkoutUrl`; Flutterwave later redirects back
   * to `redirectUrl` with a real `transaction_id` we verify server-side before
   * crediting the wallet (see verifyTransaction below).
   *
   * Without FLUTTERWAVE_SECRET_KEY (dev/demo), returns 'simulation' mode; the
   * caller (POST /wallet/topup/verify) then trusts the server-created
   * topup_intents row directly instead of calling out to a real gateway —
   * this keeps local development and CI working without payment credentials.
   */
  async initiateTopUp(req: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    if (!this.secretKey) {
      console.warn('⚠️ FLUTTERWAVE_SECRET_KEY not set. Top-up will run in simulation mode.');
      return { mode: 'simulation' };
    }

    try {
      const response = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        {
          tx_ref: req.reference,
          amount: req.amount,
          currency: 'UGX',
          redirect_url: req.redirectUrl,
          customer: { email: req.email, phonenumber: req.phone, name: req.name },
          customizations: { title: 'NAVIGO Wallet Top-up', description: 'Add money to your NAVIGO wallet' },
        },
        { headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' } }
      );

      const link = response.data?.data?.link;
      if (!link) return { mode: 'gateway', error: 'Gateway did not return a checkout link' };
      return { mode: 'gateway', checkoutUrl: link };
    } catch (error: any) {
      console.error('Top-up initiation error:', error.response?.data || error.message);
      return { mode: 'gateway', error: error.response?.data?.message || 'Could not start payment' };
    }
  }

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
      const response = await axios.get(`https://api.flutterwave.com/v3/transactions/verify`, {
        params: { id: transactionId },
        headers: { Authorization: `Bearer ${this.secretKey}` }
      });

      const data = response.data.data;
      if (data.status === 'successful') {
        return {
          status: 'success',
          amount: data.amount,
          currency: data.currency,
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
   * Receiving Mobile Money is free in Uganda, so the driver gets exactly the
   * amount requested — the transfer fee is absorbed by NAVIGO.
   *
   * With FLUTTERWAVE_SECRET_KEY set: sends via the Flutterwave mobile-money
   * collection API (the driver approves a prompt on their phone).
   * Without it: returns 'manual' so the payout is queued for an admin to
   * process from the NAVIGO wallet (works from day one, no gateway needed).
   */
  async requestPayout(req: PayoutRequest): Promise<PayoutResponse> {
    if (!this.secretKey) {
      console.warn(`⚠️ No gateway key — payout ${req.reference} queued for manual admin processing.`);
      return { mode: 'manual', status: 'pending' };
    }

    try {
      const response = await axios.post(
        'https://api.flutterwave.com/v3/collections/collect',
        {
          amount: req.amount,
          currency: 'UGX',
          tx_ref: req.reference,
          name: req.name || 'NAVIGO Driver Payout',
          callback_url: `${process.env.PUBLIC_BACKEND_URL || ''}/api/wallet/payout/callback`,
          customizations: {
            metadata: {
              phone_number: req.phone,
              network: req.provider === 'mtn' ? 'mtn' : 'airtel',
              country_code: 'UG',
            },
          },
          duration: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
            'flw-Public-Key': process.env.FLUTTERWAVE_PUBLIC_KEY || '',
          },
        }
      );

      const data = response.data?.data;
      if (data && (data.status === 'successful' || data.status === 'pending' || data.status === 'processing')) {
        return { mode: 'gateway', status: 'processing', gatewayRef: data.reference || String(data.id) };
      }
      return { mode: 'gateway', status: 'failed', error: data?.status || 'Provider rejected the payout' };
    } catch (error: any) {
      console.error('Payout Error:', error.response?.data || error.message);
      return { mode: 'gateway', status: 'failed', error: error.response?.data?.message || 'Payout request failed' };
    }
  }
}

export const paymentService = new PaymentService();
