// Work Item Types
export type WorkItemType = 'company' | 'product' | 'epic' | 'feature' | 'user-story' | 'task' | 'bug';

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
  | 'admin'
  | 'hr'
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
  admin: 'Admin',
  hr: 'HR',
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

/** Tenant (registered company) from Firestore companies collection. */
export interface TenantCompany {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  /** When trial ends (set on first registration). */
  trialEndsAt?: Date;
  /** Max users (default 50 for trial; overwritten by licence). */
  seats: number;
  /** Set when a licence is redeemed. */
  licenseKey?: string;
  /** Company vision (editable in Company profile). */
  vision?: string;
  /** Logo image URL (editable in Company profile). */
  logoUrl?: string;
}

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
  /** Tenant id (from companies collection); every work item belongs to one tenant. */
  companyId?: string;
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

/** User profile in Firestore users collection (per-company roles in Phase 3). */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  companyId: string | null;
  companies?: { companyId: string; roles: Role[] }[];
}

/** Auth user (provider-agnostic). Use this in UI/store; do not import firebase/auth types. */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}
