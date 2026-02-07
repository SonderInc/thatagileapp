/**
 * Client service for framework migration: start job (callable), poll job/report, rollback (callable).
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, isFirebaseConfigured } from '../lib/firebase';
import {
  getFrameworkMigrationJob,
  getFrameworkMigrationReport,
} from '../lib/firestore';
import type { FrameworkMigrationJob, MigrationReport } from '../lib/frameworkTypes';

export type MigrationMode = 'DRY_RUN' | 'APPLY';

export interface StartMigrationResult {
  jobId: string;
  companyId: string;
  status: string;
  summary?: { createdContainers: number; movedItems: number; flaggedForReview: number; invalidItems: number };
}

/**
 * Start a framework migration job (callable). Sends preset payload so function stays generic.
 * Returns jobId; job runs to completion before returning.
 */
export async function startFrameworkMigration(
  companyId: string,
  toPresetKey: string,
  mode: MigrationMode,
  preset: { enabledTypes: string[]; hierarchy: Record<string, string[]> }
): Promise<StartMigrationResult> {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase not configured');
  const functions = getFunctions(app, 'us-central1');
  const fn = httpsCallable<
    { companyId: string; toPresetKey: string; mode: MigrationMode; preset: { enabledTypes: string[]; hierarchy: Record<string, string[]> } },
    { jobId: string; companyId: string; status: string; summary?: FrameworkMigrationJob['summary'] }
  >(functions, 'frameworkMigrateCompany');
  const res = await fn({ companyId, toPresetKey, mode, preset });
  const data = res.data;
  return {
    jobId: data.jobId,
    companyId: data.companyId,
    status: data.status,
    summary: data.summary,
  };
}

/**
 * Get migration job by id.
 */
export async function getMigrationJob(
  companyId: string,
  jobId: string
): Promise<FrameworkMigrationJob | null> {
  const raw = await getFrameworkMigrationJob(companyId, jobId);
  if (!raw) return null;
  return {
    jobId: raw.jobId,
    companyId: raw.companyId,
    fromPresetKey: raw.fromPresetKey,
    toPresetKey: raw.toPresetKey,
    status: raw.status as FrameworkMigrationJob['status'],
    mode: raw.mode as FrameworkMigrationJob['mode'],
    startedAt: raw.startedAt,
    finishedAt: raw.finishedAt,
    progress: raw.progress,
    summary: raw.summary,
    errors: raw.errors,
    reportRef: raw.reportRef,
  };
}

/**
 * Get migration report by job id.
 */
export async function getMigrationReport(
  companyId: string,
  jobId: string
): Promise<MigrationReport | null> {
  const raw = await getFrameworkMigrationReport(companyId, jobId);
  if (!raw) return null;
  return {
    jobId: raw.jobId,
    companyId: raw.companyId,
    issues: raw.issues as MigrationReport['issues'],
    reviewQueue: raw.reviewQueue as MigrationReport['reviewQueue'],
    createdContainers: raw.createdContainers,
    movedItems: raw.movedItems,
    generatedAt: raw.generatedAt,
  };
}

/**
 * Rollback a completed migration (callable). Reverses moves from move log.
 */
export async function rollbackMigration(companyId: string, jobId: string): Promise<void> {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase not configured');
  const functions = getFunctions(app, 'us-central1');
  const fn = httpsCallable<{ companyId: string; jobId: string }, void>(functions, 'frameworkRollbackCompany');
  await fn({ companyId, jobId });
}
