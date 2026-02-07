/**
 * Compatibility scan for framework migration. No preset-specific branching.
 * Input: work items + target preset (enabledTypes, hierarchy). Output: issues, review queue, recommended moves.
 */

export interface PresetPayload {
  enabledTypes: string[];
  hierarchy: Record<string, string[]>;
}

export interface WorkItemSnapshot {
  id: string;
  type: string;
  parentId?: string | null;
  companyId: string;
  title?: string;
  childrenIds?: string[];
}

export interface ScanIssue {
  type: "INVALID_PARENT" | "MISSING_CONTAINER" | "DISABLED_TYPE" | "BOARD_CONFIG_MISMATCH";
  severity: "INFO" | "WARN" | "ERROR";
  itemId?: string;
  itemType?: string;
  message: string;
  suggestion?: unknown;
}

export interface ReviewItem {
  itemId: string;
  itemType: string;
  reason: string;
  suggestedActions: unknown[];
}

export interface RecommendedMove {
  itemId: string;
  fromParentId: string | null;
  toParentId: string | null;
  confidence: "HIGH" | "LOW";
}

export interface ScanResult {
  issues: ScanIssue[];
  reviewQueue: ReviewItem[];
  recommendedMoves: RecommendedMove[];
}

function getProductId(itemId: string, items: WorkItemSnapshot[]): string | null {
  let current = items.find((i) => i.id === itemId);
  while (current) {
    if (current.type === "product") return current.id;
    current = current.parentId ? items.find((i) => i.id === current!.parentId) ?? undefined : undefined;
  }
  return null;
}

function isAllowedChild(parentType: string, childType: string, hierarchy: Record<string, string[]>): boolean {
  const allowed = hierarchy[parentType];
  if (!Array.isArray(allowed)) return false;
  return allowed.includes(childType);
}

/**
 * Run compatibility scan. Deterministic moves only when confidence is HIGH.
 */
export function scanCompatibility(
  items: WorkItemSnapshot[],
  preset: PresetPayload
): ScanResult {
  const enabledSet = new Set(preset.enabledTypes);
  const hierarchy = preset.hierarchy;
  const issues: ScanIssue[] = [];
  const reviewQueue: ReviewItem[] = [];
  const recommendedMoves: RecommendedMove[] = [];

  for (const item of items) {
    if (!enabledSet.has(item.type)) {
      issues.push({
        type: "DISABLED_TYPE",
        severity: "WARN",
        itemId: item.id,
        itemType: item.type,
        message: `Item type "${item.type}" is not in preset enabled types`,
      });
    }

    const parent = item.parentId ? items.find((i) => i.id === item.parentId) : null;
    if (item.parentId && !parent) {
      issues.push({
        type: "INVALID_PARENT",
        severity: "ERROR",
        itemId: item.id,
        message: `Parent ${item.parentId} not found`,
      });
      reviewQueue.push({
        itemId: item.id,
        itemType: item.type,
        reason: "Missing parent",
        suggestedActions: [{ action: "reparent", options: "find_valid_parent" }],
      });
      continue;
    }

    if (parent && !isAllowedChild(parent.type, item.type, hierarchy)) {
      issues.push({
        type: "INVALID_PARENT",
        severity: "ERROR",
        itemId: item.id,
        itemType: item.type,
        message: `Parent type "${parent.type}" cannot have child type "${item.type}" in preset`,
      });
      const productId = getProductId(item.id, items);
      const candidates = items.filter(
        (other) =>
          other.companyId === item.companyId &&
          other.id !== item.id &&
          enabledSet.has(other.type) &&
          isAllowedChild(other.type, item.type, hierarchy)
      );
      const underSameProduct = productId
        ? candidates.filter((c) => getProductId(c.id, items) === productId)
        : candidates;
      const deterministic = underSameProduct.length === 1 ? underSameProduct[0] : candidates.length === 1 ? candidates[0] : null;
      if (deterministic) {
        recommendedMoves.push({
          itemId: item.id,
          fromParentId: item.parentId ?? null,
          toParentId: deterministic.id,
          confidence: underSameProduct.length === 1 ? "HIGH" : "LOW",
        });
      } else {
        reviewQueue.push({
          itemId: item.id,
          itemType: item.type,
          reason: "Invalid parent; multiple or no candidate new parents",
          suggestedActions: [{ action: "reparent", candidates: candidates.length }],
        });
      }
    }
  }

  return { issues, reviewQueue, recommendedMoves };
}
