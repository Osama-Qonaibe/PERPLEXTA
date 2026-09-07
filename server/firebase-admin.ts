import { getApps, initializeApp, cert } from 'firebase-admin/app';
import fs from 'fs';
import path from 'path';

// Load service account from environment or file
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccount = serviceAccountPath 
    ? JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
    : {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };

if (!getApps().length && serviceAccount.projectId) {
    try {
        initializeApp({
            credential: cert(serviceAccount)
        });
        console.log('[PUSH] Firebase Admin initialized successfully.');
    } catch (error) {
        console.error('[PUSH] Firebase Admin initialization failed:', error);
    }
}


