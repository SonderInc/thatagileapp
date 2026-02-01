import { create } from 'zustand';
import { WorkItem, Sprint, KanbanBoard, User } from '../types';

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
  viewMode: 'epic' | 'feature' | 'product' | 'team';
  
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
  setViewMode: (mode: AppState['viewMode']) => void;
  
  setCurrentUser: (user: User | null) => void;
  
  // Computed
  getWorkItemsByType: (type: WorkItem['type']) => WorkItem[];
  getWorkItemsByParent: (parentId: string) => WorkItem[];
  getWorkItemsBySprint: (sprintId: string) => WorkItem[];
  getBoard: (boardId: string) => KanbanBoard | undefined;
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
  viewMode: 'epic',
  
  // Actions
  setWorkItems: (items) => set({ workItems: items }),
  
  addWorkItem: (item) => set((state) => ({
    workItems: [...state.workItems, item],
  })),
  
  updateWorkItem: (id, updates) => set((state) => ({
    workItems: state.workItems.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date() } : item
    ),
  })),
  
  deleteWorkItem: (id) => set((state) => ({
    workItems: state.workItems.filter((item) => item.id !== id),
  })),
  
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
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  // Computed
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
}));
