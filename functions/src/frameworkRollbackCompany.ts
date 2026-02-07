/**
 * Callable: rollback a framework migration by reversing move log.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

async function isAdminForCompany(uid: string, companyId: string): Promise<boolean> {
  const snap = await db.collection("users").doc(uid).get();
  const data = snap.data();
  const adminIds = (data?.adminCompanyIds as string[] | undefined) ?? [];
  return adminIds.includes(companyId);
}

export const frameworkRollbackCompany = onCall(
  { region: "us-central1", invoker: "public" },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Must be signed in.");
    const uid = request.auth.uid;
    const body = request.data as { companyId?: string; jobId?: string };
    const companyId = typeof body?.companyId === "string" ? body.companyId.trim() : "";
    const jobId = typeof body?.jobId === "string" ? body.jobId.trim() : "";

    if (!companyId || !jobId) {
      throw new HttpsError("invalid-argument", "companyId and jobId are required.");
    }

    const isAdmin = await isAdminForCompany(uid, companyId);
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Only company admins can rollback migration.");
    }

    const jobRef = db
      .collection("companies")
      .doc(companyId)
      .collection("frameworkMigrations")
      .doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists || jobSnap.data()?.status !== "COMPLETED") {
      throw new HttpsError("failed-precondition", "Job not found or not in COMPLETED state.");
    }

    const movesSnap = await db
      .collection("companies")
      .doc(companyId)
      .collection("frameworkMigrationMoves")
      .doc(jobId)
      .collection("moves")
      .get();

    const moves = movesSnap.docs
      .map((d) => d.data())
      .sort((a, b) => {
        const ta = a.movedAt?.toMillis?.() ?? 0;
        const tb = b.movedAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
    for (const move of moves) {
      const itemId = move.itemId as string;
      const prev = (move.prev as { parentId: string | null }) ?? { parentId: null };
      const next = (move.next as { parentId: string | null }) ?? { parentId: null };
      await db.runTransaction(async (tx) => {
        tx.update(db.collection("workItems").doc(itemId), {
          parentId: prev.parentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (next.parentId) {
          const newParent = await tx.get(db.collection("workItems").doc(next.parentId));
          if (newParent.exists) {
            const children = ((newParent.data()?.childrenIds as string[]) ?? []).filter((id) => id !== itemId);
            tx.update(db.collection("workItems").doc(next.parentId), {
              childrenIds: children,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
        if (prev.parentId) {
          const oldParent = await tx.get(db.collection("workItems").doc(prev.parentId));
          if (oldParent.exists) {
            const children = ((oldParent.data()?.childrenIds as string[]) ?? []).concat(itemId);
            tx.update(db.collection("workItems").doc(prev.parentId), {
              childrenIds: children,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      });
    }

    await jobRef.update({
      status: "ROLLED_BACK",
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }
);
