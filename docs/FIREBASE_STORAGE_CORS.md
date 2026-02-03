# Firebase Storage CORS (only if needed)

Apply CORS **only** when proven:

- OPTIONS preflight returns **2xx** (check DevTools → Network), and
- The browser still blocks due to missing `Access-Control-Allow-Origin`.

If OPTIONS returns 401/403/404, fix [bucket config and Storage Rules](FIREBASE_STORAGE_TROUBLESHOOTING.md) first; CORS will not fix that.

## Apply CORS to the bucket

1. Use the **exact** bucket name from Firebase Console → **Storage** (or from the request URL: `firebasestorage.googleapis.com/v0/b/BUCKET_NAME/o`). Example: `thatagileapp.firebasestorage.app`.
2. From the project root, with [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed:

   ```bash
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   gcloud storage buckets update gs://YOUR_BUCKET --cors-file=storage-cors.json
   ```

   Or with gsutil: `gsutil cors set storage-cors.json gs://YOUR_BUCKET`

3. Verify: `gsutil cors get gs://YOUR_BUCKET` should print the CORS config.

The repo’s `storage-cors.json` uses `"origin": ["*"]` and the required methods/headers for uploads.
