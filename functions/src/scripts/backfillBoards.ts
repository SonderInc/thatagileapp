/**
 * One-time proactive backfill: create a default planning board in the `boards` collection
 * for each tenant (company) that does not have one. Safe to run multiple times (idempotent).
 *
 * Run from functions directory:
 *   npm run backfill:boards:dry   (default: dry-run, print only)
 *   npm run backfill:boards:apply (actually create boards)
 *
 * Options: --limit=N (default 100), --dry-run (default true), --apply
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or gcloud auth; project from .firebaserc default.
 */
import * as admin from 'firebase-admin';

const BOARDS_COLLECTION = 'boards';
const COMPANIES_COLLECTION = 'companies';
const DELAY_MS = 80;

function parseArgs(): { dryRun: boolean; limit: number } {
  const args = process.argv.slice(2);
  let dryRun = true;
  let limit = 100;
  for (const a of args) {
    if (a === '--apply') dryRun = false;
    else if (a.startsWith('--limit=')) limit = Math.max(1, parseInt(a.slice(8), 10) || 100);
    else if (a === '--dry-run') dryRun = true;
  }
  return { dryRun, limit };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const { dryRun, limit } = parseArgs();
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  const db = admin.firestore();

  const companiesSnap = await db.collection(COMPANIES_COLLECTION).limit(limit).get();
  const companyIds = companiesSnap.docs.map((d) => d.id);

  console.log(`[backfillBoards] ${dryRun ? 'DRY RUN' : 'APPLY'} | tenants: ${companyIds.length} (limit ${limit})`);

  let created = 0;
  let skipped = 0;
  for (const companyId of companyIds) {
    const existing = await db
      .collection(BOARDS_COLLECTION)
      .where('companyId', '==', companyId)
      .where('type', '==', 'planning')
      .limit(1)
      .get();

    if (!existing.empty) {
      skipped++;
    } else {
      if (dryRun) {
        console.log(`[backfillBoards] would create board for: ${companyId}`);
        created++;
      } else {
        const ref = await db.collection(BOARDS_COLLECTION).add({
          companyId,
          name: 'Planning Board',
          type: 'planning',
          teamIds: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: null,
        });
        console.log(`[backfillBoards] created ${ref.id} for: ${companyId}`);
        created++;
      }
    }
    await sleep(DELAY_MS);
  }

  console.log(`[backfillBoards] done. would_create/create: ${created}, skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
