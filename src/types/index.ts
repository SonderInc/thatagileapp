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
  // Stories/Bug/Tasks (Sprint): Backlog → To Do → In Progress → Done
  | 'to-do' | 'in-progress';

export type Role = 
  | 'program-owner' 
  | 'business-owner' 
  | 'enterprise-architect'
  | 'solution-architect'
  | 'product-owner'
  | 'product-manager'
  | 'system-architect'
  | 'quality-assurance'
  | 'team-lead'
  | 'scrum-master'
  | 'development-team';

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
  estimatedHours?: number; // Task, Bug
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
