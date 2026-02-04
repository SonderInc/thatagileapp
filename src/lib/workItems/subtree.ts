import type { WorkItem } from '../../types';

/**
 * Collect all ids in the subtree rooted at rootId in delete order (deepest-first).
 * Uses childrenIds; safe to delete in this order so no orphaned childrenIds remain.
 */
export function collectSubtreeIdsInDeleteOrder(items: WorkItem[], rootId: string): string[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const result: string[] = [];

  function visit(id: string): void {
    const node = byId.get(id);
    if (!node) return;
    for (const childId of node.childrenIds ?? []) {
      visit(childId);
    }
    result.push(id);
  }

  visit(rootId);
  return result;
}

export interface SubtreeStats {
  products: number;
  epics: number;
  features: number;
  userStories: number;
  tasks: number;
  bugs: number;
}

export function getSubtreeStats(items: WorkItem[], ids: string[]): SubtreeStats {
  const idSet = new Set(ids);
  const subset = items.filter((i) => idSet.has(i.id));
  const stats: SubtreeStats = {
    products: 0,
    epics: 0,
    features: 0,
    userStories: 0,
    tasks: 0,
    bugs: 0,
  };
  for (const item of subset) {
    switch (item.type) {
      case 'product':
        stats.products++;
        break;
      case 'epic':
        stats.epics++;
        break;
      case 'feature':
        stats.features++;
        break;
      case 'user-story':
        stats.userStories++;
        break;
      case 'task':
        stats.tasks++;
        break;
      case 'bug':
        stats.bugs++;
        break;
      default:
        break;
    }
  }
  return stats;
}
