/**
 * Callable Cloud Function: grant a user access to a tenant (add tenantId to users/{uid}.companyIds
 * and optionally adminCompanyIds). Writes are server-side only so Firestore rules can deny
 * client writes to companyIds/adminCompanyIds.
 *
 * Input: { tenantId: string, targetUid?: string, role?: 'member' | 'admin' }
 * - If targetUid omitted, defaults to caller (self-grant).
 * - role: 'admin' adds tenantId to adminCompanyIds as well; default 'member'.
 *
 * Authorization:
 * - Self-grant (targetUid === caller): allowed if caller is tenant owner (companies/{tenantId}.ownerUid),
 *   OR caller already has tenantId in companyIds or adminCompanyIds (idempotent),
 *   OR caller's profile.companies has an entry for this tenantId (legacy membership).
 * - Grant to another (targetUid provided): allowed only if caller's adminCompanyIds contains tenantId.
 */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

interface GrantTenantAccessData {
  tenantId?: string;
  targetUid?: string;
  role?: "member" | "admin";
}

export const grantTenantAccess = functions.https.onCall(
  async (data: GrantTenantAccessData, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in to grant tenant access"
      );
    }

    const callerUid = context.auth.uid;
    const tenantId =
      typeof data?.tenantId === "string" ? data.tenantId.trim() : "";
    const targetUid =
      typeof data?.targetUid === "string" && data.targetUid.trim()
        ? data.targetUid.trim()
        : callerUid;
    const role =
      data?.role === "admin" ? "admin" : "member";

    if (!tenantId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "tenantId is required"
      );
    }

    try {
      const usersRef = db.collection("users");
      const callerDoc = await usersRef.doc(callerUid).get();
      const callerData = callerDoc.exists ? callerDoc.data() : null;
      const callerCompanyIds = (callerData?.companyIds as string[] | undefined) ?? [];
      const callerAdminCompanyIds =
        (callerData?.adminCompanyIds as string[] | undefined) ?? [];
      const callerCompanies = (callerData?.companies as { companyId: string }[] | undefined) ?? [];
      const hasTenantInCompanyIds =
        callerCompanyIds.includes(tenantId) || callerAdminCompanyIds.includes(tenantId);
      const hasTenantInCompanies = callerCompanies.some(
        (c: { companyId: string }) => c.companyId === tenantId
      );

      if (targetUid !== callerUid) {
        if (!callerAdminCompanyIds.includes(tenantId)) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "Only an admin of this company can grant access to another user"
          );
        }
      } else {
        if (!hasTenantInCompanyIds && !hasTenantInCompanies) {
          const companyDoc = await db.collection("companies").doc(tenantId).get();
          const companyData = companyDoc.exists ? companyDoc.data() : null;
          const ownerUid =
            companyData?.ownerUid != null
              ? String(companyData.ownerUid)
              : undefined;
          if (ownerUid !== callerUid) {
            throw new functions.https.HttpsError(
              "permission-denied",
              "You do not have access to this company"
            );
          }
        }
      }

      const targetRef = usersRef.doc(targetUid);
      const updates: Record<string, unknown> = {
        companyIds: FieldValue.arrayUnion(tenantId),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (role === "admin") {
        (updates as Record<string, unknown>).adminCompanyIds =
          FieldValue.arrayUnion(tenantId);
      }

      await targetRef.set(updates, { merge: true });

      return { ok: true };
    } catch (err: unknown) {
      if (err instanceof functions.https.HttpsError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      functions.logger.error("grantTenantAccess failed", { err, message, callerUid, tenantId });
      throw new functions.https.HttpsError(
        "internal",
        `Grant tenant access failed: ${message}`
      );
    }
  }
);
