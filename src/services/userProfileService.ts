/**
 * Thin wrapper over the data store for user profile read/write.
 * Use this when you need to verify profile state (e.g. companyIds) without going through the store.
 */
import { getDataStore } from '../lib/adapters';
import type { UserProfile } from '../types';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  return getDataStore().getUserProfile(uid);
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  return getDataStore().setUserProfile(profile);
}
