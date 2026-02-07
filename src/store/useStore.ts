import { create } from 'zustand';
import { WorkItem, Sprint, KanbanBoard, User, WorkItemType, TenantCompany, AuthUser, Role, KanbanLane, Team, PlanningBoard, PlanningBoardPlacement, BoardItem, ProductHierarchyConfig } from '../types';
import { getAllowedChildTypes, ensureValidHierarchy } from '../utils/hierarchy';
import { getTypeLabel as getTypeLabelFromNomenclature, getRoleLabel as getRoleLabelFromNomenclature } from '../utils/nomenclature';
import { getDataStore } from '../lib/adapters';
import { compareWorkItemOrder } from '../utils/order';
import type { GlossaryKey } from '../glossary/glossaryKeys';
import type { TerminologySettings } from '../services/terminology/terminologyTypes';
import * as terminologyService from '../services/terminology/terminologyService';
import { resolveLabel } from '../services/terminology/terminologyResolver';
import * as productHierarchyConfigService from '../services/productHierarchyConfigService';
import * as frameworkSettingsService from '../services/frameworkSettingsService';
import * as frameworkService from '../services/frameworkService';
import type { FrameworkSettings } from '../types/frameworkSettings';
import { DEFAULT_FRAMEWORK_SETTINGS } from '../types/frameworkSettings';
import type { CompanyFrameworkConfig } from '../lib/frameworkTypes';

const TYPE_ORDER: Record<WorkItemType, number> = {
  company: 0,
  product: 1,
  epic: 2,
  feature: 3,
  'user-story': 4,
  task: 5,
  bug: 6,
  initiative: 7,
  capability: 8,
  'strategic-theme': 9,
  solution: 10,
};

interface AppState {
  // Data
  workItems: WorkItem[];
  sprints: Sprint[];
  boards: KanbanBoard[];
  users: User[];
  teams: Team[];
  planningBoards: PlanningBoard[];
  planningPlacements: PlanningBoardPlacement[];
  /** Backlog features (type=feature) for Add Feature modal. */
  backlogFeatures: WorkItem[];
  /** Backlog features per team (teamId -> features with teamIds containing that team). */
  backlogFeaturesByTeam: Record<string, WorkItem[]>;
  /** Items on the current planning board (boards/{boardId}/items). */
  boardItems: BoardItem[];
  /** Set when loadPlanningBoards fails with permission-denied; cleared on success. */
  planningBoardsLoadError: string | null;
  /** Terminology (label pack + overrides) per tenant; loaded on tenant change. */
  terminologySettings: TerminologySettings;
  /** Set when loadTerminology fails; cleared on success. */
  terminologyLoadError: string | null;
  /** Terminology for the currently selected product (when viewing product backlog). */
  productTerminologySettings: TerminologySettings | null;
  /** Product id that productTerminologySettings was loaded for; used to match selectedProductId. */
  productTerminologyProductId: string | null;
  /** Set when loadProductTerminology fails; cleared on success. */
  productTerminologyLoadError: string | null;
  /** When on Terminology page in product mode, which product we're editing. */
  terminologyProductId: string | null;
  /** Per-product hierarchy config (enabled types + order). */
  hierarchyByProduct: Record<string, ProductHierarchyConfig>;
  /** Effective framework settings (company + product preset merge). Default until loadFrameworkSettings. */
  frameworkSettings: FrameworkSettings;
  frameworkSettingsLoadError: string | null;
  /** Company framework config from companies/{id}/settings/framework (for migration UI). */
  frameworkConfigByCompany: Record<string, CompanyFrameworkConfig | null>;
  frameworkConfigLoading: boolean;
  currentUser: User | null;
  /** Tenant companies (from Firestore companies collection). */
  tenantCompanies: TenantCompany[];
  /** Current tenant company id (TenantCompany document id, e.g. company-123). Not slug or WorkItem id. Used for role checks and Firestore. */
  currentTenantId: string | null;
  /** Current auth user (null when signed out). Provider-agnostic. */
  firebaseUser: AuthUser | null;
  /** When true, user must change password before using the app (e.g. first login after invite). */
  mustChangePassword: boolean;
  /** Team board display mode (Scrum = current board; Kanban = placeholder for later). */
  teamBoardMode: 'scrum' | 'kanban';
  /** Sprint length in weeks (1–4). */
  sprintLengthWeeks: 1 | 2 | 3 | 4;
  /** Sprint start day: 0 = Sunday, 1 = Monday, … 6 = Saturday. */
  sprintStartDay: number;
  /** Kanban lanes to show on the team board (default all). */
  kanbanLanesEnabled: KanbanLane[];

  // UI State
  selectedBoard: string | null;
  selectedWorkItem: string | null;
  selectedProductId: string | null;
  selectedCompanyId: string | null;
  selectedTeamId: string | null;
  selectedPlanningBoardId: string | null;
  /** When opening a feature from Planning Board, set so "Add user story" uses this team/sprint. */
  planningContext: { teamId: string; sprintId?: string } | null;
  /** Board directory page: which type of boards we're listing (planning, epic, feature, team). */
  boardsDirectoryType: 'planning' | 'epic' | 'feature' | 'team' | null;
  viewMode: 'epic' | 'feature' | 'product' | 'team' | 'backlog' | 'list' | 'landing' | 'add-product' | 'add-company' | 'register-company' | 'invite-user' | 'licence' | 'company-profile' | 'settings' | 'team-board-settings' | 'feature-board-settings' | 'epic-board-settings' | 'nomenclature' | 'terminology' | 'product-hierarchy' | 'import-backlog' | 'user-profile' | 'teams-list' | 'planning' | 'boards-directory' | 'app-admin' | 'no-company' | 'account-load-failed';
  
  // Actions
  setWorkItems: (items: WorkItem[]) => void;
  addWorkItem: (item: WorkItem) => Promise<void>;
  updateWorkItem: (id: string, updates: Partial<WorkItem>) => void;
  deleteWorkItem: (id: string) => void;
  moveWorkItem: (itemId: string, newStatus: WorkItem['status'], newColumnId?: string, newLane?: KanbanLane) => void;
  
  setSprints: (sprints: Sprint[]) => void;
  addSprint: (sprint: Sprint) => void;
  updateSprint: (id: string, updates: Partial<Sprint>) => void;
  
  setBoards: (boards: KanbanBoard[]) => void;
  setUsers: (users: User[]) => void;
  setTeams: (teams: Team[]) => void;
  loadTeams: (companyId: string) => Promise<void>;
  addTeam: (team: Team) => Promise<void>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  setSelectedBoard: (boardId: string | null) => void;
  setSelectedWorkItem: (itemId: string | null) => void;
  setSelectedProductId: (id: string | null) => void;
  setSelectedCompanyId: (id: string | null) => void;
  setSelectedTeamId: (id: string | null) => void;
  setSelectedPlanningBoardId: (id: string | null) => void;
  setBoardsDirectoryType: (type: AppState['boardsDirectoryType']) => void;
  setPlanningContext: (ctx: { teamId: string; sprintId?: string } | null) => void;
  setPlanningBoards: (boards: PlanningBoard[]) => void;
  setPlanningPlacements: (placements: PlanningBoardPlacement[]) => void;
  setBacklogFeatures: (features: WorkItem[]) => void;
  setBoardItems: (items: BoardItem[]) => void;
  loadPlanningBoards: (companyId: string) => Promise<void>;
  loadPlanningPlacements: (boardId: string) => Promise<void>;
  loadBacklogFeatures: (companyId: string) => Promise<void>;
  loadBacklogFeaturesForTeam: (companyId: string, teamId: string) => Promise<void>;
  loadBoardItems: (boardId: string) => Promise<void>;
  addPlanningBoard: (board: PlanningBoard) => Promise<void>;
  updatePlanningBoard: (id: string, updates: Partial<Pick<PlanningBoard, 'name' | 'teamIds'>>) => Promise<void>;
  deletePlanningBoard: (id: string) => Promise<void>;
  addPlanningPlacement: (placement: PlanningBoardPlacement) => Promise<void>;
  updatePlanningPlacement: (id: string, updates: Partial<Pick<PlanningBoardPlacement, 'teamId' | 'iterationColumn'>>) => Promise<void>;
  deletePlanningPlacement: (id: string) => Promise<void>;
  addFeatureToPlanningBoard: (params: { boardId: string; companyId: string; workItemId: string; laneId: string; columnId: string }) => Promise<void>;
  moveBoardItem: (boardId: string, itemId: string, placement: { laneId: string; columnId: string }) => Promise<void>;
  removeFeatureFromPlanningBoard: (boardId: string, itemId: string) => Promise<void>;
  setViewMode: (mode: AppState['viewMode']) => void;
  setTenantCompanies: (companies: TenantCompany[]) => void;
  setCurrentTenantId: (id: string | null) => void;
  setFirebaseUser: (user: AuthUser | null) => void;
  setCurrentUser: (user: User | null) => void;
  setMustChangePassword: (value: boolean) => void;
  setTeamBoardMode: (mode: 'scrum' | 'kanban') => void;
  setSprintLengthWeeks: (weeks: 1 | 2 | 3 | 4) => void;
  setSprintStartDay: (day: number) => void;
  setKanbanLanesEnabled: (lanes: KanbanLane[]) => void;
  hydrateTeamBoardSettings: (tenantId: string | null) => void;
  loadTerminology: (companyId: string) => Promise<void>;
  saveTerminology: (companyId: string, settings: TerminologySettings) => Promise<void>;
  loadProductTerminology: (productId: string | null) => Promise<void>;
  saveProductTerminology: (productId: string, settings: TerminologySettings) => Promise<void>;
  setTerminologyProductId: (id: string | null) => void;
  loadHierarchyConfig: (productId: string) => Promise<void>;
  setHierarchyConfig: (productId: string, config: Pick<ProductHierarchyConfig, 'enabledTypes' | 'order'>) => Promise<void>;
  loadFrameworkSettings: (companyId: string, productId?: string) => Promise<void>;
  loadFrameworkConfig: (companyId: string) => Promise<void>;
  setFrameworkPreset: (companyId: string, presetKey: string) => Promise<void>;

  // Computed
  getEffectiveTerminologySettings: () => TerminologySettings;
  canAccessTeamBoardSettings: () => boolean;
  canConfigureSprintStart: () => boolean;
  getProductBacklog: () => WorkItem[];
  getWorkItemsByType: (type: WorkItem['type']) => WorkItem[];
  getWorkItemsByParent: (parentId: string) => WorkItem[];
  getWorkItemsBySprint: (sprintId: string) => WorkItem[];
  getBoard: (boardId: string) => KanbanBoard | undefined;
  getAggregatedStoryPoints: (featureId: string) => number;
  getProductBacklogItems: (productId: string) => WorkItem[];
  canAddProduct: () => boolean;
  getCompanies: () => WorkItem[];
  getProductsByCompany: (companyId: string) => WorkItem[];
  canAddCompany: () => boolean;
  canAddUser: () => boolean;
  /** True if current user is admin for the current tenant (e.g. can reset backlog). */
  canResetBacklog: () => boolean;
  /** True if current user can edit Planning Board (admin or rte-team-of-teams-coach). */
  canEditPlanningBoard: () => boolean;
  getFeaturesWithUserStories: () => WorkItem[];
  getFeaturesInDevelopState: () => WorkItem[];
  getTeamBoardLanes: () => { id: string; title: string }[];
  getStoriesForLane: (laneId: string) => WorkItem[];
  getKanbanLanes: () => { id: KanbanLane; title: string }[];
  getItemsForKanbanLane: (laneId: string) => WorkItem[];
  getCurrentCompany: () => TenantCompany | null;
  /** Type label for current company's nomenclature (e.g. Epic vs Program). Uses terminology when loaded. */
  getTypeLabel: (type: WorkItemType) => string;
  /** Role label for current company's nomenclature (e.g. Participant vs Customer for training). */
  getRoleLabel: (role: Role) => string;
  /** Resolved label for a glossary key (pack + overrides). */
  label: (key: GlossaryKey) => string;
  /** Allowed child work item types for a parent type (from effective framework settings). */
  getAllowedChildTypes: (parentType: WorkItemType) => WorkItemType[];
  /** Hierarchy config for a product (enabled types + order). Uses default if not loaded. */
  getHierarchyConfigForProduct: (productId: string) => ProductHierarchyConfig;
  /** True if current user can edit product hierarchy (admin or RTE for product's company). */
  canEditProductHierarchy: (productId: string) => boolean;
  /** Resolve product id for a work item (walk parentId until type product). Returns null if not under a product. */
  getProductIdForWorkItem: (itemId: string) => string | null;
}

const TEAM_BOARD_STORAGE_KEY = 'thatagileapp_teamBoard';

const ALL_KANBAN_LANES: KanbanLane[] = ['expedite', 'fixed-delivery-date', 'standard', 'intangible'];
const KANBAN_LANE_TITLES: Record<KanbanLane, string> = {
  expedite: 'Expedite',
  'fixed-delivery-date': 'Fixed Delivery Date',
  standard: 'Standard',
  intangible: 'Intangible',
};

const loggedPermissionDeniedForTenant = new Set<string>();

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  workItems: [],
  sprints: [],
  boards: [],
  users: [],
  teams: [],
  planningBoards: [],
  planningPlacements: [],
  backlogFeatures: [],
  backlogFeaturesByTeam: {},
  boardItems: [],
  planningBoardsLoadError: null,
  terminologySettings: terminologyService.getDefaultTerminologySettings(),
  terminologyLoadError: null,
  productTerminologySettings: null,
  productTerminologyProductId: null,
  productTerminologyLoadError: null,
  terminologyProductId: null,
  hierarchyByProduct: {},
  frameworkSettings: DEFAULT_FRAMEWORK_SETTINGS,
  frameworkSettingsLoadError: null,
  frameworkConfigByCompany: {},
  frameworkConfigLoading: false,
  currentUser: null,
  tenantCompanies: [],
  currentTenantId: null,
  firebaseUser: null,
  mustChangePassword: false,
  teamBoardMode: 'scrum',
  sprintLengthWeeks: 2,
  sprintStartDay: 1,
  kanbanLanesEnabled: ALL_KANBAN_LANES,
  selectedBoard: null,
  selectedWorkItem: null,
  selectedProductId: null,
  selectedCompanyId: null,
  selectedTeamId: null,
  selectedPlanningBoardId: null,
  planningContext: null,
  boardsDirectoryType: null,
  viewMode: 'landing',
  
  // Actions
  setWorkItems: (items) => set({ workItems: items }),
  
  addWorkItem: async (item) => {
    const state = get();
    const tenantId = state.currentTenantId ?? item.companyId;
    const itemWithTenant: WorkItem = { ...item, companyId: item.companyId ?? tenantId ?? undefined };
    if (!itemWithTenant.companyId) {
      if (import.meta.env.DEV) console.warn('[Store] addWorkItem: no currentTenantId or companyId');
      return;
    }
    if (itemWithTenant.parentId) {
      const parent = state.workItems.find((i) => i.id === itemWithTenant.parentId);
      if (parent) {
        const fs = state.frameworkSettings;
        const allowed = (fs.hierarchy[parent.type] ?? []).filter((t) => fs.enabledWorkItemTypes.includes(t));
        if (allowed.length && !allowed.includes(itemWithTenant.type)) return;
      }
    }
    let nextItems = [...state.workItems, itemWithTenant];
    if (itemWithTenant.parentId) {
      const parent = nextItems.find((i) => i.id === itemWithTenant.parentId);
      if (parent) {
        const childrenIds = [...(parent.childrenIds ?? []), itemWithTenant.id];
        nextItems = nextItems.map((i) =>
          i.id === itemWithTenant.parentId ? { ...i, childrenIds } : i
        );
      }
    }
    await getDataStore().addWorkItem(itemWithTenant);
    set({ workItems: nextItems });
  },
  
  updateWorkItem: (id, updates) => set((state) => {
    const item = state.workItems.find((i) => i.id === id);
    if (!item) return state;
    const newParentId = updates.parentId !== undefined ? updates.parentId : item.parentId;
    if (newParentId !== item.parentId && newParentId != null) {
      const newParent = state.workItems.find((i) => i.id === newParentId);
      if (newParent) {
        const fs = state.frameworkSettings;
        const allowed = (fs.hierarchy[newParent.type] ?? []).filter((t) => fs.enabledWorkItemTypes.includes(t));
        if (allowed.length && !allowed.includes(item.type)) return state;
      } else return state;
    }
    const merged = { ...updates, updatedAt: new Date() };
    let nextItems = state.workItems.map((i) =>
      i.id === id ? { ...i, ...merged } : i
    );
    if (newParentId !== item.parentId) {
      if (item.parentId) {
        const oldParent = nextItems.find((i) => i.id === item.parentId);
        if (oldParent) {
          const childrenIds = (oldParent.childrenIds ?? []).filter((cid) => cid !== id);
          nextItems = nextItems.map((i) =>
            i.id === item.parentId ? { ...i, childrenIds } : i
          );
        }
      }
      if (newParentId) {
        const newParent = nextItems.find((i) => i.id === newParentId);
        if (newParent) {
          const childrenIds = [...(newParent.childrenIds ?? []), id];
          nextItems = nextItems.map((i) =>
            i.id === newParentId ? { ...i, childrenIds } : i
          );
        }
      }
    }
    getDataStore().updateWorkItem(id, merged).catch(() => {});
    return { workItems: nextItems };
  }),
  
  deleteWorkItem: (id) => set((state) => {
    const item = state.workItems.find((i) => i.id === id);
    const nextItems = state.workItems.filter((i) => i.id !== id);
    getDataStore().deleteWorkItem(id).catch(() => {});
    if (!item?.parentId) return { workItems: nextItems };
    const parent = nextItems.find((i) => i.id === item.parentId);
    if (!parent) return { workItems: nextItems };
    const childrenIds = (parent.childrenIds ?? []).filter((cid) => cid !== id);
    return {
      workItems: nextItems.map((i) =>
        i.id === item.parentId ? { ...i, childrenIds } : i
      ),
    };
  }),
  
  moveWorkItem: (itemId, newStatus, _newColumnId, newLane) => set((state) => {
    const updatedAt = new Date();
    const updates: Partial<WorkItem> = { status: newStatus, updatedAt };
    if (newLane !== undefined) updates.lane = newLane;
    getDataStore().updateWorkItem(itemId, updates).catch(() => {});
    return {
      workItems: state.workItems.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    };
  }),
  
  setSprints: (sprints) => set({ sprints }),
  addSprint: (sprint) => set((state) => ({ sprints: [...state.sprints, sprint] })),
  updateSprint: (id, updates) => set((state) => ({
    sprints: state.sprints.map((sprint) =>
      sprint.id === id ? { ...sprint, ...updates } : sprint
    ),
  })),
  
  setBoards: (boards) => set({ boards }),
  setUsers: (users) => set({ users }),
  setTeams: (teams) => set({ teams }),
  loadTeams: async (companyId) => {
    const teams = await getDataStore().getTeams(companyId);
    set({ teams });
  },
  addTeam: async (team) => {
    await getDataStore().addTeam(team);
    set((state) => ({ teams: [...state.teams, team] }));
  },
  updateTeam: async (id, updates) => {
    await getDataStore().updateTeam(id, updates);
    set((state) => ({
      teams: state.teams.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t)),
    }));
  },
  deleteTeam: async (id) => {
    await getDataStore().deleteTeam(id);
    set((state) => ({ teams: state.teams.filter((t) => t.id !== id) }));
  },
  setSelectedBoard: (boardId) => set({ selectedBoard: boardId }),
  setSelectedWorkItem: (itemId) => set({ selectedWorkItem: itemId }),
  setSelectedProductId: (id) => set({ selectedProductId: id }),
  setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
  setSelectedTeamId: (id) => set({ selectedTeamId: id }),
  setSelectedPlanningBoardId: (id) => set({ selectedPlanningBoardId: id }),
  setBoardsDirectoryType: (type) => set({ boardsDirectoryType: type }),
  setPlanningContext: (ctx) => set({ planningContext: ctx }),
  setPlanningBoards: (boards) => set({ planningBoards: boards }),
  setPlanningPlacements: (placements) => set({ planningPlacements: placements }),
  setBacklogFeatures: (features) => set({ backlogFeatures: features }),
  setBoardItems: (items) => set({ boardItems: items }),
  loadPlanningBoards: async (companyId) => {
    console.log("[loadPlanningBoards] invoked", { companyId });
    try {
      const boards = await getDataStore().getPlanningBoards(companyId);
      set({ planningBoards: boards, planningBoardsLoadError: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission|insufficient|denied/i.test(msg)) {
        set({ planningBoardsLoadError: msg || 'Missing or insufficient permissions' });
        if (!loggedPermissionDeniedForTenant.has(companyId)) {
          console.error('[store] Load planning boards failed:', msg, companyId);
          loggedPermissionDeniedForTenant.add(companyId);
        }
      }
      throw err;
    }
  },
  loadPlanningPlacements: async (boardId) => {
    const placements = await getDataStore().getPlanningPlacements(boardId);
    set({ planningPlacements: placements });
  },
  loadBacklogFeatures: async (companyId) => {
    const features = await getDataStore().listBacklogFeatures(companyId);
    set({ backlogFeatures: features });
  },
  loadBacklogFeaturesForTeam: async (companyId, teamId) => {
    const features = await getDataStore().listBacklogFeaturesForTeam(companyId, teamId);
    set((state) => ({ backlogFeaturesByTeam: { ...state.backlogFeaturesByTeam, [teamId]: features } }));
  },
  loadBoardItems: async (boardId) => {
    const items = await getDataStore().listBoardItems(boardId);
    set({ boardItems: items });
  },
  addFeatureToPlanningBoard: async ({ boardId, companyId, workItemId, laneId, columnId }) => {
    const uid = get().firebaseUser?.uid ?? '';
    await getDataStore().addFeatureToBoard(boardId, companyId, workItemId, {
      laneId,
      columnId,
      addedBy: uid,
    });
    const items = await getDataStore().listBoardItems(boardId);
    set({ boardItems: items });
  },
  moveBoardItem: async (boardId, itemId, placement) => {
    set((state) => ({
      boardItems: state.boardItems.map((i) =>
        i.id === itemId ? { ...i, laneId: placement.laneId, columnId: placement.columnId } : i
      ),
    }));
    try {
      await getDataStore().updateBoardItem(boardId, itemId, placement);
      const items = await getDataStore().listBoardItems(boardId);
      set({ boardItems: items });
    } catch (err) {
      const items = await getDataStore().listBoardItems(boardId);
      set({ boardItems: items });
      throw err;
    }
  },
  removeFeatureFromPlanningBoard: async (boardId, itemId) => {
    await getDataStore().deleteBoardItem(boardId, itemId);
    set((state) => ({ boardItems: state.boardItems.filter((i) => i.id !== itemId) }));
  },
  addPlanningBoard: async (board) => {
    const uid = get().firebaseUser?.uid;
    await getDataStore().addPlanningBoard(board, uid);
    set((state) => ({ planningBoards: [...state.planningBoards, board] }));
  },
  updatePlanningBoard: async (id, updates) => {
    await getDataStore().updatePlanningBoard(id, updates);
    set((state) => ({
      planningBoards: state.planningBoards.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  },
  deletePlanningBoard: async (id) => {
    await getDataStore().deletePlanningBoard(id);
    set((state) => ({
      planningBoards: state.planningBoards.filter((b) => b.id !== id),
      planningPlacements: state.planningPlacements.filter((p) => p.boardId !== id),
      boardItems: state.selectedPlanningBoardId === id ? [] : state.boardItems,
      ...(state.selectedPlanningBoardId === id ? { selectedPlanningBoardId: null } : {}),
    }));
  },
  addPlanningPlacement: async (placement) => {
    await getDataStore().addPlanningPlacement(placement);
    set((state) => ({ planningPlacements: [...state.planningPlacements, placement] }));
  },
  updatePlanningPlacement: async (id, updates) => {
    await getDataStore().updatePlanningPlacement(id, updates);
    set((state) => ({
      planningPlacements: state.planningPlacements.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },
  deletePlanningPlacement: async (id) => {
    await getDataStore().deletePlanningPlacement(id);
    set((state) => ({ planningPlacements: state.planningPlacements.filter((p) => p.id !== id) }));
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  setTenantCompanies: (companies) => set({ tenantCompanies: companies }),
  setCurrentTenantId: (id) => set({ currentTenantId: id }),
  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setMustChangePassword: (value) => set({ mustChangePassword: value }),
  setTeamBoardMode: (mode) => {
    set({ teamBoardMode: mode });
    const tid = get().currentTenantId;
    if (tid && typeof localStorage !== 'undefined') {
      const { teamBoardMode: _, ...rest } = get();
      localStorage.setItem(`${TEAM_BOARD_STORAGE_KEY}_${tid}`, JSON.stringify({
        teamBoardMode: mode,
        sprintLengthWeeks: rest.sprintLengthWeeks,
        sprintStartDay: rest.sprintStartDay,
        kanbanLanesEnabled: rest.kanbanLanesEnabled,
      }));
    }
  },
  setSprintLengthWeeks: (weeks) => {
    set({ sprintLengthWeeks: weeks });
    const tid = get().currentTenantId;
    if (tid && typeof localStorage !== 'undefined') {
      const { sprintLengthWeeks: _, ...rest } = get();
      localStorage.setItem(`${TEAM_BOARD_STORAGE_KEY}_${tid}`, JSON.stringify({
        teamBoardMode: rest.teamBoardMode,
        sprintLengthWeeks: weeks,
        sprintStartDay: rest.sprintStartDay,
        kanbanLanesEnabled: rest.kanbanLanesEnabled,
      }));
    }
  },
  setSprintStartDay: (day) => {
    set({ sprintStartDay: day });
    const tid = get().currentTenantId;
    if (tid && typeof localStorage !== 'undefined') {
      const { sprintStartDay: _, ...rest } = get();
      localStorage.setItem(`${TEAM_BOARD_STORAGE_KEY}_${tid}`, JSON.stringify({
        teamBoardMode: rest.teamBoardMode,
        sprintLengthWeeks: rest.sprintLengthWeeks,
        sprintStartDay: day,
        kanbanLanesEnabled: rest.kanbanLanesEnabled,
      }));
    }
  },
  loadTerminology: async (companyId) => {
    set({ terminologyLoadError: null });
    try {
      const settings = await terminologyService.loadTerminologySettings(companyId);
      set({ terminologySettings: settings, terminologyLoadError: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ terminologyLoadError: msg });
    }
  },
  saveTerminology: async (companyId, settings) => {
    const uid = get().firebaseUser?.uid;
    if (!uid) return;
    await terminologyService.saveTerminologySettings(companyId, settings, uid);
    set({ terminologySettings: settings, terminologyLoadError: null });
  },
  loadProductTerminology: async (productId) => {
    if (productId == null) {
      set({ productTerminologySettings: null, productTerminologyProductId: null, productTerminologyLoadError: null });
      return;
    }
    set({ productTerminologyLoadError: null });
    try {
      const settings = await terminologyService.loadProductTerminology(productId);
      set({
        productTerminologySettings: settings,
        productTerminologyProductId: productId,
        productTerminologyLoadError: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ productTerminologyLoadError: msg, productTerminologySettings: null, productTerminologyProductId: null });
    }
  },
  saveProductTerminology: async (productId, settings) => {
    const uid = get().firebaseUser?.uid;
    if (!uid) return;
    await terminologyService.saveProductTerminology(productId, settings, uid);
    set({
      productTerminologySettings: settings,
      productTerminologyProductId: productId,
      productTerminologyLoadError: null,
    });
  },
  setTerminologyProductId: (id) => set({ terminologyProductId: id }),
  loadHierarchyConfig: async (productId) => {
    const config = await productHierarchyConfigService.getHierarchyConfig(productId);
    set((state) => ({ hierarchyByProduct: { ...state.hierarchyByProduct, [productId]: config } }));
  },
  setHierarchyConfig: async (productId, nextConfig) => {
    const uid = get().firebaseUser?.uid;
    if (!uid) return;
    const valid = ensureValidHierarchy({ ...nextConfig, productId });
    set((state) => ({ hierarchyByProduct: { ...state.hierarchyByProduct, [productId]: { ...valid, updatedBy: uid } } }));
    await productHierarchyConfigService.upsertHierarchyConfig(productId, { enabledTypes: valid.enabledTypes, order: valid.order }, uid);
  },
  loadFrameworkSettings: async (companyId, productId) => {
    try {
      const settings = await frameworkSettingsService.resolveEffectiveSettings({ companyId, productId });
      set({ frameworkSettings: settings, frameworkSettingsLoadError: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ frameworkSettingsLoadError: msg });
    }
  },
  loadFrameworkConfig: async (companyId) => {
    set({ frameworkConfigLoading: true });
    try {
      const config = await frameworkService.getCompanyFrameworkConfig(companyId);
      set((s) => ({
        frameworkConfigByCompany: { ...s.frameworkConfigByCompany, [companyId]: config },
        frameworkConfigLoading: false,
      }));
    } catch {
      set((s) => ({
        frameworkConfigByCompany: { ...s.frameworkConfigByCompany, [companyId]: null },
        frameworkConfigLoading: false,
      }));
    }
  },
  setFrameworkPreset: async (companyId, presetKey) => {
    const uid = get().firebaseUser?.uid;
    if (!uid) return;
    await frameworkService.setCompanyFrameworkPreset(companyId, presetKey, uid);
    await get().loadFrameworkConfig(companyId);
    await get().loadFrameworkSettings(companyId, get().selectedProductId ?? undefined);
  },
  setKanbanLanesEnabled: (lanes) => {
    if (lanes.length === 0) return;
    set({ kanbanLanesEnabled: lanes });
    const tid = get().currentTenantId;
    if (tid && typeof localStorage !== 'undefined') {
      const { teamBoardMode, sprintLengthWeeks, sprintStartDay, kanbanLanesEnabled: enabled } = get();
      localStorage.setItem(`${TEAM_BOARD_STORAGE_KEY}_${tid}`, JSON.stringify({
        teamBoardMode,
        sprintLengthWeeks,
        sprintStartDay,
        kanbanLanesEnabled: enabled,
      }));
    }
  },
  hydrateTeamBoardSettings: (tenantId) => {
    if (!tenantId || typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(`${TEAM_BOARD_STORAGE_KEY}_${tenantId}`);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        teamBoardMode?: string;
        sprintLengthWeeks?: number;
        sprintStartDay?: number;
        kanbanLanesEnabled?: unknown;
      };
      const updates: Partial<Pick<AppState, 'teamBoardMode' | 'sprintLengthWeeks' | 'sprintStartDay' | 'kanbanLanesEnabled'>> = {};
      if (data.teamBoardMode === 'scrum' || data.teamBoardMode === 'kanban') updates.teamBoardMode = data.teamBoardMode;
      if (typeof data.sprintLengthWeeks === 'number' && data.sprintLengthWeeks >= 1 && data.sprintLengthWeeks <= 4)
        updates.sprintLengthWeeks = data.sprintLengthWeeks as 1 | 2 | 3 | 4;
      if (typeof data.sprintStartDay === 'number' && data.sprintStartDay >= 0 && data.sprintStartDay <= 6)
        updates.sprintStartDay = data.sprintStartDay;
      const rawLanes = data.kanbanLanesEnabled;
      if (Array.isArray(rawLanes) && rawLanes.length > 0 && rawLanes.every((l) => ALL_KANBAN_LANES.includes(l as KanbanLane))) {
        updates.kanbanLanesEnabled = rawLanes as KanbanLane[];
      }
      if (Object.keys(updates).length) set(updates);
    } catch {
      // ignore invalid stored data
    }
  },
  
  // Computed
  getProductBacklog: () => {
    const items = get().workItems;
    return [...items].sort((a, b) => {
      const orderA = TYPE_ORDER[a.type] ?? 5;
      const orderB = TYPE_ORDER[b.type] ?? 5;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  },
  getWorkItemsByType: (type) => {
    return get().workItems.filter((item) => item.type === type);
  },
  
  getWorkItemsByParent: (parentId) => {
    return get()
      .workItems.filter((item) => item.parentId === parentId)
      .sort(compareWorkItemOrder);
  },
  
  getWorkItemsBySprint: (sprintId) => {
    return get().workItems.filter((item) => item.sprintId === sprintId);
  },
  
  getBoard: (boardId) => {
    return get().boards.find((board) => board.id === boardId);
  },

  getAggregatedStoryPoints: (featureId) => {
    const children = get().getWorkItemsByParent(featureId).filter((i) => i.type === 'user-story');
    return children.reduce((sum, i) => sum + (i.storyPoints != null ? i.storyPoints : 0), 0);
  },

  getProductBacklogItems: (productId) => {
    const items = get().workItems;
    const idSet = new Set<string>([productId]);
    let added = true;
    while (added) {
      added = false;
      for (const i of items) {
        if (i.parentId != null && idSet.has(i.parentId) && !idSet.has(i.id)) {
          idSet.add(i.id);
          added = true;
        }
      }
    }
    return items.filter((i) => idSet.has(i.id));
  },

  canAddProduct: () => {
    const user = get().currentUser;
    if (!user?.roles?.length) return true;
    const allowed: (string | undefined)[] = ['admin', 'product-manager', 'portfolio-leader'];
    return user.roles.some((r) => allowed.includes(r));
  },

  getCompanies: () => get().workItems.filter((item) => item.type === 'company'),
  getProductsByCompany: (companyId) => get().getWorkItemsByParent(companyId),
  canAddCompany: () => {
    const user = get().currentUser;
    if (!user?.roles?.length) return true;
    return user.roles.includes('admin');
  },

  canAddUser: () => {
    const user = get().currentUser;
    if (!user?.roles?.length) return false;
    return user.roles.includes('admin') || user.roles.includes('hr');
  },
  canResetBacklog: () => {
    const user = get().currentUser;
    return user?.roles?.includes('admin') ?? false;
  },
  canAccessTeamBoardSettings: () => {
    const user = get().currentUser;
    if (!user?.roles?.length) return false;
    return (
      user.roles.includes('admin') ||
      user.roles.includes('scrum-master-team-coach') ||
      user.roles.includes('rte-team-of-teams-coach')
    );
  },
  canConfigureSprintStart: () => {
    const user = get().currentUser;
    if (!user?.roles?.length) return false;
    return user.roles.includes('admin') || user.roles.includes('rte-team-of-teams-coach');
  },
  canEditPlanningBoard: () => {
    const user = get().currentUser;
    return (user?.roles?.includes('admin') ?? false) || (user?.roles?.includes('rte-team-of-teams-coach') ?? false);
  },

  getFeaturesWithUserStories: () => {
    const items = get().workItems;
    const features = items.filter((i) => i.type === 'feature');
    return features.filter((f) =>
      items.some((i) => i.parentId === f.id && i.type === 'user-story')
    );
  },

  getFeaturesInDevelopState: () => {
    return get().workItems.filter(
      (i) => i.type === 'feature' && i.status === 'implementation'
    );
  },

  /** Team board lanes: when selectedTeamId set, lanes = features that have that team in teamIds, plus Ad hoc and Bug. Otherwise features with user stories plus Ad hoc and Bug. */
  getTeamBoardLanes: () => {
    const allItems = get().workItems;
    const tid = get().selectedTeamId;
    const lanes: { id: string; title: string }[] = [];
    if (tid != null) {
      const features = allItems.filter((i) => i.type === 'feature');
      features
        .filter((f) => (f.teamIds ?? []).includes(tid))
        .forEach((f) => {
          lanes.push({ id: f.id, title: f.title });
        });
      const adHocStories = allItems.filter(
        (i) =>
          i.type === 'user-story' &&
          i.teamId === tid &&
          (i.parentId == null || allItems.find((p) => p.id === i.parentId)?.type !== 'feature')
      );
      if (adHocStories.length > 0) {
        lanes.push({ id: '__ad_hoc__', title: 'Ad hoc' });
      }
      const standaloneBugs = allItems.filter((i) => i.type === 'bug' && i.parentId == null && (i.teamId === tid || i.teamId == null));
      if (standaloneBugs.length > 0) {
        lanes.push({ id: '__bug__', title: 'Bug' });
      }
    } else {
      const items = allItems;
      const features = items.filter((i) => i.type === 'feature');
      features
        .filter((f) => items.some((i) => i.parentId === f.id && i.type === 'user-story'))
        .forEach((f) => {
          lanes.push({ id: f.id, title: f.title });
        });
      const adHocStories = items.filter(
        (i) =>
          i.type === 'user-story' &&
          (i.parentId == null || items.find((p) => p.id === i.parentId)?.type !== 'feature')
      );
      if (adHocStories.length > 0) {
        lanes.push({ id: '__ad_hoc__', title: 'Ad hoc' });
      }
      const standaloneBugs = items.filter((i) => i.type === 'bug' && i.parentId == null);
      if (standaloneBugs.length > 0) {
        lanes.push({ id: '__bug__', title: 'Bug' });
      }
    }
    return lanes;
  },

  /**
   * Items for a lane. When selectedTeamId set: feature lane = stories with that team and that parent; Ad hoc = team's stories with no feature parent; Bug = team's or unassigned bugs.
   */
  getStoriesForLane: (laneId: string) => {
    const allItems = get().workItems;
    const tid = get().selectedTeamId;
    if (tid != null) {
      if (laneId === '__ad_hoc__') {
        return allItems
          .filter(
            (i) =>
              i.type === 'user-story' &&
              i.teamId === tid &&
              (i.parentId == null || allItems.find((p) => p.id === i.parentId)?.type !== 'feature')
          )
          .sort(compareWorkItemOrder);
      }
      if (laneId === '__bug__') {
        return allItems
          .filter((i) => i.type === 'bug' && i.parentId == null && (i.teamId === tid || i.teamId == null))
          .sort(compareWorkItemOrder);
      }
      return allItems
        .filter((i) => i.parentId === laneId && i.type === 'user-story' && i.teamId === tid)
        .sort(compareWorkItemOrder);
    }
    const items = allItems;
    if (laneId === '__ad_hoc__') {
      return items
        .filter(
          (i) =>
            i.type === 'user-story' &&
            (i.parentId == null || items.find((p) => p.id === i.parentId)?.type !== 'feature')
        )
        .sort(compareWorkItemOrder);
    }
    if (laneId === '__bug__') {
      return items.filter((i) => i.type === 'bug' && i.parentId == null).sort(compareWorkItemOrder);
    }
    return items.filter((i) => i.parentId === laneId && i.type === 'user-story').sort(compareWorkItemOrder);
  },

  getKanbanLanes: () => {
    const enabled = get().kanbanLanesEnabled;
    return ALL_KANBAN_LANES.filter((id) => enabled.includes(id)).map((id) => ({
      id,
      title: KANBAN_LANE_TITLES[id],
    }));
  },

  getItemsForKanbanLane: (laneId: string) => {
    const { workItems, currentTenantId, selectedTeamId } = get();
    return workItems.filter((i) => {
      if (i.type !== 'task' && i.type !== 'bug') return false;
      if (currentTenantId != null && i.companyId !== currentTenantId) return false;
      if (selectedTeamId != null && i.teamId !== selectedTeamId && i.teamId != null) return false;
      const itemLane = i.lane ?? 'standard';
      return itemLane === laneId;
    });
  },

  getCurrentCompany: () => {
    const { tenantCompanies, currentTenantId } = get();
    if (!currentTenantId) return null;
    return tenantCompanies.find((c) => c.id === currentTenantId) ?? null;
  },

  getEffectiveTerminologySettings: () => {
    const { selectedProductId, productTerminologySettings, productTerminologyProductId, terminologySettings } = get();
    if (
      selectedProductId != null &&
      productTerminologyProductId === selectedProductId &&
      productTerminologySettings != null
    ) {
      return productTerminologySettings;
    }
    return terminologySettings;
  },

  getTypeLabel: (type) => {
    const fs = get().frameworkSettings;
    if (fs.workItemLabels[type]) return fs.workItemLabels[type];
    const settings = get().getEffectiveTerminologySettings();
    const keyMap: Partial<Record<WorkItemType, GlossaryKey>> = {
      product: 'product',
      epic: 'epic',
      feature: 'feature',
      'user-story': 'story',
      task: 'task',
    };
    const key = keyMap[type];
    if (key) return resolveLabel(key, settings);
    const companyType = get().getCurrentCompany()?.companyType ?? 'software';
    return getTypeLabelFromNomenclature(type, companyType);
  },

  label: (key) => resolveLabel(key, get().getEffectiveTerminologySettings()),

  getRoleLabel: (role) => {
    const companyType = get().getCurrentCompany()?.companyType ?? 'software';
    return getRoleLabelFromNomenclature(role, companyType);
  },

  getAllowedChildTypes: (parentType) => {
    const fs = get().frameworkSettings;
    const children = fs.hierarchy[parentType];
    if (children?.length) return children.filter((t) => fs.enabledWorkItemTypes.includes(t));
    return getAllowedChildTypes(parentType);
  },
  getHierarchyConfigForProduct: (productId) => {
    const state = get();
    const fs = state.frameworkSettings;
    const productCfg = state.hierarchyByProduct[productId];
    const base: ProductHierarchyConfig = {
      productId,
      enabledTypes: fs.enabledWorkItemTypes,
      order: fs.workItemTypeOrder ?? (Object.keys(fs.workItemLabels) as WorkItemType[]),
      ...(productCfg?.updatedAt && { updatedAt: productCfg.updatedAt }),
      ...(productCfg?.updatedBy && { updatedBy: productCfg.updatedBy }),
    };
    if (productCfg) {
      base.enabledTypes = productCfg.enabledTypes;
      base.order = productCfg.order;
    }
    return ensureValidHierarchy(base);
  },

  canEditProductHierarchy: (productId) => {
    const user = get().currentUser;
    const product = get().workItems.find((i) => i.id === productId);
    const companyId = product?.companyId;
    if (companyId && user?.adminCompanyIds?.length) {
      if (user.adminCompanyIds.includes(companyId)) return true;
    }
    if (companyId && user?.rteCompanyIds?.length) {
      if (user.rteCompanyIds.includes(companyId)) return true;
    }
    return (user?.roles?.includes('admin') ?? false) || (user?.roles?.includes('rte-team-of-teams-coach') ?? false);
  },

  getProductIdForWorkItem: (itemId) => {
    const items = get().workItems;
    let current: WorkItem | undefined = items.find((i) => i.id === itemId);
    while (current) {
      if (current.type === 'product') return current.id;
      current = current.parentId ? items.find((i) => i.id === current!.parentId) : undefined;
    }
    return null;
  },
}));
