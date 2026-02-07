/**
 * Ensures at least one planning board exists for the company in the `boards` collection (idempotent).
 * Create-before-read: call before any board reads so the collection exists and the Planning Board page loads.
 */
import { listPlanningBoards, createPlanningBoard } from './boardService';

/**
 * Ensure a default planning board exists for the company.
 * - Query boards for (companyId == companyId AND type == "planning").
 * - If one exists: return its boardId.
 * - If none: create one and return the new boardId.
 * Idempotent; safe to call repeatedly. Logs created or reused board id once (DEV).
 */
export async function ensureDefaultPlanningBoard(
  companyId: string,
  uid: string
): Promise<string> {
  const boards = await listPlanningBoards(companyId);
  if (boards.length > 0) {
    if (import.meta.env.DEV) {
      console.log('[ensureDefaultPlanningBoard] reused board', boards[0].id);
    }
    return boards[0].id;
  }
  const boardId = await createPlanningBoard(companyId, uid);
  if (import.meta.env.DEV) {
    console.log('[ensureDefaultPlanningBoard] created board', boardId);
  }
  return boardId;
}
