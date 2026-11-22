/**
 * CareBridge Mobile Authentication Context
 * Production Firebase Authentication with Firestore profile sync,
 * AsyncStorage session persistence, and role-based authorization.
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db, isFirebaseConfigured } from '../configuration/firebase';
import { dataStore } from '../services/dataService';
import type { UserProfile, UserRole } from '../types';

const DIRECTORY_ROLES: UserRole[] = ['hospital', 'bloodBank', 'oxygenProvider', 'ambulanceProvider', 'doctor'];
const CACHED_USER_KEY = 'carebridge_cached_user';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  activeRole: UserRole | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (params: {
    email: string;
    pass: string;
    displayName: string;
    role: Exclude<UserRole, 'admin'>; // Security: Never allow public registration as admin
    phone?: string;
    city?: string;
    hospitalAffiliation?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const fetchUserProfileFromFirestore = async (uid: string): Promise<{ profile: UserProfile | null; error?: string }> => {
  if (!isFirebaseConfigured || !db) {
    const local = dataStore.getUser(uid);
    return { profile: local || null };
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      return {
        profile: {
          ...data,
          uid: data.uid || uid,
        }
      };
    }
    return { profile: null };
  } catch (err: any) {
    console.error('[CareBridge Auth] Error fetching profile:', err);
    return { profile: null, error: err?.message || 'Failed to fetch user profile' };
  }
};

const syncProviderDirectory = async (profile: UserProfile) => {
  if (!isFirebaseConfigured || !db || !DIRECTORY_ROLES.includes(profile.role)) return;

  try {
    await setDoc(
      doc(db, 'providerDirectory', profile.uid),
      {
        uid: profile.uid,
        role: profile.role,
        displayName: profile.displayName,
        city: profile.city || 'Hubballi',
        hospitalAffiliation: profile.hospitalAffiliation || '',
        isVerified: profile.isVerified,
        isActive: profile.isActive,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    if (profile.role === 'oxygenProvider' || (profile.role as any) === 'oxygenDepot') {
      const oxySnap = await getDoc(doc(db, 'oxygenProfiles', profile.uid));
      if (!oxySnap.exists()) {
        await setDoc(doc(db, 'oxygenProfiles', profile.uid), {
          uid: profile.uid,
          providerName: profile.displayName,
          registrationNumber: 'OXY-' + Date.now().toString().slice(-6),
          cylindersAvailable: 0,
          concentratorsAvailable: 0,
          deliveryAvailable: true,
          contactNumber: profile.phone || '+91 800 000 0000',
          city: profile.city || 'Hubballi',
          state: 'Karnataka',
          address: profile.address || 'Oxygen Depot Address',
          isVerified: Boolean(profile.isVerified),
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      } else {
        const d = oxySnap.data();
        if (d && (d.cylindersAvailable == null || d.concentratorsAvailable == null)) {
          await setDoc(doc(db, 'oxygenProfiles', profile.uid), {
            cylindersAvailable: typeof d.cylindersAvailable === 'number' && !isNaN(d.cylindersAvailable) ? d.cylindersAvailable : 0,
            concentratorsAvailable: typeof d.concentratorsAvailable === 'number' && !isNaN(d.concentratorsAvailable) ? d.concentratorsAvailable : 0,
          }, { merge: true });
        }
      }
    } else if (profile.role === 'hospital') {
      const hospSnap = await getDoc(doc(db, 'hospitalProfiles', profile.uid));
      if (!hospSnap.exists()) {
        await setDoc(doc(db, 'hospitalProfiles', profile.uid), {
          uid: profile.uid,
          hospitalName: profile.displayName,
          registrationNumber: 'REG-' + Date.now().toString().slice(-6),
          departments: ['Emergency Trauma', 'General Medicine'],
          totalBeds: 50,
          availableBeds: 0,
          totalICU: 10,
          availableICU: 0,
          totalVentilators: 5,
          availableVentilators: 0,
          contactNumber: profile.phone || '+91 800 000 0000',
          operatingHours: '24/7',
          city: profile.city || 'Hubballi',
          state: 'Karnataka',
          address: profile.address || 'Medical Facility Address',
          isVerified: Boolean(profile.isVerified),
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }
    } else if (profile.role === 'bloodBank') {
      const bbSnap = await getDoc(doc(db, 'bloodBankProfiles', profile.uid));
      if (!bbSnap.exists()) {
        await setDoc(doc(db, 'bloodBankProfiles', profile.uid), {
          uid: profile.uid,
          bankName: profile.displayName,
          registrationNumber: 'BB-' + Date.now().toString().slice(-6),
          inventory: { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 },
          contactNumber: profile.phone || '+91 800 000 0000',
          operatingHours: '24/7',
          city: profile.city || 'Hubballi',
          state: 'Karnataka',
          address: profile.address || 'Blood Bank Center Address',
          isVerified: Boolean(profile.isVerified),
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }
    } else if (profile.role === 'ambulanceProvider') {
      const ambSnap = await getDoc(doc(db, 'ambulanceProfiles', profile.uid));
      if (!ambSnap.exists()) {
        await setDoc(doc(db, 'ambulanceProfiles', profile.uid), {
          uid: profile.uid,
          providerName: profile.displayName,
          registrationNumber: 'AMB-' + Date.now().toString().slice(-6),
          vehicles: [],
          totalVehicles: 0,
          availableVehicles: 0,
          contactNumber: profile.phone || '+91 800 000 0000',
          city: profile.city || 'Hubballi',
          state: 'Karnataka',
          address: profile.address || 'Ambulance Station Address',
          isVerified: Boolean(profile.isVerified),
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }
    }
  } catch (e) {
    console.warn('[CareBridge Auth] Directory sync note:', e);
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore cached session on mount
  useEffect(() => {
    const restoreCachedSession = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHED_USER_KEY);
        if (cached) {
          const user = JSON.parse(cached);
          setCurrentUser(user);
        }
      } catch (e) {
        console.warn('[CareBridge Auth] Session restore warning:', e);
      }
    };
    restoreCachedSession();
  }, []);

  // Listen to Firebase Auth state change
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const { profile, error: resolutionError } = await fetchUserProfileFromFirestore(fbUser.uid);

          if (resolutionError) {
            setError(resolutionError);
            setCurrentUser(null);
            await AsyncStorage.removeItem(CACHED_USER_KEY);
            setLoading(false);
            return;
          }

          if (profile) {
            if (!profile.isActive) {
              setError('This account has been suspended by the administrator.');
              await signOut(auth);
              setCurrentUser(null);
              await AsyncStorage.removeItem(CACHED_USER_KEY);
              setLoading(false);
              return;
            }

            // Sync provider directory if healthcare provider
            await syncProviderDirectory(profile);

            setError(null);
            setCurrentUser(profile);
            await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(profile));
          } else {
            // Check if admin login fallback
            if (fbUser.email?.toLowerCase() === 'admin123@gmail.com') {
              const adminProf: UserProfile = {
                uid: fbUser.uid,
                email: 'admin123@gmail.com',
                displayName: 'CareBridge Administrator',
                role: 'admin',
                phone: '+91 80 4000 8000',
                city: 'Hubballi',
                state: 'Karnataka',
                address: 'CareBridge Command Center, Vidyanagar, Hubballi',
                isVerified: true,
                isActive: true,
                profileComplete: true,
                createdAt: '2026-11-01T08:00:00Z',
                updatedAt: '2026-11-08T10:00:00Z'
              };
              setCurrentUser(adminProf);
              await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(adminProf));
            } else {
              setError('Account profile not found in database. Contact administrator.');
              setCurrentUser(null);
              await AsyncStorage.removeItem(CACHED_USER_KEY);
            }
          }
        } catch (e: any) {
          setError(e?.message || 'Error resolving user profile.');
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        await AsyncStorage.removeItem(CACHED_USER_KEY);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim();
      if (isFirebaseConfigured && auth) {
        const cred = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
        setFirebaseUser(cred.user);

        const { profile, error: resolutionError } = await fetchUserProfileFromFirestore(cred.user.uid);

        if (resolutionError) {
          setError(resolutionError);
          await signOut(auth);
          setCurrentUser(null);
          return false;
        }

        let userProfile = profile;
        if (!userProfile && normalizedEmail.toLowerCase() === 'admin123@gmail.com') {
          userProfile = {
            uid: cred.user.uid,
            email: 'admin123@gmail.com',
            displayName: 'CareBridge Administrator',
            role: 'admin',
            phone: '+91 80 4000 8000',
            city: 'Hubballi',
            state: 'Karnataka',
            address: 'CareBridge Command Center, Vidyanagar, Hubballi',
            isVerified: true,
            isActive: true,
            profileComplete: true,
            createdAt: '2026-11-01T08:00:00Z',
            updatedAt: '2026-11-08T10:00:00Z'
          };
          if (db) {
            await setDoc(doc(db, 'users', cred.user.uid), userProfile, { merge: true });
          }
        }

        if (!userProfile) {
          setError('Account profile not found in database. Please contact an administrator.');
          await signOut(auth);
          setCurrentUser(null);
          return false;
        }

        if (!userProfile.isActive) {
          setError('This account has been suspended by the administrator.');
          await signOut(auth);
          setCurrentUser(null);
          return false;
        }

        await syncProviderDirectory(userProfile);

        setError(null);
        setCurrentUser(userProfile);
        await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(userProfile));
        return true;
      }

      setError('Firebase authentication service is unavailable.');
      return false;
    } catch (err: any) {
      console.error('[CareBridge Auth] Login error:', err);
      let msg = 'Failed to sign in. Please verify your credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email address or password.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please reset your password or try again later.';
      } else if (err.code === 'auth/user-disabled') {
        msg = 'This user account has been disabled.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (params: {
    email: string;
    pass: string;
    displayName: string;
    role: Exclude<UserRole, 'admin'>;
    phone?: string;
    city?: string;
    hospitalAffiliation?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);

    try {
      // Security: Strictly forbid admin signup
      if ((params.role as string) === 'admin') {
        throw new Error('Administrative accounts cannot be registered publicly.');
      }

      if (!isFirebaseConfigured || !auth || !db) {
        throw new Error('Database connection is not configured.');
      }

      const cred = await createUserWithEmailAndPassword(auth, params.email.trim(), params.pass);
      const uid = cred.user.uid;
      setFirebaseUser(cred.user);

      try {
        await updateFirebaseProfile(cred.user, { displayName: params.displayName.trim() });
      } catch (e) {}

      const isHealthcareProvider = DIRECTORY_ROLES.includes(params.role);

      const newProfile: UserProfile = {
        uid,
        email: params.email.trim().toLowerCase(),
        displayName: params.displayName.trim(),
        role: params.role,
        phone: params.phone?.trim() || '',
        city: params.city?.trim() || 'Hubballi',
        state: 'Karnataka',
        isVerified: !isHealthcareProvider, // Providers require administrator verification
        isActive: true,
        profileComplete: true,
        hospitalAffiliation: params.hospitalAffiliation?.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore `users/{uid}`
      await setDoc(doc(db, 'users', uid), newProfile);

      // Save to provider directory if healthcare provider
      if (isHealthcareProvider) {
        await setDoc(doc(db, 'providerDirectory', uid), {
          uid,
          role: params.role,
          displayName: params.displayName.trim(),
          city: params.city?.trim() || 'Hubballi',
          state: 'Karnataka',
          hospitalAffiliation: params.hospitalAffiliation?.trim() || '',
          isVerified: false,
          isActive: true,
          updatedAt: new Date().toISOString()
        });

        // Initialize resource provider profiles in Firestore with initial stock 0 (if un-updated)
        try {
          if (params.role === 'hospital') {
            await setDoc(doc(db, 'hospitalProfiles', uid), {
              uid,
              hospitalName: params.displayName.trim(),
              registrationNumber: 'REG-' + Date.now().toString().slice(-6),
              departments: ['Emergency Trauma', 'General Medicine'],
              totalBeds: 50,
              availableBeds: 0,
              totalICU: 10,
              availableICU: 0,
              totalVentilators: 5,
              availableVentilators: 0,
              contactNumber: params.phone?.trim() || '+91 800 000 0000',
              operatingHours: '24/7',
              city: params.city?.trim() || 'Hubballi',
              state: 'Karnataka',
              address: 'Medical Facility Address',
              isVerified: false,
              lastUpdated: new Date().toISOString()
            }, { merge: true });
          } else if (params.role === 'bloodBank') {
            await setDoc(doc(db, 'bloodBankProfiles', uid), {
              uid,
              bankName: params.displayName.trim(),
              registrationNumber: 'BB-' + Date.now().toString().slice(-6),
              inventory: { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 },
              contactNumber: params.phone?.trim() || '+91 800 000 0000',
              operatingHours: '24/7',
              city: params.city?.trim() || 'Hubballi',
              state: 'Karnataka',
              address: 'Blood Bank Center Address',
              isVerified: false,
              lastUpdated: new Date().toISOString()
            }, { merge: true });
          } else if (params.role === 'oxygenProvider' || (params.role as any) === 'oxygenDepot') {
            await setDoc(doc(db, 'oxygenProfiles', uid), {
              uid,
              providerName: params.displayName.trim(),
              registrationNumber: 'OXY-' + Date.now().toString().slice(-6),
              cylindersAvailable: 0,
              concentratorsAvailable: 0,
              deliveryAvailable: true,
              contactNumber: params.phone?.trim() || '+91 800 000 0000',
              city: params.city?.trim() || 'Hubballi',
              state: 'Karnataka',
              address: 'Oxygen Depot Address',
              isVerified: false,
              lastUpdated: new Date().toISOString()
            }, { merge: true });
          } else if (params.role === 'ambulanceProvider') {
            await setDoc(doc(db, 'ambulanceProfiles', uid), {
              uid,
              providerName: params.displayName.trim(),
              registrationNumber: 'AMB-' + Date.now().toString().slice(-6),
              vehicles: [],
              totalVehicles: 0,
              availableVehicles: 0,
              contactNumber: params.phone?.trim() || '+91 800 000 0000',
              city: params.city?.trim() || 'Hubballi',
              state: 'Karnataka',
              address: 'Ambulance Station Address',
              isVerified: false,
              lastUpdated: new Date().toISOString()
            }, { merge: true });
          }
        } catch (initErr) {
          console.warn('[CareBridge Auth] Provider initial profile creation note:', initErr);
        }
      }

      setError(null);
      setCurrentUser(newProfile);
      await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(newProfile));
      return { success: true };
    } catch (err: any) {
      console.error('[CareBridge Auth] Signup error:', err);
      let msg = err.message || 'Failed to create account.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please choose at least 6 characters.';
      }
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isFirebaseConfigured && auth) {
        await sendPasswordResetEmail(auth, email.trim());
        return { success: true };
      }
      return { success: false, error: 'Firebase Auth is not configured.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send reset email.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn('[CareBridge Auth] Logout error:', e);
    }
    setCurrentUser(null);
    setFirebaseUser(null);
    await AsyncStorage.removeItem(CACHED_USER_KEY);
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates, updatedAt: new Date().toISOString() };
    setCurrentUser(updated);
    await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(updated));

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
      } catch (e) {
        console.warn('[CareBridge Auth] Profile update error:', e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        activeRole: currentUser?.role || null,
        isAuthenticated: Boolean(currentUser),
        loading,
        error,
        login,
        signup,
        resetPassword,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
