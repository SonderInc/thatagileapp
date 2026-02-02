/**
 * Firestore implementation of IDataStore.
 * All Firebase/Firestore imports are confined to this file and lib/firestore.
 */
import type { IDataStore } from './IDataStore';
import * as firestore from '../lib/firestore';

export const FirestoreStore: IDataStore = {
  getWorkItems: firestore.getWorkItems,
  getTenantCompanies: firestore.getTenantCompanies,
  addTenantCompany: firestore.addTenantCompany,
  addWorkItem: firestore.addWorkItem,
  updateWorkItem: firestore.updateWorkItem,
  deleteWorkItem: firestore.deleteWorkItem,
  getUserProfile: firestore.getUserProfile,
  setUserProfile: firestore.setUserProfile,
};
