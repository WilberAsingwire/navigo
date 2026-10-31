import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from './api';

let currentDeviceToken: string | null = null;

const noop = () => undefined;

/**
 * Register the native Android app with FCM and associate the token with the
 * currently authenticated NAVIGO account. Web/PWA sessions are not registered
 * through this native service.
 */
export const startPushNotificationRegistration = async (): Promise<() => void> => {
  if (Capacitor.getPlatform() !== 'android') return noop;

  const listeners: PluginListenerHandle[] = [];
  let active = true;

  const cleanup = () => {
    if (!active) return;
    active = false;
    for (const listener of listeners) {
      void listener.remove().catch(() => undefined);
    }
  };

  try {
    listeners.push(await PushNotifications.addListener('registration', ({ value }) => {
      if (!active) return;

      currentDeviceToken = value;
      // The API interceptor attaches the authenticated NAVIGO JWT.
      // Never log or expose the FCM token in application logs.
      void api.post('/notifications/register-device', {
        token: value,
        platform: 'android'
      }).catch(() => {
        console.warn('NAVIGO could not save this device for push notifications.');
      });
    }));

    listeners.push(await PushNotifications.addListener('registrationError', () => {
      console.warn('NAVIGO Android push registration failed.');
    }));

    listeners.push(await PushNotifications.addListener('pushNotificationReceived', notification => {
      window.dispatchEvent(new CustomEvent('navigo:push-received', {
        detail: {
          title: notification.title,
          body: notification.body,
          data: notification.data
        }
      }));
    }));

    listeners.push(await PushNotifications.addListener('pushNotificationActionPerformed', action => {
      window.dispatchEvent(new CustomEvent('navigo:push-opened', {
        detail: {
          actionId: action.actionId,
          data: action.notification.data
        }
      }));
    }));

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== 'granted') {
      cleanup();
      return noop;
    }

    await PushNotifications.register();
    return cleanup;
  } catch {
    cleanup();
    console.warn('NAVIGO push notifications could not be initialized on this device.');
    return noop;
  }
};

/**
 * Best-effort logout cleanup. The explicit Authorization header is important:
 * AuthContext removes the local JWT immediately after starting this request.
 */
export const unregisterCurrentPushDevice = async (authToken: string | null): Promise<void> => {
  if (Capacitor.getPlatform() !== 'android') return;

  const token = currentDeviceToken;
  currentDeviceToken = null;

  if (token && authToken) {
    try {
      await api.delete('/notifications/unregister-device', {
        data: { token },
        headers: { Authorization: `Bearer ${authToken}` }
      });
    } catch {
      console.warn('NAVIGO could not remove the device registration during logout.');
    }
  }

  try {
    await PushNotifications.unregister();
  } catch {
    // The device may not have completed FCM registration yet.
  }
};
