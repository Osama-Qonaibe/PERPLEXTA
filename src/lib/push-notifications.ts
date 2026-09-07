import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import api from './axios'; // Existing configured axios instance

export async function initPushNotifications() {
    if (!Capacitor.isNativePlatform()) {
        console.log('[PUSH] Web platform detected, skipping Capacitor push registration.');
        return;
    }

    try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            console.warn('[PUSH] User denied push notification permissions.');
            return;
        }

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
            console.log('[PUSH] Registration token:', token.value);
            try {
                await api.post('/push/register', {
                    token: token.value,
                    platform: Capacitor.getPlatform(),
                    deviceName: 'Mobile Device', // You can enrich this with Device plugin if needed
                    appVersion: '1.0.0'
                });
                console.log('[PUSH] Token registered with backend.');
            } catch (error) {
                console.error('[PUSH] Failed to register token with backend', error);
            }
        });

        PushNotifications.addListener('registrationError', (error) => {
            console.error('[PUSH] Error on registration:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('[PUSH] Push received:', notification);
            // Example: Dispatch event for in-app toast if desired
            window.dispatchEvent(new CustomEvent('native-push-received', { detail: notification }));
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('[PUSH] Push action performed:', notification);
            const data = notification.notification.data;
            if (data?.type === 'new_message' && data.conversationId) {
                window.location.href = `/bulletin/inquiries/${data.conversationId}`;
            }
        });

    } catch (error) {
        console.error('[PUSH] Initialization error:', error);
    }
}
