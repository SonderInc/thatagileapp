# ThatAgile Cloud setup walkthrough

ThatAgile Cloud is **one Firebase project** you configure for the app. Once it's set up, every new company uses it automatically (multi-tenant in the same project). No per-company Firebase setup.

---

## 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/) and sign in (or create a Google account).
2. Click **Add project** (or **Create a project**).
3. Enter a name (e.g. **ThatAgile Cloud**), accept terms, optionally disable Google Analytics, then **Create project**.
4. When the project is ready, click **Continue** to open the project.

---

## 2. Enable Authentication (Email/Password)

1. In the left sidebar, open **Build** → **Authentication**.
2. Click **Get started**.
3. Open the **Sign-in method** tab.
4. Click **Email/Password**, turn **Enable** on, then **Save**.

No need to enable "Email link" or other providers unless you add them later.

---

## 3. Create a web app and get config

1. In Project overview (home), click the **Web** icon (`</>`) to add a web app.
2. Register the app with a nickname (e.g. **ThatAgile Web**). Do **not** enable Firebase Hosting for this walkthrough.
3. Click **Register app**, then copy the `firebaseConfig` object shown (or leave the console open).
4. You will need: **apiKey**, **authDomain**, **projectId**, **storageBucket**, **messagingSenderId**, **appId**. Optional: **measurementId** if you enable Analytics.

---

## 4. Authorize your app domain (Authentication)

1. In **Authentication** → **Settings** (or **Sign-in method** → **Authorized domains**).
2. Ensure your app's domain is listed, e.g.:
   - **localhost** (for local dev)
   - Your production domain (e.g. **thatagileapp.com**, **yoursite.netlify.app**).
3. Add any domain where the app will run; Firebase only allows sign-in from these domains.

---

## 5. Create Firestore and deploy rules

1. In the left sidebar, open **Build** → **Firestore Database**.
2. Click **Create database**.
3. Choose **Start in production mode** (we'll add rules next). Pick a region and **Enable**.
4. After the database is created, open the **Rules** tab.
5. Replace the default rules with the contents of **firestore.rules** in this repo (copy the full file from the project root).
6. Click **Publish**.

The rules allow:
- **companies**, **workItems**, **users**: read/write when authenticated.
- **invites**: read by anyone (for invite links); create/update/delete as in the file.
- **licences**: read and update when authenticated (for licence redemption).

---

## 5b. Enable Storage (for company logo uploads)

1. In the left sidebar, open **Build** → **Storage**.
2. Click **Get started**, choose **Start in production mode**, pick a location, then **Done**.
3. Open the **Rules** tab and replace with rules that allow authenticated users to read/write under `tenants/` (e.g. so company logos can be uploaded and served):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tenants/{tenantId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. Click **Publish**.

5. **Configure CORS** so the browser can upload from your app origin (e.g. thatagileapp.netlify.app). Otherwise you’ll see “blocked by CORS policy” when uploading a logo.
   - Your Firebase Storage bucket name is in Firebase Console → Storage → Files (e.g. `your-project.firebasestorage.app` or `your-project.appspot.com`).
   - In the project root there is **storage-cors.json**. Edit it if your app runs on other origins (add your Netlify/custom domain and localhost).
   - Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and log in: `gcloud auth login`.
   - Apply CORS (replace `YOUR_BUCKET` with your bucket name):
     - **gcloud (recommended):** `gcloud storage buckets update gs://YOUR_BUCKET --cors-file=storage-cors.json`
     - **gsutil:** `gsutil cors set storage-cors.json gs://YOUR_BUCKET`
   - After this, logo uploads from your deployed app and localhost should succeed.

---

## 6. Set environment variables for the app

Use the Firebase config from step 3. For **local development**:

1. In the project root, copy **.env.example** to **.env.local**.
2. Fill in (no quotes needed):

```bash
VITE_DEPLOYMENT_MODE=saas
VITE_APP_BASE_URL=
VITE_API_BASE_URL=
VITE_AUTH_PROVIDER=firebase
VITE_DATA_PROVIDER=firestore
VITE_STORAGE_PROVIDER=firebase

VITE_FIREBASE_API_KEY=<your apiKey>
VITE_FIREBASE_AUTH_DOMAIN=<your authDomain>
VITE_FIREBASE_PROJECT_ID=<your projectId>
VITE_FIREBASE_STORAGE_BUCKET=<your storageBucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your messagingSenderId>
VITE_FIREBASE_APP_ID=<your appId>
```

Optional: `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_FIREBASE_ANALYTICS_ENABLED` for Analytics.

3. Restart the dev server: `npm run dev`. The app will use ThatAgile Cloud (this Firebase project).

---

## 7. Deploy the app (e.g. Netlify)

1. Push the app to GitHub and connect the repo to Netlify (see [DEPLOY.md](../DEPLOY.md)).
2. In Netlify: **Site settings** → **Environment variables**.
3. Add the same variables as in step 6 (`VITE_FIREBASE_*`, etc.). Set `VITE_APP_BASE_URL` to your live URL (e.g. `https://thatagileapp.com`).
4. Trigger a new deploy (or push to `main`). The built app will use the env vars and talk to your Firebase project.

---

## 8. (Optional) Custom domain and DNS

To use a domain like **thatagileapp.com**, follow the "Custom domain and DNS" section in [DEPLOYMENT.md](DEPLOYMENT.md). Then add that domain to Firebase **Authentication → Authorized domains** (step 4).

---

## Summary

| Step | Where | What |
|------|--------|------|
| 1 | Firebase Console | Create project |
| 2 | Authentication | Enable Email/Password |
| 3 | Project settings | Add web app, copy config |
| 4 | Authentication | Add authorized domains |
| 5 | Firestore | Create DB, paste and publish firestore.rules |
| 5b | Storage | Enable Storage, add rules for `tenants/`; apply CORS with storage-cors.json |
| 6 | Local | `.env.local` with `VITE_FIREBASE_*` |
| 7 | Netlify (or host) | Same env vars, deploy |
| 8 | Optional | Custom domain + add to Auth domains |

After this, the app is using **ThatAgile Cloud** (your single Firebase project). New companies that register are just new tenants in the same project; no extra Firebase configuration per company.
