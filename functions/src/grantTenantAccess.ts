/**
 * Callable Cloud Function (v2): grant a user access to a tenant (add tenantId to users/{uid}.companyIds
 * and optionally adminCompanyIds). Writes are server-side only so Firestore rules can deny
 * client writes to companyIds/adminCompanyIds.
 *
 * Deployed with invoker: "public" so the platform allows the request; auth is enforced in code.
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
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
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

export const grantTenantAccess = onCall<GrantTenantAccessData>(
  {
    region: "us-central1",
    cors: ["https://thatagileapp.com", "http://localhost:5173"],
    invoker: "public",
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError(
        "unauthenticated",
        "Must be signed in to grant tenant access"
      );
    }

    const callerUid = request.auth.uid;
    const data = request.data ?? {};
    const tenantId =
      typeof data.tenantId === "string" ? data.tenantId.trim() : "";
    const targetUid =
      typeof data.targetUid === "string" && data.targetUid.trim()
        ? data.targetUid.trim()
        : callerUid;
    const role = data?.role === "admin" ? "admin" : "member";

    if (!tenantId) {
      throw new HttpsError("invalid-argument", "tenantId is required");
    }

    try {
      const usersRef = db.collection("users");
      const callerDoc = await usersRef.doc(callerUid).get();
      const callerData = callerDoc.exists ? callerDoc.data() : null;
      const callerCompanyIds =
        (callerData?.companyIds as string[] | undefined) ?? [];
      const callerAdminCompanyIds =
        (callerData?.adminCompanyIds as string[] | undefined) ?? [];
      const callerCompanies =
        (callerData?.companies as { companyId: string }[] | undefined) ?? [];
      const hasTenantInCompanyIds =
        callerCompanyIds.includes(tenantId) ||
        callerAdminCompanyIds.includes(tenantId);
      const hasTenantInCompanies = callerCompanies.some(
        (c: { companyId: string }) => c.companyId === tenantId
      );

      if (targetUid !== callerUid) {
        if (!callerAdminCompanyIds.includes(tenantId)) {
          throw new HttpsError(
            "permission-denied",
            "Only an admin of this company can grant access to another user"
          );
        }
      } else {
        if (!hasTenantInCompanyIds && !hasTenantInCompanies) {
          const companyDoc = await db
            .collection("companies")
            .doc(tenantId)
            .get();
          const companyData = companyDoc.exists ? companyDoc.data() : null;
          const ownerUid =
            companyData?.ownerUid != null
              ? String(companyData.ownerUid)
              : undefined;
          if (ownerUid !== callerUid) {
            throw new HttpsError(
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
      if (err instanceof HttpsError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      logger.error("grantTenantAccess failed", {
        err,
        message,
        callerUid,
        tenantId,
      });
      throw new HttpsError(
        "internal",
        `Grant tenant access failed: ${message}`
      );
    }
  }
);
