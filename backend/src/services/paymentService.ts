import axios from 'axios';

interface PaymentVerificationResponse {
  status: 'success' | 'failed';
  amount?: number;
  currency?: string;
  tx_ref?: string;
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
}

export const paymentService = new PaymentService();
