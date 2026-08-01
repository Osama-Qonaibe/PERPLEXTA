import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';

// Configure Google Auth Provider with requested Google Contacts (People API) scopes
export const googleProvider = new GoogleAuthProvider();

const scopes = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/directory.readonly',
  'https://www.googleapis.com/auth/user.addresses.read',
  'https://www.googleapis.com/auth/user.birthday.read',
  'https://www.googleapis.com/auth/user.emails.read',
  'https://www.googleapis.com/auth/user.gender.read',
  'https://www.googleapis.com/auth/user.organization.read',
  'https://www.googleapis.com/auth/user.phonenumbers.read'
];

scopes.forEach(scope => googleProvider.addScope(scope));

// Enable prompt to select account on every sign-in
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Cache the access token in memory (never localStorage / sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initializer for auth state listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // If we already have the token cached, trigger success
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Auth state is active but token is absent from memory cache (e.g. page refresh)
        // We'll set cachedAccessToken to null and require a quick sign-in to refresh
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google Sign-In.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[GoogleAuth] Sign-in failed:', error);
    
    const isInIframe = window.self !== window.top;
    if (error.code === 'auth/internal-error' || error.code === 'auth/popup-blocked') {
      if (isInIframe) {
        error.message = 'Sign-in failed due to iframe restrictions. Please try opening the app in a new tab.';
      }
    }
    
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Get the current token
export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Set token manually (useful when syncing or storing in transient states)
export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Log out Google integration
export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
