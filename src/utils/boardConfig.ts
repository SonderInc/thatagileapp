import { KanbanColumn, WorkItemStatus } from '../types';

// Epic level: Funnel → Reviewing → Analyzing → Portfolio Backlog → Implementing → Done
export const EPIC_COLUMNS: KanbanColumn[] = [
  { id: 'funnel', name: 'Funnel', status: 'funnel', workItemIds: [], order: 0 },
  { id: 'backlog', name: 'Reviewing', status: 'backlog', workItemIds: [], order: 1 },
  { id: 'analysis', name: 'Analyzing', status: 'analysis', workItemIds: [], order: 2 },
  { id: 'prioritization', name: 'Portfolio Backlog', status: 'prioritization', workItemIds: [], order: 3 },
  { id: 'implementation', name: 'Implementing', status: 'implementation', workItemIds: [], order: 4 },
  { id: 'done', name: 'Done', status: 'done', workItemIds: [], order: 5 },
];

// Feature level (value stream): Discover → Define → Design → Develop → Release → Operate
export const FEATURE_COLUMNS: KanbanColumn[] = [
  { id: 'intake', name: 'Discover', status: 'intake', workItemIds: [], order: 0 },
  { id: 'define', name: 'Define', status: 'define', workItemIds: [], order: 1 },
  { id: 'design', name: 'Design', status: 'design', workItemIds: [], order: 2 },
  { id: 'develop', name: 'Develop', status: 'develop', workItemIds: [], order: 3 },
  { id: 'release', name: 'Release', status: 'release', workItemIds: [], order: 4 },
  { id: 'done', name: 'Operate', status: 'done', workItemIds: [], order: 5 },
];

// Team-level Features: Backlog → To Do → In Progress → Demo → Accepted/Done
export const PRODUCT_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', name: 'Backlog', status: 'backlog', workItemIds: [], order: 0 },
  { id: 'to-do', name: 'To Do', status: 'to-do', workItemIds: [], order: 1 },
  { id: 'in-progress', name: 'In Progress', status: 'in-progress', workItemIds: [], order: 2 },
  { id: 'demo', name: 'Demo', status: 'demo', workItemIds: [], order: 3 },
  { id: 'accepted', name: 'Accepted/Done', status: 'accepted', workItemIds: [], order: 4 },
];

export const TEAM_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', name: 'Backlog', status: 'backlog', workItemIds: [], order: 0 },
  { id: 'to-do', name: 'To Do', status: 'to-do', workItemIds: [], order: 1 },
  { id: 'in-progress', name: 'In Progress', status: 'in-progress', workItemIds: [], order: 2 },
  { id: 'done', name: 'Done', status: 'done', workItemIds: [], order: 3 },
];

// Team board swim-lane layout: 5 columns (Backlog, Ready, In Progress, Done, Archive)
export const TEAM_BOARD_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', name: 'Backlog', status: 'backlog', workItemIds: [], order: 0 },
  { id: 'to-do', name: 'Ready', status: 'to-do', workItemIds: [], order: 1 },
  { id: 'in-progress', name: 'In Progress', status: 'in-progress', workItemIds: [], order: 2 },
  { id: 'done', name: 'Done', status: 'done', workItemIds: [], order: 3 },
  { id: 'archive', name: 'Archive', status: 'archive', workItemIds: [], order: 4 },
];

/** Status to set when dropping an item into a team board column */
export function getStatusForTeamColumn(columnId: string): WorkItemStatus {
  if (columnId === 'backlog') return 'backlog';
  if (columnId === 'to-do') return 'to-do';
  if (columnId === 'in-progress') return 'in-progress';
  if (columnId === 'done') return 'done';
  if (columnId === 'archive') return 'archive';
  return 'backlog';
}

/** Whether a status belongs in the given team board column */
export function isStatusInTeamColumn(status: WorkItemStatus, columnId: string): boolean {
  if (columnId === 'backlog') return status === 'backlog';
  if (columnId === 'to-do') return status === 'to-do';
  if (columnId === 'in-progress') return status === 'in-progress';
  if (columnId === 'done') return status === 'done';
  if (columnId === 'archive') return status === 'archive';
  return false;
}

export const getColumnsForLevel = (level: 'epic' | 'feature' | 'product' | 'team'): KanbanColumn[] => {
  switch (level) {
    case 'epic':
      return EPIC_COLUMNS;
    case 'feature':
      return FEATURE_COLUMNS;
    case 'product':
      return PRODUCT_COLUMNS;
    case 'team':
      return TEAM_COLUMNS;
    default:
      return PRODUCT_COLUMNS;
  }
};

export const getStatusColor = (status: WorkItemStatus): string => {
  const colorMap: Record<WorkItemStatus, string> = {
    funnel: '#ef4444', // red
    backlog: '#8b5cf6', // purple
    analysis: '#f97316', // orange
    prioritization: '#10b981', // green
    implementation: '#3b82f6', // blue
    intake: '#f59e0b', // amber (Discover)
    define: '#ec4899', // pink
    design: '#6366f1', // indigo
    develop: '#14b8a6', // teal
    release: '#84cc16', // lime
    operate: '#059669', // emerald (Operate)
    'to-do': '#fbbf24', // yellow
    'in-progress': '#10b981', // green
    demo: '#0ea5e9', // sky
    accepted: '#22c55e', // green (Accepted/Done)
    done: '#6b7280', // gray
    archive: '#9ca3af', // muted gray
  };
  return colorMap[status] || '#6b7280';
};
