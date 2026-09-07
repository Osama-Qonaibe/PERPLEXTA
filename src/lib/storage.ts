import { Preferences } from '@capacitor/preferences';

const isNative = 
    typeof (window as any).Capacitor !== 'undefined' && 
    (window as any).Capacitor.isNativePlatform?.();

class SecureStorage {
    async set(key: string, value: string): Promise<void> {
        if (isNative) {
            await Preferences.set({ key, value });
        } else {
            localStorage.setItem(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        if (isNative) {
            const { value } = await Preferences.get({ key });
            return value;
        }
        return localStorage.getItem(key);
    }

    async remove(key: string): Promise<void> {
        if (isNative) {
            await Preferences.remove({ key });
        } else {
            localStorage.removeItem(key);
        }
    }

    // Synchronous fallback for legacy code that needs it
    getSync(key: string): string | null {
        if (!isNative) return localStorage.getItem(key);
        return null; // On native, must use async
    }
}

export const secureStorage = new SecureStorage();
