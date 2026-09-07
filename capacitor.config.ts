import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.perplexta.app',
    appName: 'perplexta',
    webDir: 'dist',
    plugins: {
        PushNotifications: {
            presentationOptions: ["badge", "sound", "alert"]
        }
    }
};

export default config;
