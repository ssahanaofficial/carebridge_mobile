/**
 * CareBridge Mobile Firebase Configuration
 * Integrates directly with the existing production Firebase project: carebridge-90059.
 * Utilizes AsyncStorage for persistent mobile authentication across restarts.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import * as authModule from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: "AIzaSyApkiHky4bg0nr5JM9LYtUsEzpezIzKYS4",
  authDomain: "carebridge-90059.firebaseapp.com",
  projectId: "carebridge-90059",
  storageBucket: "carebridge-90059.firebasestorage.app",
  messagingSenderId: "42774262694",
  appId: "1:42774262694:web:547da2b598b8ada7f1d567",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('your_api_key')
);

let app: FirebaseApp;
let auth: authModule.Auth;
let db: Firestore;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    const getPersistence = (authModule as any).getReactNativePersistence;
    auth = authModule.initializeAuth(app, {
      persistence: getPersistence ? getPersistence(AsyncStorage) : undefined,
    });
  } else {
    app = getApp();
    auth = authModule.getAuth(app);
  }

  db = getFirestore(app);
  console.log('[CareBridge Mobile] Firebase initialized with project ID:', firebaseConfig.projectId);
} catch (error) {
  console.error('[CareBridge Mobile] Firebase initialization error:', error);
  // Fallback for safety
  app = getApps()[0] || initializeApp(firebaseConfig);
  try {
    auth = authModule.getAuth(app);
  } catch (e) {
    const getPersistence = (authModule as any).getReactNativePersistence;
    auth = authModule.initializeAuth(app, {
      persistence: getPersistence ? getPersistence(AsyncStorage) : undefined,
    });
  }
  db = getFirestore(app);
}

export { app, auth, db };
export default app;
