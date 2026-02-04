/**
 * JSON backlog import: validates hierarchy (src/utils/hierarchy.ts), builds WorkItems,
 * sets parentId/childrenIds, and supports idempotency via metadata.importKey.
 */
import type { WorkItem, WorkItemType, WorkItemStatus } from '../../types';
import { canBeChildOf } from '../../utils/hierarchy';

const VALID_STATUSES: WorkItemStatus[] = [
  'funnel', 'backlog', 'analysis', 'prioritization', 'implementation', 'done',
  'intake', 'define', 'design', 'develop', 'release', 'operate',
  'program-backlog', 'validating', 'deploying', 'releasing',
  'demo', 'accepted', 'to-do', 'in-progress', 'archive',
];

function isValidStatus(s: string): s is WorkItemStatus {
  return VALID_STATUSES.includes(s as WorkItemStatus);
}

const VALID_TYPES: WorkItemType[] = ['company', 'product', 'epic', 'feature', 'user-story', 'task', 'bug'];
function isValidType(s: string): s is WorkItemType {
  return VALID_TYPES.includes(s as WorkItemType);
}

export interface ImportItemInput {
  importId: string;
  type: WorkItemType;
  title: string;
  status?: string;
  parentImportId?: string | null;
  fields?: {
    description?: string;
    size?: string;
    storyPoints?: number;
    acceptanceCriteria?: string;
    estimatedDays?: number;
    actualHours?: number;
    priority?: string | number;
    assignee?: string;
    tags?: string[];
    sprintId?: string;
    color?: string;
    /** In add-to-company mode, root company item: existing WorkItem id (must equal targetCompanyId). Do not create; map importId -> this id. */
    existingWorkItemId?: string;
  };
}

export interface ImportPayload {
  version: string;
  mode: 'create-company' | 'add-to-company';
  targetCompanyId?: string;
  items: ImportItemInput[];
}

export interface ValidationError {
  index?: number;
  importId?: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  countsByType: Record<WorkItemType, number>;
  previewTitles: string[];
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
  createdIds: string[];
}

/** Slugify importId for use in generated WorkItem.id (alphanumeric, dash, underscore). */
function slugifyImportId(importId: string): string {
  return importId.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 80);
}

/** Generate a deterministic WorkItem.id for an imported item (do not reuse importId). */
export function generateImportWorkItemId(companyId: string, importId: string): string {
  const slug = slugifyImportId(importId);
  return `import-${companyId}-${slug || 'item'}`;
}

/**
 * Validate JSON payload: structure, required fields, parent refs, hierarchy.
 */
export function validateImportPayload(payload: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const countsByType: Record<WorkItemType, number> = {
    company: 0,
    product: 0,
    epic: 0,
    feature: 0,
    'user-story': 0,
    task: 0,
    bug: 0,
  };
  const previewTitles: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: [{ message: 'Payload must be an object' }], countsByType, previewTitles };
  }
  const p = payload as Record<string, unknown>;
  if (!p.version || typeof p.version !== 'string') {
    errors.push({ message: 'Missing or invalid "version"' });
  }
  if (!p.mode || (p.mode !== 'create-company' && p.mode !== 'add-to-company')) {
    errors.push({ message: 'Missing or invalid "mode" (must be create-company or add-to-company)' });
  }
  if (p.mode === 'add-to-company' && p.targetCompanyId !== undefined && typeof p.targetCompanyId !== 'string') {
    errors.push({ message: '"targetCompanyId" must be a string when provided' });
  }
  if (!Array.isArray(p.items)) {
    errors.push({ message: 'Missing or invalid "items" (must be an array)' });
  }
  const items = (p.items || []) as ImportItemInput[];
  const importIdSet = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') {
      errors.push({ index: i, message: 'Item must be an object' });
      continue;
    }
    if (!item.importId || typeof item.importId !== 'string') {
      errors.push({ index: i, importId: item.importId as string, message: 'Item must have "importId" (string)' });
    } else {
      if (importIdSet.has(item.importId)) {
        errors.push({ index: i, importId: item.importId, message: `Duplicate importId: ${item.importId}` });
      }
      importIdSet.add(item.importId);
    }
    if (!item.type || !isValidType(item.type)) {
      errors.push({ index: i, importId: item?.importId, message: `Item must have "type" (one of: ${VALID_TYPES.join(', ')})` });
    } else {
      countsByType[item.type]++;
    }
    if (!item.title || typeof item.title !== 'string') {
      errors.push({ index: i, importId: item?.importId, message: 'Item must have "title" (string)' });
    } else if (previewTitles.length < 10) {
      previewTitles.push(item.title);
    }
    const parentImportId = item.parentImportId;
    if (parentImportId !== undefined && parentImportId !== null && typeof parentImportId !== 'string') {
      errors.push({ index: i, importId: item?.importId, message: 'parentImportId must be string or null' });
    }
  }

  const itemMap = new Map<string, ImportItemInput>();
  items.forEach((item) => {
    if (item?.importId && typeof item.importId === 'string') itemMap.set(item.importId, item);
  });

  const rootCompanies = items.filter(
    (it) => it?.type === 'company' && (it.parentImportId == null || it.parentImportId === '')
  );
  if (p.mode === 'add-to-company' && rootCompanies.length > 1) {
    errors.push({ message: 'In add-to-company mode, at most one root company item is allowed' });
  }
  if (p.mode === 'add-to-company' && rootCompanies.length === 1) {
    const root = rootCompanies[0]!;
    const existingId = root.fields?.existingWorkItemId;
    if (existingId === undefined || existingId === null || typeof existingId !== 'string') {
      errors.push({
        index: items.indexOf(root),
        importId: root.importId,
        message: 'Root company in add-to-company must have fields.existingWorkItemId (string) equal to targetCompanyId',
      });
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item?.importId || !item.type || !isValidType(item.type)) continue;
    const parentImportId = item.parentImportId ?? null;
    if (parentImportId === null || parentImportId === '') {
      if (item.type !== 'company') {
        errors.push({ index: i, importId: item.importId, message: 'Top-level item must be type "company"' });
      }
      continue;
    }
    const parent = itemMap.get(parentImportId);
    if (!parent) {
      errors.push({ index: i, importId: item.importId, message: `parentImportId "${parentImportId}" not found in items` });
      continue;
    }
    if (!isValidType(parent.type)) continue;
    if (!canBeChildOf(item.type as WorkItemType, parent.type as WorkItemType)) {
      errors.push({
        index: i,
        importId: item.importId,
        message: `Hierarchy violation: ${item.type} cannot be child of ${parent.type}`,
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    countsByType,
    previewTitles,
  };
}

/**
 * Topological order: parents before children (by parentImportId).
 * Preserves relative order of siblings from input array.
 */
function getCreationOrder(items: ImportItemInput[]): ImportItemInput[] {
  const byImportId = new Map<string, ImportItemInput>();
  items.forEach((i) => { if (i?.importId) byImportId.set(i.importId, i); });
  const ordered: ImportItemInput[] = [];
  const added = new Set<string>();

  function addWithAncestors(item: ImportItemInput) {
    const pid = item.parentImportId ?? null;
    if (pid && byImportId.has(pid) && !added.has(pid)) {
      addWithAncestors(byImportId.get(pid)!);
    }
    if (!added.has(item.importId!)) {
      added.add(item.importId!);
      ordered.push(item);
    }
  }

  items.forEach((item) => {
    if (item?.importId) addWithAncestors(item);
  });
  return ordered;
}

/**
 * Build one WorkItem from ImportItemInput (id generated; parentId resolved later).
 */
function buildWorkItem(
  input: ImportItemInput,
  companyId: string,
  importIdToWorkItemId: Map<string, string>,
  now: Date
): WorkItem {
  const id = generateImportWorkItemId(companyId, input.importId);
  const importKey = `${companyId}:${input.importId}`;
  const status = (input.status && isValidStatus(input.status)) ? input.status : 'backlog';
  const fields = input.fields ?? {};
  const priority = fields.priority;
  const priorityStr =
    priority === 'low' || priority === 'medium' || priority === 'high' || priority === 'critical'
      ? priority
      : typeof priority === 'number' ? 'medium' : undefined;

  const parentId = input.parentImportId ? importIdToWorkItemId.get(input.parentImportId) : undefined;

  const item: WorkItem = {
    id,
    type: input.type as WorkItemType,
    title: input.title.trim(),
    status: status as WorkItemStatus,
    createdAt: now,
    updatedAt: now,
    companyId,
    parentId,
    childrenIds: [],
    metadata: { importId: input.importId, importKey },
  };
  if (fields.description !== undefined) item.description = String(fields.description);
  if (fields.size !== undefined) item.size = fields.size as WorkItem['size'];
  if (fields.storyPoints !== undefined) item.storyPoints = fields.storyPoints;
  if (fields.acceptanceCriteria !== undefined) item.acceptanceCriteria = fields.acceptanceCriteria;
  if (fields.estimatedDays !== undefined) item.estimatedDays = fields.estimatedDays;
  if (fields.actualHours !== undefined) item.actualHours = fields.actualHours;
  if (priorityStr) item.priority = priorityStr;
  if (fields.assignee !== undefined) item.assignee = fields.assignee;
  if (fields.tags !== undefined) item.tags = Array.isArray(fields.tags) ? fields.tags.map(String) : undefined;
  if (fields.sprintId !== undefined) item.sprintId = fields.sprintId;
  if (fields.color !== undefined) item.color = fields.color;

  return item;
}

/**
 * Run import: create WorkItems in order, then update each parent's childrenIds.
 * Skips items that already exist (same metadata.importKey in existing items).
 */
export async function runImport(
  payload: ImportPayload,
  companyId: string,
  existingWorkItems: WorkItem[],
  addWorkItem: (item: WorkItem) => Promise<void>,
  updateWorkItem: (id: string, updates: Partial<WorkItem>) => Promise<void>
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, skipped: 0, errors: [], createdIds: [] };
  const validation = validateImportPayload(payload);
  if (!validation.ok) {
    result.errors = validation.errors.map((e) => e.importId ? `${e.importId}: ${e.message}` : e.message);
    return result;
  }

  const existingImportKeys = new Set(
    existingWorkItems
      .filter((w) => w.metadata?.importKey)
      .map((w) => w.metadata!.importKey!)
  );
  const importIdToWorkItemId = new Map<string, string>();
  const ordered = getCreationOrder(payload.items);
  const now = new Date();

  // add-to-company: register existing Company root placeholder (do not create; map importId -> companyId)
  const placeholder =
    payload.mode === 'add-to-company'
      ? payload.items.find(
          (it) =>
            it.type === 'company' &&
            (it.parentImportId == null || it.parentImportId === '') &&
            it.fields?.existingWorkItemId != null
        )
      : undefined;
  if (placeholder) {
    if (placeholder.fields!.existingWorkItemId !== companyId) {
      result.errors.push(
        `Company placeholder existingWorkItemId "${placeholder.fields!.existingWorkItemId}" must equal targetCompanyId "${companyId}"`
      );
      return result;
    }
    importIdToWorkItemId.set(placeholder.importId, companyId);
  }

  for (const input of ordered) {
    if (
      payload.mode === 'add-to-company' &&
      input.type === 'company' &&
      (input.parentImportId == null || input.parentImportId === '') &&
      input.fields?.existingWorkItemId != null
    ) {
      continue;
    }
    const importKey = `${companyId}:${input.importId}`;
    if (existingImportKeys.has(importKey)) {
      const existing = existingWorkItems.find((w) => w.metadata?.importKey === importKey);
      if (existing) importIdToWorkItemId.set(input.importId, existing.id);
      result.skipped++;
      continue;
    }
    const item = buildWorkItem(input, companyId, importIdToWorkItemId, now);
    importIdToWorkItemId.set(input.importId, item.id);
    try {
      await addWorkItem(item);
      existingImportKeys.add(importKey);
      result.created++;
      result.createdIds.push(item.id);
    } catch (err) {
      result.errors.push(`${input.importId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const childrenByParentId = new Map<string, string[]>();
  for (const input of ordered) {
    const parentId = input.parentImportId ? importIdToWorkItemId.get(input.parentImportId) : null;
    if (!parentId) continue;
    const childId = importIdToWorkItemId.get(input.importId);
    if (!childId) continue;
    const list = childrenByParentId.get(parentId) ?? [];
    if (!list.includes(childId)) list.push(childId);
    childrenByParentId.set(parentId, list);
  }

  const existingCompany = existingWorkItems.find((w) => w.id === companyId);

  for (const [parentId, childIds] of childrenByParentId) {
    let childrenIds: string[];
    if (placeholder && parentId === companyId) {
      const existing = existingCompany?.childrenIds ?? [];
      childrenIds = [...existing];
      for (const id of childIds) {
        if (!childrenIds.includes(id)) childrenIds.push(id);
      }
    } else {
      childrenIds = childIds;
    }
    try {
      await updateWorkItem(parentId, { childrenIds, updatedAt: new Date() });
    } catch (err) {
      result.errors.push(`Update childrenIds for ${parentId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
