import type { WorkItem, TenantCompany, UserProfile, Role, Team, PlanningBoard, PlanningBoardPlacement, BoardItem } from '../types';

/**
 * Data store interface — Firestore, Postgres, etc.
 * UI and business logic must use this; no direct Firestore/DB imports.
 */
export interface IDataStore {
  getWorkItems(companyId: string): Promise<WorkItem[]>;
  getTenantCompanies(): Promise<TenantCompany[]>;
  /** Fetch companies by ids (avoids full collection read; use when user profile has companyIds). */
  getTenantCompaniesByIds(companyIds: string[]): Promise<TenantCompany[]>;
  /** Fetch a single company by id (for resilient Company Profile when list is empty). */
  getCompany(companyId: string): Promise<TenantCompany | null>;
  addTenantCompany(company: TenantCompany): Promise<void>;
  updateCompany(companyId: string, updates: Partial<Pick<TenantCompany, 'name' | 'vision' | 'logoUrl' | 'seats' | 'licenseKey' | 'updatedAt' | 'companyType'>>): Promise<void>;
  addWorkItem(item: WorkItem): Promise<void>;
  updateWorkItem(id: string, updates: Partial<WorkItem>): Promise<void>;
  deleteWorkItem(id: string): Promise<void>;
  /** Delete many work items (e.g. subtree). Prefer children-first order. */
  batchDeleteWorkItems(ids: string[]): Promise<void>;
  getUserProfile(uid: string): Promise<UserProfile | null>;
  setUserProfile(profile: UserProfile): Promise<void>;
  clearMustChangePassword(uid: string): Promise<void>;
  getCompanyUserCount(companyId: string): Promise<number>;
  getCompanyUsers(companyId: string): Promise<UserProfile[]>;
  addInvite(invite: { email: string; companyId: string; roles: Role[]; invitedBy: string; firstName?: string; lastName?: string; employeeNumber?: string; phone?: string }): Promise<{ token: string }>;
  getInviteByToken(token: string): Promise<{ email: string; companyId: string; roles: Role[]; firstName?: string; lastName?: string; employeeNumber?: string; phone?: string } | null>;
  markInviteUsed(token: string): Promise<void>;
  getLicenceByKey(key: string): Promise<{ seats: number } | null>;
  redeemLicence(companyId: string, key: string): Promise<void>;
  getTeams(companyId: string): Promise<Team[]>;
  addTeam(team: Team): Promise<void>;
  updateTeam(id: string, updates: Partial<Team>): Promise<void>;
  deleteTeam(id: string): Promise<void>;
  getPlanningBoards(companyId: string): Promise<PlanningBoard[]>;
  /** List planning boards from boards collection (companyId + type planning). */
  listPlanningBoardsFromBoards(companyId: string): Promise<PlanningBoard[]>;
  /** Create a default planning board in boards collection; returns the new document id. */
  createDefaultPlanningBoard(companyId: string, createdBy: string): Promise<string>;
  addPlanningBoard(board: PlanningBoard, createdBy?: string): Promise<void>;
  updatePlanningBoard(id: string, updates: Partial<Pick<PlanningBoard, 'name' | 'teamIds'>>): Promise<void>;
  deletePlanningBoard(id: string): Promise<void>;
  getPlanningPlacements(boardId: string): Promise<PlanningBoardPlacement[]>;
  addPlanningPlacement(placement: PlanningBoardPlacement): Promise<void>;
  updatePlanningPlacement(id: string, updates: Partial<Pick<PlanningBoardPlacement, 'teamId' | 'iterationColumn'>>): Promise<void>;
  deletePlanningPlacement(id: string): Promise<void>;
  listBacklogFeatures(companyId: string): Promise<WorkItem[]>;
  listBacklogFeaturesForTeam(companyId: string, teamId: string): Promise<WorkItem[]>;
  listBoardItems(boardId: string): Promise<BoardItem[]>;
  addFeatureToBoard(
    boardId: string,
    companyId: string,
    workItemId: string,
    placement: { laneId: string; columnId: string; addedBy: string }
  ): Promise<string>;
  updateBoardItem(boardId: string, itemId: string, updates: { laneId?: string; columnId?: string }): Promise<void>;
  deleteBoardItem(boardId: string, itemId: string): Promise<void>;
  /** Terminology: companies/{companyId}/settings/terminology */
  getTerminologySettings(companyId: string): Promise<{ activePackId: string; overrides: Record<string, string> } | null>;
  setTerminologySettings(companyId: string, settings: { activePackId: string; overrides: Record<string, string> }, uid: string): Promise<void>;
  /** Terminology per product: productTerminology/{productId} */
  getProductTerminology(productId: string): Promise<{ activePackId: string; overrides: Record<string, string> } | null>;
  setProductTerminology(productId: string, settings: { activePackId: string; overrides: Record<string, string> }, uid: string): Promise<void>;
}

export type { WorkItem, TenantCompany, UserProfile, Role, Team, PlanningBoard, PlanningBoardPlacement, BoardItem };
