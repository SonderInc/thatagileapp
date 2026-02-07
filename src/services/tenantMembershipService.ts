/**
 * Ensures the current user has tenant access (companyIds) via a trusted server path.
 * Calls the callable Cloud Function grantTenantAccess so membership writes happen
 * server-side; client no longer writes companyIds/adminCompanyIds.
 */
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp, isFirebaseConfigured } from "../lib/firebase";
import { useStore } from "../store/useStore";

export interface TenantMembershipError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Request the server to grant the current user access to the tenant (add tenantId to
 * users/{uid}.companyIds and optionally adminCompanyIds). Call after login/tenant
 * selection and before loading planning boards. Idempotent; safe to call when
 * user already has access.
 *
 * @param options.role - When 'admin', the callable also adds tenantId to adminCompanyIds (required for creating planning boards).
 *
 * @throws {TenantMembershipError} If Firebase not configured, or server returns permission-denied / other error.
 */
export async function ensureTenantAccess(
  tenantId: string,
  options?: { role?: "member" | "admin" }
): Promise<void> {
  const { currentTenantId, firebaseUser, currentUser } = useStore.getState();
  console.log("[ensureTenantAccess] start", {
    tenantId,
    currentTenantId,
    firebaseUser: !!firebaseUser,
    currentUser,
  });
  if (!tenantId?.trim()) {
    throw {
      code: "INVALID_ARGUMENT",
      message: "tenantId is required",
    } as TenantMembershipError;
  }

  if (!isFirebaseConfigured()) {
    throw {
      code: "NOT_CONFIGURED",
      message: "Firebase is not configured",
    } as TenantMembershipError;
  }

  const app = getFirebaseApp();
  if (!app) {
    throw {
      code: "NOT_CONFIGURED",
      message: "Firebase app is not available",
    } as TenantMembershipError;
  }

  const functions = getFunctions(app, "us-central1");
  const grantTenantAccessFn = httpsCallable<
    { tenantId: string; targetUid?: string; role?: "member" | "admin" },
    { ok: boolean }
  >(functions, "grantTenantAccess");

  const role = options?.role === "admin" ? "admin" : undefined;

  try {
    await grantTenantAccessFn({ tenantId: tenantId.trim(), ...(role && { role }) });
    console.log("[ensureTenantAccess] succeeded", { tenantId: tenantId.trim() });
  } catch (err: unknown) {
    console.log("[ensureTenantAccess] failed", { tenantId: tenantId.trim() });
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "UNKNOWN";
    const rawMessage =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : err instanceof Error
          ? err.message
          : "Failed to grant tenant access";
    console.error("[ensureTenantAccess] grantTenantAccess failed", { code, message: rawMessage });
    const message =
      code === "functions/permission-denied"
        ? "Access not provisioned. You don't have access to this company."
        : code === "functions/internal" || rawMessage === "internal"
          ? "Access not provisioned. Please try again or contact support."
          : rawMessage.startsWith("Access not provisioned")
            ? rawMessage
            : `Access not provisioned. ${rawMessage}`;
    throw {
      code: code === "functions/permission-denied" ? "PERMISSION_DENIED" : code,
      message,
      details: err,
    } as TenantMembershipError;
  }
}
