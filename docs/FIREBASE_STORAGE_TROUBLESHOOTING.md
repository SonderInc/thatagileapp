# Firebase Storage upload troubleshooting (Netlify / CORS)

When uploads fail with “CORS policy: preflight request doesn’t pass access control check: It does not have HTTP ok status”, the cause is often **not** CORS but a non-2xx response (e.g. 403, 404). Fix bucket and rules first.

## Step 1 — Check actual HTTP status

1. Open DevTools → **Network**.
2. Trigger a logo upload and find the request to `firebasestorage.googleapis.com`.
3. Check the **OPTIONS** (preflight) request:
   - **Status 200/204:** Preflight succeeded; if the browser still blocks, it may be missing CORS headers (see [FIREBASE_STORAGE_CORS.md](FIREBASE_STORAGE_CORS.md)).
   - **Status 401:** Not authenticated — user must be signed in before upload; the app already guards this.
   - **Status 403:** Request blocked by **Firebase Storage Security Rules**. Ensure rules allow write to `tenants/{tenantId}/**` when `request.auth != null`.
   - **Status 404:** Wrong bucket or path. Compare the bucket in the request URL to Firebase Console.

4. Compare the **failing bucket in the URL** to Firebase Console:
   - Firebase Console → **Project settings** → **General** → **Your apps** → Firebase SDK snippet → `storageBucket`.
   - Or **Storage** → bucket name at the top.
   - Set `VITE_FIREBASE_STORAGE_BUCKET` (e.g. in Netlify env) to that exact value.

## Step 2 — Firebase Storage error codes (dev console)

In development, failed uploads log guidance:

| Code / hint | Meaning | Action |
|-------------|--------|--------|
| `storage/unauthenticated`, `storage/unauthorized` | 401, not authenticated | Ensure user is signed in; upload is guarded in app. |
| `storage/forbidden`, 403 in message | Blocked by Storage Rules | Publish rules that allow `tenants/{tenantId}/**` when `request.auth != null`. |
| `storage/object-not-found`, 404 | Wrong bucket/path | Set `VITE_FIREBASE_STORAGE_BUCKET` to match Firebase Console. |

## Step 3 — Storage Rules

Upload path is `tenants/{tenantId}/company-logo-*`. Rules must allow read/write for authenticated users only:

- `match /tenants/{tenantId}/{allPaths=**} { allow read, write: if request.auth != null; }`

Do **not** use `allow read, write: if true` in production. The repo’s **[storage.rules](../storage.rules)** is the source of truth; copy it to Firebase Console → **Storage** → **Rules** and publish. See also [THATAGILE_CLOUD_SETUP.md](THATAGILE_CLOUD_SETUP.md) step 5b.

## Step 4 — Only if OPTIONS is 2xx and CORS headers are missing

If the preflight returns 2xx but the browser still reports missing `Access-Control-Allow-Origin`, then apply bucket CORS per [FIREBASE_STORAGE_CORS.md](FIREBASE_STORAGE_CORS.md). Do not apply CORS to work around 403/404.

## Verification checklist

- [ ] DevTools Console shows `[Firebase] Storage bucket: <name>` and it matches Firebase Console (Project settings → General → Your apps, or Storage).
- [ ] DevTools Network: OPTIONS and POST to `firebasestorage.googleapis.com` return 2xx when upload succeeds.
- [ ] Upload succeeds from the Netlify origin (e.g. https://thatagileapp.netlify.app) with no CORS errors.
- [ ] Unauthenticated upload is blocked in app (no request sent); error: “Storage upload requires signed-in user”.
