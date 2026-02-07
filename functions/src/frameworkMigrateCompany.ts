/**
 * Callable: run framework migration (DRY_RUN or APPLY). Idempotent, logs all moves for rollback.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { scanCompatibility, type PresetPayload, type WorkItemSnapshot } from "./lib/frameworkScan";

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

function isAdminForCompany(uid: string, companyId: string): Promise<boolean> {
  return db
    .collection("users")
    .doc(uid)
    .get()
    .then((snap) => {
      const data = snap.data();
      const adminIds = (data?.adminCompanyIds as string[] | undefined) ?? [];
      return adminIds.includes(companyId);
    });
}

async function getWorkItemsForCompany(companyId: string): Promise<WorkItemSnapshot[]> {
  const snap = await db
    .collection("workItems")
    .where("companyId", "==", companyId)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: (data.type as string) ?? "",
      parentId: data.parentId as string | null | undefined,
      companyId: (data.companyId as string) ?? "",
      title: data.title as string | undefined,
      childrenIds: data.childrenIds as string[] | undefined,
    };
  });
}

async function getCurrentPresetKey(companyId: string): Promise<string> {
  const ref = db.collection("companies").doc(companyId).collection("settings").doc("framework");
  const snap = await ref.get();
  const data = snap.data();
  return (data?.presetKey as string) ?? "safe-essential";
}

export const frameworkMigrateCompany = onCall(
  { region: "us-central1", invoker: "public" },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Must be signed in.");
    const uid = request.auth.uid;
    const body = request.data as {
      companyId?: string;
      toPresetKey?: string;
      mode?: "DRY_RUN" | "APPLY";
      preset?: PresetPayload;
    };
    const companyId = typeof body?.companyId === "string" ? body.companyId.trim() : "";
    const toPresetKey = typeof body?.toPresetKey === "string" ? body.toPresetKey.trim() : "";
    const mode = body?.mode === "APPLY" ? "APPLY" : "DRY_RUN";
    const preset = body?.preset as PresetPayload | undefined;

    if (!companyId || !toPresetKey) {
      throw new HttpsError("invalid-argument", "companyId and toPresetKey are required.");
    }
    if (!preset?.enabledTypes?.length || !preset?.hierarchy) {
      throw new HttpsError("invalid-argument", "preset.enabledTypes and preset.hierarchy are required.");
    }

    const isAdmin = await isAdminForCompany(uid, companyId);
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Only company admins can run framework migration.");
    }

    const fromPresetKey = await getCurrentPresetKey(companyId);
    const jobRef = db
      .collection("companies")
      .doc(companyId)
      .collection("frameworkMigrations")
      .doc();
    const jobId = jobRef.id;

    await jobRef.set({
      jobId,
      companyId,
      fromPresetKey,
      toPresetKey,
      status: "RUNNING",
      mode,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      progress: { total: 0, done: 0 },
      summary: {
        createdContainers: 0,
        movedItems: 0,
        flaggedForReview: 0,
        invalidItems: 0,
      },
    });

    try {
      const items = await getWorkItemsForCompany(companyId);
      const scan = scanCompatibility(items, preset);
      const highConfidenceMoves = scan.recommendedMoves.filter((m) => m.confidence === "HIGH");

      const reportRef = db
        .collection("companies")
        .doc(companyId)
        .collection("frameworkMigrationReports")
        .doc(jobId);
      const movesCol = db
        .collection("companies")
        .doc(companyId)
        .collection("frameworkMigrationMoves")
        .doc(jobId)
        .collection("moves");

      const movedItems: Array<{ itemId: string; fromParentId: string | null; toParentId: string | null }> = [];
      let moveIndex = 0;

      if (mode === "APPLY") {
        for (const move of highConfidenceMoves) {
          const itemSnap = await db.collection("workItems").doc(move.itemId).get();
          if (!itemSnap.exists) continue;
          const itemData = itemSnap.data()!;
          const prevParentId = (itemData.parentId as string | null) ?? null;
          const nextParentId = move.toParentId;

          await db.runTransaction(async (tx) => {
            tx.update(db.collection("workItems").doc(move.itemId), {
              parentId: nextParentId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            if (prevParentId) {
              const oldParent = await tx.get(db.collection("workItems").doc(prevParentId));
              if (oldParent.exists) {
                const children = ((oldParent.data()?.childrenIds as string[]) ?? []).filter((id) => id !== move.itemId);
                tx.update(db.collection("workItems").doc(prevParentId), {
                  childrenIds: children,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
            }
            if (nextParentId) {
              const newParent = await tx.get(db.collection("workItems").doc(nextParentId));
              if (newParent.exists) {
                const children = ((newParent.data()?.childrenIds as string[]) ?? []).concat(move.itemId);
                tx.update(db.collection("workItems").doc(nextParentId), {
                  childrenIds: children,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
            }
            const moveDocRef = movesCol.doc(String(moveIndex));
            tx.set(moveDocRef, {
              itemId: move.itemId,
              prev: { parentId: prevParentId },
              next: { parentId: nextParentId },
              movedAt: admin.firestore.FieldValue.serverTimestamp(),
              movedBy: uid,
            });
          });
          movedItems.push({
            itemId: move.itemId,
            fromParentId: prevParentId,
            toParentId: nextParentId,
          });
          moveIndex++;
        }
      }

      await reportRef.set({
        jobId,
        companyId,
        issues: scan.issues,
        reviewQueue: scan.reviewQueue,
        createdContainers: [],
        movedItems,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await jobRef.update({
        status: "COMPLETED",
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        progress: { total: items.length, done: items.length },
        summary: {
          createdContainers: 0,
          movedItems: movedItems.length,
          flaggedForReview: scan.reviewQueue.length,
          invalidItems: scan.issues.filter((i) => i.severity === "ERROR").length,
        },
        reportRef: reportRef.path,
      });

      const summary = {
        createdContainers: 0,
        movedItems: movedItems.length,
        flaggedForReview: scan.reviewQueue.length,
        invalidItems: scan.issues.filter((i) => i.severity === "ERROR").length,
      };
      return { jobId, companyId, status: "COMPLETED", summary };
    } catch (e) {
      const err = e as Error;
      console.error("frameworkMigrateCompany error", e);
      await jobRef.update({
        status: "FAILED",
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        errors: [err?.message ?? String(e)],
      });
      throw new HttpsError("internal", err?.message ?? "Migration failed.");
    }
  }
);
