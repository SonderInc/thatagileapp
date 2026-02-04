/**
 * Firebase Auth implementation of IAuth.
 * All firebase/auth imports are confined to this file and lib/firebase.
 */
import {
  onAuthStateChanged as fbOnAuthStateChanged,
  signInWithEmailAndPassword as fbSignIn,
  signInWithCustomToken as fbSignInWithCustomToken,
  createUserWithEmailAndPassword as fbCreateUser,
  updateProfile as fbUpdateProfile,
  updatePassword as fbUpdatePassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import type { IAuth } from './IAuth';
import type { AuthUser } from '../types';

function toAuthUser(user: { uid: string; email: string | null; displayName: string | null }): AuthUser {
  return { uid: user.uid, email: user.email ?? null, displayName: user.displayName ?? null };
}

export const FirebaseAuthAdapter: IAuth = {
  onAuthStateChanged(callback) {
    if (!auth) return () => {};
    return fbOnAuthStateChanged(auth, (user) => {
      callback(user ? toAuthUser(user) : null);
    });
  },
  async signInWithEmailAndPassword(email, password) {
    if (!auth) throw new Error('Auth not configured');
    const { user } = await fbSignIn(auth, email, password);
    return toAuthUser(user);
  },
  async createUserWithEmailAndPassword(email, password) {
    if (!auth) throw new Error('Auth not configured');
    const { user } = await fbCreateUser(auth, email, password);
    return toAuthUser(user);
  },
  async updateDisplayName(uid, displayName) {
    if (!auth) throw new Error('Auth not configured');
    const current = auth.currentUser;
    if (current?.uid === uid) {
      await fbUpdateProfile(current, { displayName });
    }
  },
  async updatePassword(newPassword) {
    if (!auth) throw new Error('Auth not configured');
    const current = auth.currentUser;
    if (!current) throw new Error('No signed-in user');
    await fbUpdatePassword(current, newPassword);
  },
  async signOut() {
    if (auth) await fbSignOut(auth);
  },
  isConfigured: isFirebaseConfigured,
  async getIdToken() {
    if (!auth?.currentUser) return null;
    return auth.currentUser.getIdToken();
  },
  async signInWithCustomToken(customToken: string) {
    if (!auth) throw new Error('Auth not configured');
    const { user } = await fbSignInWithCustomToken(auth, customToken);
    return toAuthUser(user);
  },
};
