// NAVIGO Payment Service
// Supports: MTN Mobile Money, Airtel Money, Cash, Card

const MTN_API_URL = 'https://sandbox.momodeveloper.mtn.com';
const AIRTEL_API_URL = 'https://openapi.airtel.africa';

interface PaymentRequest {
  amount: number;
  phone: string;
  provider: 'mtn' | 'airtel';
  reference: string;
  currency?: string;
}

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  status: 'pending' | 'completed' | 'failed';
}

// Get API keys from environment variables
const getMTNConfig = () => ({
  baseURL: MTN_API_URL,
  apiKey: import.meta.env.VITE_MTN_API_KEY || '',
  subscriptionKey: import.meta.env.VITE_MTN_SUBSCRIPTION_KEY || '',
  targetEnvironment: 'sandbox',
});

const getAirtelConfig = () => ({
  baseURL: AIRTEL_API_URL,
  clientId: import.meta.env.VITE_AIRTEL_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_AIRTEL_CLIENT_SECRET || '',
});

// Generate unique reference
const generateReference = (): string => {
  return `NAVIGO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

// MTN Mobile Money Payment
export const payWithMTN = async (request: PaymentRequest): Promise<PaymentResponse> => {
  const config = getMTNConfig();
  
  try {
    // Step 1: Get auth token
    const authToken = btoa(`${config.apiKey}:${config.subscriptionKey}`);
    
    // Step 2: Create API user (only needed once in production)
    // const userId = await createMTNApiUser(config);
    
    // Step 3: Request payment
    const paymentData = {
      amount: request.amount.toString(),
      currency: request.currency || 'UGX',
      externalId: request.reference || generateReference(),
      payer: {
        partyIdType: 'MSISDN',
        partyId: request.phone.replace('+256', '0'),
      },
      payerMessage: 'NAVIGO Ride Payment',
      payeeNote: `Payment for ride ${request.reference}`,
    };

    // In production, call MTN API:
    // const response = await axios.post(`${config.baseURL}/collection/v1_0/requesttopay`, paymentData, {
    //   headers: {
    //     'Authorization': `Bearer ${authToken}`,
    //     'X-Target-Environment': config.targetEnvironment,
    //     'Ocp-Apim-Subscription-Key': config.subscriptionKey,
    //   }
    // });

    // Simulate MTN response for development
    console.log('📱 MTN Payment Request:', paymentData);
    
    // Simulate successful payment
    return {
      success: true,
      transactionId: `MTN-${Date.now()}`,
      message: 'Payment request sent. Check your phone to confirm.',
      status: 'pending',
    };
  } catch (error: any) {
    console.error('MTN Payment Error:', error);
    return {
      success: false,
      message: error.message || 'MTN payment failed. Please try again.',
      status: 'failed',
    };
  }
};

// Airtel Money Payment
export const payWithAirtel = async (request: PaymentRequest): Promise<PaymentResponse> => {
  const config = getAirtelConfig();
  
  try {
    const paymentData = {
      reference: request.reference || generateReference(),
      subscriber: {
        country: 'UG',
        currency: request.currency || 'UGX',
        msisdn: request.phone.replace('+256', '0'),
      },
      transaction: {
        amount: request.amount,
        country: 'UG',
        currency: request.currency || 'UGX',
        id: request.reference || generateReference(),
      },
    };

    // In production, call Airtel API:
    // const response = await axios.post(`${config.baseURL}/merchant/v2/payments/`, paymentData, {
    //   headers: {
    //     'X-AirTel-Client-Id': config.clientId,
    //     'X-AirTel-Client-Secret': config.clientSecret,
    //   }
    // });

    console.log('📱 Airtel Payment Request:', paymentData);
    
    return {
      success: true,
      transactionId: `AIRTEL-${Date.now()}`,
      message: 'Payment request sent. Check your phone for the prompt.',
      status: 'pending',
    };
  } catch (error: any) {
    console.error('Airtel Payment Error:', error);
    return {
      success: false,
      message: error.message || 'Airtel payment failed. Please try again.',
      status: 'failed',
    };
  }
};

// Check payment status
export const checkPaymentStatus = async (transactionId: string, provider: 'mtn' | 'airtel'): Promise<PaymentResponse> => {
  // In production, poll the API to check if payment was completed
  console.log(`Checking ${provider} payment status for: ${transactionId}`);
  
  // Simulate successful payment after 3 seconds
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        transactionId,
        message: 'Payment confirmed! ✅',
        status: 'completed',
      });
    }, 3000);
  });
};

// Process payment (unified interface)
export const processPayment = async (
  amount: number,
  phone: string,
  provider: 'mtn' | 'airtel' | 'cash' | 'card'
): Promise<PaymentResponse> => {
  const reference = generateReference();
  
  if (provider === 'cash') {
    return {
      success: true,
      transactionId: `CASH-${Date.now()}`,
      message: 'Cash payment recorded. Please pay the driver directly.',
      status: 'pending',
    };
  }
  
  if (provider === 'card') {
    return {
      success: true,
      transactionId: `CARD-${Date.now()}`,
      message: 'Card payment processed.',
      status: 'completed',
    };
  }
  
  const request: PaymentRequest = { amount, phone, provider, reference };
  
  if (provider === 'mtn') {
    return payWithMTN(request);
  }
  
  return payWithAirtel(request);
};