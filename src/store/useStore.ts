import { create } from 'zustand';
import { WorkItem, Sprint, KanbanBoard, User, WorkItemType } from '../types';
import { getAllowedChildTypes } from '../utils/hierarchy';

const TYPE_ORDER: Record<WorkItemType, number> = {
  product: 0,
  epic: 1,
  feature: 2,
  'user-story': 3,
  task: 4,
  bug: 5,
};

interface AppState {
  // Data
  workItems: WorkItem[];
  sprints: Sprint[];
  boards: KanbanBoard[];
  users: User[];
  currentUser: User | null;
  
  // UI State
  selectedBoard: string | null;
  selectedWorkItem: string | null;
  selectedProductId: string | null;
  viewMode: 'epic' | 'feature' | 'product' | 'team' | 'backlog' | 'list' | 'landing' | 'add-product';
  
  // Actions
  setWorkItems: (items: WorkItem[]) => void;
  addWorkItem: (item: WorkItem) => void;
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
  setViewMode: (mode: AppState['viewMode']) => void;
  
  setCurrentUser: (user: User | null) => void;
  
  // Computed
  getProductBacklog: () => WorkItem[];
  getWorkItemsByType: (type: WorkItem['type']) => WorkItem[];
  getWorkItemsByParent: (parentId: string) => WorkItem[];
  getWorkItemsBySprint: (sprintId: string) => WorkItem[];
  getBoard: (boardId: string) => KanbanBoard | undefined;
  getAggregatedStoryPoints: (featureId: string) => number;
  getProductBacklogItems: (productId: string) => WorkItem[];
  canAddProduct: () => boolean;
  getFeaturesWithUserStories: () => WorkItem[];
  getTeamBoardLanes: () => { id: string; title: string }[];
  getStoriesForLane: (laneId: string) => WorkItem[];
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  workItems: [],
  sprints: [],
  boards: [],
  users: [],
  currentUser: null,
  selectedBoard: null,
  selectedWorkItem: null,
  selectedProductId: null,
  viewMode: 'landing',
  
  // Actions
  setWorkItems: (items) => set({ workItems: items }),
  
  addWorkItem: (item) => set((state) => {
    if (item.parentId) {
      const parent = state.workItems.find((i) => i.id === item.parentId);
      if (parent && !getAllowedChildTypes(parent.type).includes(item.type)) {
        return state;
      }
    }
    const nextItems = [...state.workItems, item];
    if (item.parentId) {
      const parent = nextItems.find((i) => i.id === item.parentId);
      if (parent) {
        const childrenIds = [...(parent.childrenIds ?? []), item.id];
        return {
          workItems: nextItems.map((i) =>
            i.id === item.parentId ? { ...i, childrenIds } : i
          ),
        };
      }
    }
    return { workItems: nextItems };
  }),
  
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
    let nextItems = state.workItems.map((i) =>
      i.id === id ? { ...i, ...updates, updatedAt: new Date() } : i
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
    return { workItems: nextItems };
  }),
  
  deleteWorkItem: (id) => set((state) => {
    const item = state.workItems.find((i) => i.id === id);
    const nextItems = state.workItems.filter((i) => i.id !== id);
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
  
  moveWorkItem: (itemId, newStatus, _newColumnId) => set((state) => ({
    workItems: state.workItems.map((item) =>
      item.id === itemId ? { ...item, status: newStatus, updatedAt: new Date() } : item
    ),
  })),
  
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
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
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
    // For now allow all; later: check currentUser?.roles (e.g. program-owner, product-owner, product-manager)
    return true;
  },

  getFeaturesWithUserStories: () => {
    const items = get().workItems;
    const features = items.filter((i) => i.type === 'feature');
    return features.filter((f) =>
      items.some((i) => i.parentId === f.id && i.type === 'user-story')
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
}));
