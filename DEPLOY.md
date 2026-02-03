# Deploying thatagileapp (Netlify + GitHub)

## 1. GitHub setup

### Create a new repository on GitHub

1. Go to [github.com/new](https://github.com/new).
2. Name the repo (e.g. `thatagileapp`).
3. Choose **Public**, leave "Add a README" **unchecked** (you already have a repo locally).
4. Click **Create repository**.

### Connect your local repo and push

From the project root, run (replace `YOUR_USERNAME` and `REPO_NAME` with your GitHub username and repo name):

```bash
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

Or with SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## 2. Netlify setup

### Deploy from GitHub

1. Go to [app.netlify.com](https://app.netlify.com) and sign in (or create an account; you can use “Sign in with GitHub”).
2. Click **Add new site** → **Import an existing project**.
3. Choose **GitHub** and authorize Netlify if prompted.
4. Select the **thatagileapp** (or your repo name) repository.
5. Netlify will read `netlify.toml` in the repo, so you should see:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. Click **Deploy site**.

Builds will run automatically on every push to `main`. The site will get a URL like `https://random-name-123.netlify.app`. You can change it under **Site settings** → **Domain management**.

### Optional: custom domain

- In Netlify: **Site settings** → **Domain management** → **Add custom domain** (e.g. `thatagileapp.com`).
- Add the DNS records Netlify shows (either Netlify DNS or your current DNS provider).

---

## Summary

| Step              | Action |
|-------------------|--------|
| GitHub            | Create repo → `git remote add origin` → `git push -u origin main` |
| Netlify            | New site → Import from GitHub → Select repo → Deploy |
| Future updates     | Push to `main` → Netlify auto-deploys |

Build config is in **`netlify.toml`** (Node 20, `npm run build`, publish `dist`, SPA redirects). For Firebase and using your own database, see **`docs/DEPLOYMENT.md`** (env vars and in-app Settings).
