/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { PlayerProfile } from '../types/game';
import {
  ADMIN_EMAIL,
  ALL_PEN_IDS,
  ALL_SKIN_IDS,
  ALL_FLICK_STYLE_IDS,
} from '../data/initialData';
import { detectDevicePlatform } from '../utils/device';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: PlayerProfile | null;
  loading: boolean;
  isAdminUser: boolean;
  godModePower: number;
  setGodModePower: (power: number) => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateProfileData: (updater: (prev: PlayerProfile) => PlayerProfile) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_STARTER_PROFILE: PlayerProfile = {
  username: 'DeskStriker27',
  level: 1,
  xp: 0,
  xpNextLevel: 100,
  paperclips: 240,
  division: 10,
  divisionPoints: 20,
  totalWins: 0,
  totalMatches: 0,
  winStreak: 0,
  equippedPenId: 'bic_cristal',
  equippedSkinId: 'skin_bic_classic_blue',
  equippedFlickStyleId: 'style_classic_thumb',
  unlockedPens: ['bic_cristal', 'pilot_g2'],
  unlockedSkins: ['skin_bic_classic_blue', 'skin_g2_midnight'],
  unlockedFlickStyles: ['style_classic_thumb'],
  role: 'PLAYER',
  isAdmin: false,
  platform: detectDevicePlatform(),
  crossplaySetting: 'CROSSPLAY_ENABLED',
};

const getLocalProfile = (uid: string): PlayerProfile | null => {
  try {
    const raw = localStorage.getItem(`pfa27_profile_${uid}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading local profile cache:', err);
  }
  return null;
};

const saveLocalProfile = (uid: string, p: PlayerProfile) => {
  try {
    localStorage.setItem(`pfa27_profile_${uid}`, JSON.stringify(p));
  } catch (err) {
    console.warn('Error persisting local profile cache:', err);
  }
};

const getAdminProfile = (): PlayerProfile => ({
  username: 'Admin Developer (Sam)',
  level: 99,
  xp: 999999,
  xpNextLevel: 1000000,
  paperclips: 999999,
  division: 1,
  divisionPoints: 100,
  totalWins: 777,
  totalMatches: 777,
  winStreak: 777,
  equippedPenId: 'rotring_600',
  equippedSkinId: 'skin_rotring_gold',
  equippedFlickStyleId: 'style_knuckle_cannon',
  unlockedPens: [...ALL_PEN_IDS],
  unlockedSkins: [...ALL_SKIN_IDS],
  unlockedFlickStyles: [...ALL_FLICK_STYLE_IDS],
  role: 'ADMIN',
  isAdmin: true,
  platform: detectDevicePlatform(),
  crossplaySetting: 'CROSSPLAY_ENABLED',
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [godModePower, setGodModePower] = useState<number>(1.0);

  // Sync with Firestore profile and apply Admin elevation with full offline support
  const loadOrCreateUserProfile = async (firebaseUser: FirebaseUser) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const isTargetAdmin =
      firebaseUser.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

    // 1. Establish initial or cached profile immediately so UI is never blocked
    const cached = getLocalProfile(firebaseUser.uid);
    let activeProfile: PlayerProfile;

    if (cached) {
      activeProfile = cached;
      if (isTargetAdmin) {
        activeProfile.isAdmin = true;
        activeProfile.role = 'ADMIN';
        activeProfile.paperclips = Math.max(activeProfile.paperclips, 999999);
        activeProfile.level = Math.max(activeProfile.level, 99);
        activeProfile.xp = Math.max(activeProfile.xp, 999999);
        activeProfile.unlockedPens = [...ALL_PEN_IDS];
        activeProfile.unlockedSkins = [...ALL_SKIN_IDS];
        activeProfile.unlockedFlickStyles = [...ALL_FLICK_STYLE_IDS];
      }
    } else if (isTargetAdmin) {
      activeProfile = getAdminProfile();
    } else {
      activeProfile = {
        ...DEFAULT_STARTER_PROFILE,
        username: firebaseUser.displayName || 'DeskStriker27',
      };
    }

    setProfile(activeProfile);
    saveLocalProfile(firebaseUser.uid, activeProfile);

    // 2. Query Firestore and synchronize cloud data when online
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        const isAdmin = isTargetAdmin || data.isAdmin === true || data.role === 'ADMIN';

        const loadedProfile: PlayerProfile = {
          username: data.username || firebaseUser.displayName || (isAdmin ? 'Admin Developer (Sam)' : 'DeskFighter'),
          level: isAdmin ? Math.max(data.level || 1, 99) : (data.level || 1),
          xp: isAdmin ? Math.max(data.xp || 0, 999999) : (data.xp || 0),
          xpNextLevel: isAdmin ? 1000000 : (data.xpNextLevel || 100),
          paperclips: isAdmin ? Math.max(data.paperclips ?? 0, 999999) : (data.paperclips ?? 240),
          division: isAdmin ? 1 : (data.division || 10),
          divisionPoints: isAdmin ? 100 : (data.divisionPoints || 0),
          totalWins: isAdmin ? Math.max(data.totalWins || 0, 777) : (data.totalWins || 0),
          totalMatches: isAdmin ? Math.max(data.totalMatches || 0, 777) : (data.totalMatches || 0),
          winStreak: isAdmin ? Math.max(data.winStreak || 0, 777) : (data.winStreak || 0),
          equippedPenId: data.equippedPenId || (isAdmin ? 'rotring_600' : 'bic_cristal'),
          equippedSkinId: data.equippedSkinId || (isAdmin ? 'skin_rotring_gold' : 'skin_bic_classic_blue'),
          equippedFlickStyleId: data.equippedFlickStyleId || (isAdmin ? 'style_knuckle_cannon' : 'style_classic_thumb'),
          unlockedPens: isAdmin ? [...ALL_PEN_IDS] : (data.unlockedPens || ['bic_cristal', 'pilot_g2']),
          unlockedSkins: isAdmin ? [...ALL_SKIN_IDS] : (data.unlockedSkins || ['skin_bic_classic_blue']),
          unlockedFlickStyles: isAdmin ? [...ALL_FLICK_STYLE_IDS] : (data.unlockedFlickStyles || ['style_classic_thumb']),
          role: isAdmin ? 'ADMIN' : 'PLAYER',
          isAdmin: isAdmin,
          platform: data.platform || detectDevicePlatform(),
          crossplaySetting: data.crossplaySetting || 'CROSSPLAY_ENABLED',
        };

        setProfile(loadedProfile);
        saveLocalProfile(firebaseUser.uid, loadedProfile);

        // If target admin, ensure cloud doc is synchronized with admin status
        if (isAdmin && (!data.isAdmin || (data.paperclips ?? 0) < 999999 || (data.unlockedPens?.length || 0) < ALL_PEN_IDS.length)) {
          try {
            await setDoc(
              userDocRef,
              {
                userId: firebaseUser.uid,
                email: firebaseUser.email || ADMIN_EMAIL,
                username: loadedProfile.username,
                level: loadedProfile.level,
                xp: loadedProfile.xp,
                xpNextLevel: loadedProfile.xpNextLevel,
                paperclips: loadedProfile.paperclips,
                division: loadedProfile.division,
                divisionPoints: loadedProfile.divisionPoints,
                totalWins: loadedProfile.totalWins,
                totalMatches: loadedProfile.totalMatches,
                winStreak: loadedProfile.winStreak,
                equippedPenId: loadedProfile.equippedPenId,
                equippedSkinId: loadedProfile.equippedSkinId,
                equippedFlickStyleId: loadedProfile.equippedFlickStyleId,
                unlockedPens: loadedProfile.unlockedPens,
                unlockedSkins: loadedProfile.unlockedSkins,
                unlockedFlickStyles: loadedProfile.unlockedFlickStyles,
                role: 'ADMIN',
                isAdmin: true,
                platform: loadedProfile.platform,
                crossplaySetting: loadedProfile.crossplaySetting,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (syncErr) {
            console.warn('Admin status cloud sync pending online connection:', syncErr);
          }
        }
      } else {
        // Create initial cloud account profile
        const initialProfile: PlayerProfile = isTargetAdmin ? getAdminProfile() : {
          ...DEFAULT_STARTER_PROFILE,
          username: firebaseUser.displayName || 'DeskStriker27',
        };

        setProfile(initialProfile);
        saveLocalProfile(firebaseUser.uid, initialProfile);

        try {
          await setDoc(userDocRef, {
            userId: firebaseUser.uid,
            email: firebaseUser.email || '',
            username: initialProfile.username,
            level: initialProfile.level,
            xp: initialProfile.xp,
            xpNextLevel: initialProfile.xpNextLevel,
            paperclips: initialProfile.paperclips,
            division: initialProfile.division,
            divisionPoints: initialProfile.divisionPoints,
            totalWins: initialProfile.totalWins,
            totalMatches: initialProfile.totalMatches,
            winStreak: initialProfile.winStreak,
            equippedPenId: initialProfile.equippedPenId,
            equippedSkinId: initialProfile.equippedSkinId,
            equippedFlickStyleId: initialProfile.equippedFlickStyleId,
            unlockedPens: initialProfile.unlockedPens,
            unlockedSkins: initialProfile.unlockedSkins,
            unlockedFlickStyles: initialProfile.unlockedFlickStyles,
            role: initialProfile.role,
            isAdmin: initialProfile.isAdmin,
            platform: initialProfile.platform,
            crossplaySetting: initialProfile.crossplaySetting,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (createErr) {
          console.warn('Initial cloud profile creation pending online connection:', createErr);
        }
      }
    } catch (err: any) {
      console.warn('Firestore offline or auth token pending, continuing with local profile:', err?.message || err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      try {
        if (currentUser) {
          await loadOrCreateUserProfile(currentUser);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.warn('Auth state subscription error handled:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await loadOrCreateUserProfile(result.user);
      }
    } catch (err) {
      console.error('Sign in failed:', err);
      throw err;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const updateProfileData = async (updater: (prev: PlayerProfile) => PlayerProfile) => {
    if (!user || !profile) return;
    const newProfile = updater(profile);
    setProfile(newProfile);
    saveLocalProfile(user.uid, newProfile);

    // Sync to Firestore in background
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(
        userDocRef,
        {
          userId: user.uid,
          email: user.email || '',
          username: newProfile.username,
          level: newProfile.level,
          xp: newProfile.xp,
          xpNextLevel: newProfile.xpNextLevel,
          paperclips: newProfile.paperclips,
          division: newProfile.division,
          divisionPoints: newProfile.divisionPoints,
          totalWins: newProfile.totalWins,
          totalMatches: newProfile.totalMatches,
          winStreak: newProfile.winStreak,
          equippedPenId: newProfile.equippedPenId,
          equippedSkinId: newProfile.equippedSkinId,
          equippedFlickStyleId: newProfile.equippedFlickStyleId,
          unlockedPens: newProfile.unlockedPens,
          unlockedSkins: newProfile.unlockedSkins,
          unlockedFlickStyles: newProfile.unlockedFlickStyles,
          role: newProfile.role || 'PLAYER',
          isAdmin: Boolean(newProfile.isAdmin),
          platform: newProfile.platform,
          crossplaySetting: newProfile.crossplaySetting,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err: any) {
      console.warn('Profile cloud sync pending online reconnect:', err?.message || err);
    }
  };

  const isAdminUser = Boolean(
    profile?.isAdmin ||
    profile?.role === 'ADMIN' ||
    user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdminUser,
        godModePower,
        setGodModePower,
        signInWithGoogle,
        signOutUser,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
