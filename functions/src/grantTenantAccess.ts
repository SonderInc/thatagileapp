/**
 * v2 Callable: grant the authenticated user access to a tenant (add tenantId to
 * users/{uid}.companyIds and optionally adminCompanyIds). No CORS—callable uses
 * Firebase SDK and includes the user's ID token automatically.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

export const grantTenantAccess = onCall(
  { region: "us-central1" },
  async (request) => {
    console.log("[grantTenantAccess] called", {
      uid: request.auth?.uid,
      tenantId: (request.data as { tenantId?: string })?.tenantId,
    });
    if (!request.auth?.uid) {
      throw new HttpsError(
        "unauthenticated",
        "Must be signed in."
      );
    }

    const uid = request.auth.uid;
    const data = request.data as { tenantId?: unknown; role?: unknown } | undefined;
    const tenantId =
      typeof data?.tenantId === "string" ? data.tenantId.trim() : "";
    const role =
      data?.role === "admin" ? "admin" : "member";

    if (!tenantId) {
      throw new HttpsError(
        "invalid-argument",
        "tenantId is required."
      );
    }

    try {
      const updates: Record<string, unknown> = {
        companyIds: admin.firestore.FieldValue.arrayUnion(tenantId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (role === "admin") {
        updates.adminCompanyIds =
          admin.firestore.FieldValue.arrayUnion(tenantId);
      }

      await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .set(updates, { merge: true });

      return {
        ok: true,
        tenantId,
        roleApplied: role,
      };
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error("grantTenantAccess error", e);
      throw new HttpsError(
        "internal",
        err?.message || "Unknown error"
      );
    }
  }
);
