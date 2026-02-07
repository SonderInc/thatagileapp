/**
 * v2 HTTP onRequest: grant the authenticated user access to a tenant (add tenantId to
 * users/{uid}.companyIds). Explicit CORS so OPTIONS preflight returns 204 with
 * Access-Control-Allow-Origin. Auth via Authorization: Bearer <idToken>.
 *
 * Deployed with invoker: "public" so Cloud Run answers OPTIONS; auth enforced in code.
 */
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

const ALLOWED_ORIGINS = new Set([
  "https://thatagileapp.com",
  "http://localhost:5173",
]);

export const grantTenantAccess = onRequest(
  {
    region: "us-central1",
    invoker: "public",
  },
  async (req, res) => {
    const origin = req.get("origin") || "";
    if (ALLOWED_ORIGINS.has(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
    }
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      if (req.method !== "POST") {
        res.status(405).json({ code: "METHOD_NOT_ALLOWED" });
        return;
      }

      const authHeader = req.get("authorization") || "";
      const match = authHeader.match(/^Bearer (.+)$/);
      if (!match) {
        res.status(401).json({ code: "UNAUTHENTICATED", message: "Missing Bearer token" });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(match[1]);

      const tenantId = req.body?.tenantId;
      if (!tenantId || typeof tenantId !== "string") {
        res.status(400).json({ code: "INVALID_ARGUMENT", message: "tenantId required" });
        return;
      }

      await admin
        .firestore()
        .collection("users")
        .doc(decoded.uid)
        .set(
          {
            companyIds: admin.firestore.FieldValue.arrayUnion(tenantId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      res.status(200).json({ ok: true });
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error("grantTenantAccess error", e);
      res
        .status(500)
        .json({ code: "INTERNAL", message: err?.message || "Unknown error" });
    }
  }
);
