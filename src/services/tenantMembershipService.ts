/**
 * Ensures the current user has tenant access (companyIds) via a trusted server path.
 * Calls the HTTP Cloud Function grantTenantAccess with Bearer token so membership
 * writes happen server-side. In-flight guard prevents repeated retries for the same tenant.
 */
import { getAuth } from "../lib/adapters";
import {
  getFirebaseProjectId,
  isFirebaseConfigured,
} from "../lib/firebase";

export interface TenantMembershipError {
  code: string;
  message: string;
  details?: unknown;
}

const STABLE_ERROR_MESSAGE =
  "Unable to grant tenant access. Try again.";

/** In-flight guard: one promise per tenantId; cleared on settle so user can retry manually. */
const inFlightByTenant = new Map<string, Promise<void>>();

function getGrantTenantAccessUrl(): string {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw {
      code: "NOT_CONFIGURED",
      message: STABLE_ERROR_MESSAGE,
    } as TenantMembershipError;
  }
  return `https://us-central1-${projectId}.cloudfunctions.net/grantTenantAccess`;
}

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

  const existing = inFlightByTenant.get(key);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      console.log("[ensureTenantAccess] start", { tenantId: key });
      const token = await getAuth().getIdToken();
      if (!token) {
        throw {
          code: "UNAUTHENTICATED",
          message: STABLE_ERROR_MESSAGE,
        } as TenantMembershipError;
      }
      const url = getGrantTenantAccessUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId: key,
          ...(options?.role === "admin" && { role: "admin" }),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        message?: string;
      };
      if (!res.ok) {
        console.log("[ensureTenantAccess] failed", {
          tenantId: key,
          status: res.status,
          code: data.code,
          message: data.message,
        });
        throw {
          code: data.code || "UNKNOWN",
          message: STABLE_ERROR_MESSAGE,
          details: data,
        } as TenantMembershipError;
      }
      if (data.ok !== true) {
        throw {
          code: "UNKNOWN",
          message: STABLE_ERROR_MESSAGE,
          details: data,
        } as TenantMembershipError;
      }
      console.log("[ensureTenantAccess] succeeded", { tenantId: key });
    } finally {
      inFlightByTenant.delete(key);
    }
  })();

  inFlightByTenant.set(key, promise);
  return promise;
}
