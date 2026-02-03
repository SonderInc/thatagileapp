import type { AuthUser } from '../types';

/**
 * Auth interface — Firebase, OIDC, local, etc.
 * UI must use this; no direct firebase/auth imports.
 */
export interface IAuth {
  /** Subscribe to auth state; returns unsubscribe. */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  signInWithEmailAndPassword(email: string, password: string): Promise<AuthUser>;
  createUserWithEmailAndPassword(email: string, password: string): Promise<AuthUser>;
  updateDisplayName(uid: string, displayName: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  signOut(): Promise<void>;
  /** Whether the provider is configured (e.g. Firebase project set). */
  isConfigured(): boolean;
}

export type { AuthUser };
