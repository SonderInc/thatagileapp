/**
 * Framework preset and migration types. Data-driven; no preset-specific branching.
 */

import type { WorkItemType } from '../types';

/** Preset key (must match keys in FRAMEWORK_PRESETS). */
export type FrameworkPresetKey = string;

/** Preset definition: enabled types, hierarchy, glossary. */
export interface FrameworkPreset {
  presetKey: FrameworkPresetKey;
  presetVersion: string;
  enabledTypes: WorkItemType[];
  hierarchy: Record<string, WorkItemType[]>;
  glossary: Record<string, string>;
  /** Optional display order for types. */
  workItemTypeOrder?: WorkItemType[];
}

/** Company framework config stored at companies/{companyId}/settings/framework. */
export interface CompanyFrameworkConfig {
  presetKey: string;
  presetVersion: string;
  enabledTypes: WorkItemType[];
  hierarchy: Record<string, WorkItemType[]>;
  glossary: Record<string, string>;
  updatedAt: unknown;
  updatedBy: string;
}

export type MigrationJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ROLLED_BACK';

export type MigrationMode = 'DRY_RUN' | 'APPLY';

/** Job document: companies/{companyId}/frameworkMigrations/{jobId}. */
export interface FrameworkMigrationJob {
  jobId: string;
  companyId: string;
  fromPresetKey: string;
  toPresetKey: string;
  status: MigrationJobStatus;
  mode: MigrationMode;
  startedAt: unknown;
  finishedAt?: unknown;
  progress: { total: number; done: number };
  summary: {
    createdContainers: number;
    movedItems: number;
    flaggedForReview: number;
    invalidItems: number;
  };
  errors?: unknown[];
  reportRef?: string;
}

export type MigrationIssueType =
  | 'INVALID_PARENT'
  | 'MISSING_CONTAINER'
  | 'DISABLED_TYPE'
  | 'BOARD_CONFIG_MISMATCH';

export type MigrationIssueSeverity = 'INFO' | 'WARN' | 'ERROR';

export interface MigrationIssue {
  type: MigrationIssueType;
  severity: MigrationIssueSeverity;
  itemId?: string;
  itemType?: string;
  message: string;
  suggestion?: unknown;
}

export interface MigrationReviewItem {
  itemId: string;
  itemType: string;
  reason: string;
  suggestedActions: unknown[];
}

export interface MigrationReport {
  jobId: string;
  companyId: string;
  issues: MigrationIssue[];
  reviewQueue: MigrationReviewItem[];
  createdContainers: Array<{ id: string; type: string; title: string }>;
  movedItems: Array<{
    itemId: string;
    fromParentId: string | null;
    toParentId: string | null;
    fromOrder?: number;
    toOrder?: number;
  }>;
  generatedAt: unknown;
}

/** Move log entry for rollback: companies/{companyId}/frameworkMigrationMoves/{jobId}/moves/{moveId}. */
export interface FrameworkMigrationMove {
  itemId: string;
  prev: { parentId: string | null; order?: number; type?: string };
  next: { parentId: string | null; order?: number; type?: string };
  movedAt: unknown;
  movedBy: string;
}

/** Result of deterministic parent resolution. */
export interface DeterministicParentResult {
  parentId: string | null;
  confidence: 'HIGH' | 'LOW';
}
