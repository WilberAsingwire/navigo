import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getDB } from '../config/database';

type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

let firebaseReady = false;
let firebaseChecked = false;

const getFirebaseMessaging = () => {
  if (!firebaseChecked) {
    firebaseChecked = true;
    const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!rawCredentials) {
      console.warn('FCM is disabled: FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
      return null;
    }

    try {
      const credentials = JSON.parse(rawCredentials);
      if (!credentials.project_id || !credentials.client_email || !credentials.private_key) {
        throw new Error('Service account JSON is missing required fields.');
      }
      if (getApps().length === 0) {
        initializeApp({ credential: cert({
          projectId: credentials.project_id,
          clientEmail: credentials.client_email,
          privateKey: String(credentials.private_key).replace(/\\n/g, '\n'),
        }) });
      }
      firebaseReady = true;
    } catch (error) {
      console.error('FCM initialization failed. Check FIREBASE_SERVICE_ACCOUNT_JSON:', error instanceof Error ? error.message : 'Invalid credentials');
      return null;
    }
  }

  return firebaseReady ? getMessaging() : null;
};

/**
 * Send a push notification to every registered device for one NAVIGO account.
 * Push delivery is best-effort: it must never break a ride/booking operation.
 */
export const sendPushToUser = async (userId: string | null | undefined, message: PushMessage): Promise<void> => {
  if (!userId) return;

  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    const db = getDB();
    const devices = await db.all('SELECT token FROM device_tokens WHERE userId = ?', [userId]);
    const tokenValues: string[] = (devices || [])
      .map((device: any): string => String(device.token || ''))
      .filter((token: string) => token.length > 0);
    const tokens: string[] = Array.from(new Set<string>(tokenValues));
    if (tokens.length === 0) return;

    const data = Object.fromEntries(
      Object.entries(message.data || {}).map(([key, value]) => [key, String(value)])
    );

    // FCM multicast requests support at most 500 registration tokens.
    for (let offset = 0; offset < tokens.length; offset += 500) {
      const batch = tokens.slice(offset, offset + 500);
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: message.title, body: message.body },
        data,
        android: { priority: 'high', notification: { channelId: 'default' } },
      });

      const invalidTokens = result.responses
        .map((response, index) => ({ response, token: batch[index] }))
        .filter(({ response }) => !response.success && (
          response.error?.code === 'messaging/registration-token-not-registered' ||
          response.error?.code === 'messaging/invalid-registration-token'
        ))
        .map(({ token }) => token);

      if (invalidTokens.length > 0) {
        await db.run('DELETE FROM device_tokens WHERE token = ANY(?)', [invalidTokens]);
      }
    }
  } catch (error) {
    console.error('Push notification delivery failed:', error instanceof Error ? error.message : 'Unknown FCM error');
  }
};
