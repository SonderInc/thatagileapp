import { create } from 'zustand';
import { WorkItem, Sprint, KanbanBoard, User, WorkItemType, TenantCompany, AuthUser } from '../types';
import { getAllowedChildTypes } from '../utils/hierarchy';
import { getDataStore } from '../lib/adapters';

const TYPE_ORDER: Record<WorkItemType, number> = {
  company: 0,
  product: 1,
  epic: 2,
  feature: 3,
  'user-story': 4,
  task: 5,
  bug: 6,
};

interface AppState {
  // Data
  workItems: WorkItem[];
  sprints: Sprint[];
  boards: KanbanBoard[];
  users: User[];
  currentUser: User | null;
  /** Tenant companies (from Firestore companies collection). */
  tenantCompanies: TenantCompany[];
  /** Current tenant id (which registered company we're in). Used to scope work items. */
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

  // UI State
  selectedBoard: string | null;
  selectedWorkItem: string | null;
  selectedProductId: string | null;
  selectedCompanyId: string | null;
  viewMode: 'epic' | 'feature' | 'product' | 'team' | 'backlog' | 'list' | 'landing' | 'add-product' | 'add-company' | 'register-company' | 'invite-user' | 'licence' | 'company-profile' | 'settings';
  
  // Actions
  setWorkItems: (items: WorkItem[]) => void;
  addWorkItem: (item: WorkItem) => Promise<void>;
  updateWorkItem: (id: string, updates: Partial<WorkItem>) => void;
  deleteWorkItem: (id: string) => void;
  moveWorkItem: (itemId: string, newStatus: WorkItem['status'], newColumnId?: string) => void;
  
  setSprints: (sprints: Sprint[]) => void;
  addSprint: (sprint: Sprint) => void;
  updateSprint: (id: string, updates: Partial<Sprint>) => void;
  
  setBoards: (boards: KanbanBoard[]) => void;
  setUsers: (users: User[]) => void;
  setSelectedBoard: (boardId: string | null) => void;
  setSelectedWorkItem: (itemId: string | null) => void;
  setSelectedProductId: (id: string | null) => void;
  setSelectedCompanyId: (id: string | null) => void;
  setViewMode: (mode: AppState['viewMode']) => void;
  setTenantCompanies: (companies: TenantCompany[]) => void;
  setCurrentTenantId: (id: string | null) => void;
  setFirebaseUser: (user: AuthUser | null) => void;
  setCurrentUser: (user: User | null) => void;
  setMustChangePassword: (value: boolean) => void;
  setTeamBoardMode: (mode: 'scrum' | 'kanban') => void;
  setSprintLengthWeeks: (weeks: 1 | 2 | 3 | 4) => void;
  setSprintStartDay: (day: number) => void;
  hydrateTeamBoardSettings: (tenantId: string | null) => void;

  // Computed
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
  canAccessTeamBoardSettings: () => boolean;
  canConfigureSprintStart: () => boolean;
  getFeaturesWithUserStories: () => WorkItem[];
  getFeaturesInDevelopState: () => WorkItem[];
  getTeamBoardLanes: () => { id: string; title: string }[];
  getStoriesForLane: (laneId: string) => WorkItem[];
  getCurrentCompany: () => TenantCompany | null;
}

const TEAM_BOARD_STORAGE_KEY = 'thatagileapp_teamBoard';

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  workItems: [],
  sprints: [],
  boards: [],
  users: [],
  currentUser: null,
  tenantCompanies: [],
  currentTenantId: null,
  firebaseUser: null,
  mustChangePassword: false,
  teamBoardMode: 'scrum',
  sprintLengthWeeks: 2,
  sprintStartDay: 1,
  selectedBoard: null,
  selectedWorkItem: null,
  selectedProductId: null,
  selectedCompanyId: null,
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
      if (parent && !getAllowedChildTypes(parent.type).includes(itemWithTenant.type)) {
        return;
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
      if (!newParent || !getAllowedChildTypes(newParent.type).includes(item.type)) {
        return state;
      }
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
  
  moveWorkItem: (itemId, newStatus, _newColumnId) => set((state) => {
    const updatedAt = new Date();
    getDataStore().updateWorkItem(itemId, { status: newStatus, updatedAt }).catch(() => {});
    return {
      workItems: state.workItems.map((item) =>
        item.id === itemId ? { ...item, status: newStatus, updatedAt } : item
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
  setSelectedBoard: (boardId) => set({ selectedBoard: boardId }),
  setSelectedWorkItem: (itemId) => set({ selectedWorkItem: itemId }),
  setSelectedProductId: (id) => set({ selectedProductId: id }),
  setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
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
      }));
    }
  },
  hydrateTeamBoardSettings: (tenantId) => {
    if (!tenantId || typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(`${TEAM_BOARD_STORAGE_KEY}_${tenantId}`);
      if (!raw) return;
      const data = JSON.parse(raw) as { teamBoardMode?: string; sprintLengthWeeks?: number; sprintStartDay?: number };
      const updates: Partial<Pick<AppState, 'teamBoardMode' | 'sprintLengthWeeks' | 'sprintStartDay'>> = {};
      if (data.teamBoardMode === 'scrum' || data.teamBoardMode === 'kanban') updates.teamBoardMode = data.teamBoardMode;
      if (typeof data.sprintLengthWeeks === 'number' && data.sprintLengthWeeks >= 1 && data.sprintLengthWeeks <= 4)
        updates.sprintLengthWeeks = data.sprintLengthWeeks as 1 | 2 | 3 | 4;
      if (typeof data.sprintStartDay === 'number' && data.sprintStartDay >= 0 && data.sprintStartDay <= 6)
        updates.sprintStartDay = data.sprintStartDay;
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
    return get().workItems.filter((item) => item.parentId === parentId);
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
    const allowed: (string | undefined)[] = ['admin', 'product-owner', 'portfolio-leader'];
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

  getFeaturesWithUserStories: () => {
    const items = get().workItems;
    const features = items.filter((i) => i.type === 'feature');
    return features.filter((f) =>
      items.some((i) => i.parentId === f.id && i.type === 'user-story')
    );
  },

  getFeaturesInDevelopState: () => {
    return get().workItems.filter(
      (i) => i.type === 'feature' && i.status === 'develop'
    );
  },

  /** Team board lanes: one per feature (with user stories), plus Ad hoc and Bug lanes. */
  getTeamBoardLanes: () => {
    const items = get().workItems;
    const lanes: { id: string; title: string }[] = [];
    get().getFeaturesWithUserStories().forEach((f) => {
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
    return lanes;
  },

  /**
   * Items for a lane. For a feature lane: only user stories with that feature as parent.
   * The board shows tasks/bugs only via getTasksForStory(story.id) for these stories,
   * so all user stories and their tasks/bugs stay in the same swim lane.
   */
  getStoriesForLane: (laneId: string) => {
    const items = get().workItems;
    if (laneId === '__ad_hoc__') {
      return items.filter(
        (i) =>
          i.type === 'user-story' &&
          (i.parentId == null || items.find((p) => p.id === i.parentId)?.type !== 'feature')
      );
    }
    if (laneId === '__bug__') {
      return items.filter((i) => i.type === 'bug' && i.parentId == null);
    }
    return items.filter((i) => i.parentId === laneId && i.type === 'user-story');
  },

  getCurrentCompany: () => {
    const { tenantCompanies, currentTenantId } = get();
    if (!currentTenantId) return null;
    return tenantCompanies.find((c) => c.id === currentTenantId) ?? null;
  },
}));
