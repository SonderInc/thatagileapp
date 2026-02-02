// Work Item Types
export type WorkItemType = 'product' | 'epic' | 'feature' | 'user-story' | 'task' | 'bug';

export type EpicFeatureSize = 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | '?';

export type WorkItemStatus = 
  // Epic Level: Funnel → Reviewing → Analyzing → Portfolio Backlog → Implementing → Done
  | 'funnel' | 'backlog' | 'analysis' | 'prioritization' | 'implementation' | 'done'
  // Feature Level: Discover → Define → Design → Develop → Release → Operate
  | 'intake' | 'define' | 'design' | 'develop' | 'release' | 'operate'
  // Team-level Features: Backlog → To Do → In Progress → Demo → Accepted/Done
  | 'demo' | 'accepted'
  // Stories/Bug/Tasks (Sprint): Backlog → Ready → In Progress → Done → Archive
  | 'to-do' | 'in-progress' | 'archive';

export type Role =
  | 'developer'
  | 'scrum-master-team-coach'
  | 'product-owner'
  | 'rte-team-of-teams-coach'
  | 'product-manager'
  | 'systems-architect'
  | 'business-owner'
  | 'solution-manager'
  | 'epic-owner'
  | 'enterprise-architect'
  | 'portfolio-leader'
  | 'customer';

/** Display labels for UI (e.g. "Scrum Master/Team Coach"). */
export const ROLE_LABELS: Record<Role, string> = {
  developer: 'Developer',
  'scrum-master-team-coach': 'Scrum Master/Team Coach',
  'product-owner': 'Product Owner',
  'rte-team-of-teams-coach': 'RTE/Team of Teams Coach',
  'product-manager': 'Product Manager',
  'systems-architect': 'Systems Architect',
  'business-owner': 'Business Owner',
  'solution-manager': 'Solution Manager',
  'epic-owner': 'Epic Owner',
  'enterprise-architect': 'Enterprise Architect',
  'portfolio-leader': 'Portfolio Leader',
  customer: 'Customer',
};

export interface WorkItem {
  id: string;
  type: WorkItemType;
  title: string;
  description?: string;
  status: WorkItemStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  parentId?: string; // Links to parent work item
  childrenIds?: string[]; // Links to child work items
  sprintId?: string; // For stories/tasks in sprints
  size?: EpicFeatureSize; // Epic, Feature: Small, Medium, Large, XLarge, XXLarge, ?
  storyPoints?: number | null; // User Story: Fibonacci or ? (null)
  estimatedDays?: number | null; // Task, Bug: ?, 0.5, 1, 1.5, 2
  estimatedHours?: number; // legacy / optional
  actualHours?: number;
  color?: string; // For visual distinction
}

export interface Sprint {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'in-progress' | 'completed';
  workItemIds: string[];
}

export interface KanbanBoard {
  id: string;
  name: string;
  level: 'epic' | 'feature' | 'product' | 'team';
  columns: KanbanColumn[];
  workItemIds: string[];
}

export interface KanbanColumn {
  id: string;
  name: string;
  status: WorkItemStatus;
  workItemIds: string[];
  order: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  avatar?: string;
}
