/**
 * Board service: lists and creates planning board documents in the Firestore `boards` collection.
 * All access via the data store (no direct Firestore imports).
 */
import { getDataStore } from '../../lib/adapters';
import type { PlanningBoard } from '../../types';

/**
 * List planning boards for a company (boards where companyId == X and type == "planning").
 */
export async function listPlanningBoards(companyId: string): Promise<PlanningBoard[]> {
  return getDataStore().listPlanningBoardsFromBoards(companyId);
}

/**
 * Create a default planning board in the boards collection.
 * Schema: { companyId, type: "planning", name: "Planning Board", createdAt: serverTimestamp(), createdBy: uid }
 * Returns the new document id.
 */
export async function createPlanningBoard(companyId: string, uid: string): Promise<string> {
  return getDataStore().createDefaultPlanningBoard(companyId, uid);
}
