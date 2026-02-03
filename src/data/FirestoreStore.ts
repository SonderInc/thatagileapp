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
  updateCompany: firestore.updateCompany,
  addWorkItem: firestore.addWorkItem,
  updateWorkItem: firestore.updateWorkItem,
  deleteWorkItem: firestore.deleteWorkItem,
  getUserProfile: firestore.getUserProfile,
  setUserProfile: firestore.setUserProfile,
  clearMustChangePassword: firestore.clearMustChangePassword,
  getCompanyUserCount: firestore.getCompanyUserCount,
  addInvite: firestore.addInvite,
  getInviteByToken: firestore.getInviteByToken,
  markInviteUsed: firestore.markInviteUsed,
  getLicenceByKey: firestore.getLicenceByKey,
  redeemLicence: firestore.redeemLicence,
};
