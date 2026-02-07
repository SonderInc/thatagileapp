/**
 * Ensures the current user has tenant access (companyIds) via a trusted server path.
 * Calls the Firebase Callable grantTenantAccess so membership writes happen server-side.
 * In-flight guard prevents repeated retries for the same tenant.
 */
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp, isFirebaseConfigured } from "../lib/firebase";

export interface TenantMembershipError {
  code: string;
  message: string;
  details?: unknown;
}

const STABLE_ERROR_MESSAGE =
  "Unable to grant tenant access. Try again.";

/** In-flight guard: one promise per tenantId; cleared on settle so user can retry manually. */
const inFlightByTenant = new Map<string, Promise<void>>();

/**
 * Request the server to grant the current user access to the tenant (add tenantId to
 * users/{uid}.companyIds). Call after login/tenant selection and before loading
 * planning boards. Idempotent; safe to call when user already has access.
 * Concurrent calls for the same tenantId share one request; on failure the guard is
 * cleared so the user can retry.
 *
 * @throws {TenantMembershipError} On not configured, unauthenticated, or server error.
 */
export async function ensureTenantAccess(
  tenantId: string,
  options?: { role?: "member" | "admin" }
): Promise<void> {
  const key = tenantId.trim();
  if (!key) {
    throw {
      code: "INVALID_ARGUMENT",
      message: "tenantId is required",
    } as TenantMembershipError;
  }

  if (!isFirebaseConfigured()) {
    throw {
      code: "NOT_CONFIGURED",
      message: STABLE_ERROR_MESSAGE,
    } as TenantMembershipError;
  }

  const app = getFirebaseApp();
  if (!app) {
    throw {
      code: "NOT_CONFIGURED",
      message: STABLE_ERROR_MESSAGE,
    } as TenantMembershipError;
  }

  const existing = inFlightByTenant.get(key);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      console.log("[ensureTenantAccess] start", { tenantId: key });
      const functions = getFunctions(app, "us-central1");
      const grantTenantAccessFn = httpsCallable<
        { tenantId: string; role?: "member" | "admin" },
        { ok: boolean; tenantId: string; roleApplied: string }
      >(functions, "grantTenantAccess");

      await grantTenantAccessFn({
        tenantId: key,
        ...(options?.role === "admin" && { role: "admin" }),
      });

      console.log("[ensureTenantAccess] succeeded", { tenantId: key });
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "UNKNOWN";
      const rawMessage =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : err instanceof Error
            ? err.message
            : STABLE_ERROR_MESSAGE;
      console.log("[ensureTenantAccess] failed", {
        tenantId: key,
        code,
        message: rawMessage,
      });
      throw {
        code: code === "functions/permission-denied" ? "PERMISSION_DENIED" : code,
        message: STABLE_ERROR_MESSAGE,
        details: err,
      } as TenantMembershipError;
    } finally {
      inFlightByTenant.delete(key);
    }
  })();

  inFlightByTenant.set(key, promise);
  return promise;
}
