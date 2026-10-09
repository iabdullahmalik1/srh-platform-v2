# Publishing version 2 on GitHub Pages

Version 2 lives in its own folder (`F:\SRH Platform v2`) and goes into its own repository, `srh-platform-v2`. Version 1 (`F:\SRH Platform v2` and its repository) is not touched by anything below, and both sites can be online at the same time with different links.

The console runs entirely in the browser, so it can be hosted as a static website. GitHub Pages is free for public repositories and gives you a link such as `https://your-name.github.io/srh-platform-v2/` that anyone can open. The repository already contains the build workflow (`.github/workflows/deploy.yml`), so publishing is a one-time setup followed by a normal push.

Allow about 15 minutes for the first time.

## Before you start

- A GitHub account (free).
- The project folder on your computer (`F:\SRH Platform v2`).
- One of the two tools below. GitHub Desktop is the simpler choice if you do not use the command line.
  - **GitHub Desktop**: download from desktop.github.com and sign in with your GitHub account.
  - **Git command line**: download from git-scm.com, then use the "Git Bash" or PowerShell window.

Things to decide first:

| Decision | Recommendation | Why it matters |
| --- | --- | --- |
| Public or private repository | Public | GitHub Pages on a free account only publishes from public repositories. A private repository needs a paid GitHub plan (Pro, Team or Enterprise). The source code becomes visible in a public repository; the demo contains no real client data. |
| Repository name | `srh-platform-v2` | The name becomes part of the link. Use lower case letters and hyphens only. |
| Who can open the link | Anyone with the link | GitHub Pages sites are public even when the repository is private. Do not put real client data in the mock JSON files. |

## Step 0: Put the workflow file in place

The build instructions must sit in a hidden folder, `.github\workflows`, which was not copied into `F:\SRH Platform v2` for you. Create it once:

1. Open `F:\SRH Platform v2` in File Explorer.
2. Create a folder named `.github` (with the dot), and inside it a folder named `workflows`.
3. Copy `docs\github-pages-workflow.yml` into `.github\workflows` and rename the copy to `deploy.yml`.

In PowerShell the same three steps are:

```powershell
cd "F:\SRH Platform v2"
New-Item -ItemType Directory -Force .github\workflows
Copy-Item docs\github-pages-workflow.yml .github\workflows\deploy.yml
```

If you skip this, the fallback under Step 3 ("If the workflow file is missing") adds the same file on github.com.

## Step 1: Create the repository

1. Sign in at github.com and click **New** (the green button on the left, or the **+** menu at the top right, then **New repository**).
2. Repository name: `srh-platform-v2`.
3. Visibility: **Public**.
4. Leave "Add a README", ".gitignore" and "license" unticked, because the project already has these files.
5. Click **Create repository** and keep the page open.

## Step 2: Upload the project

### Option A: GitHub Desktop

1. Open GitHub Desktop, choose **File > Add local repository**, and select `F:\SRH Platform v2`.
2. It will say the folder is not a Git repository. Click **create a repository**, keep the name, and click **Create repository**.
3. Check the file list on the left. You should **not** see `node_modules`, `.next` or `out` folders; the `.gitignore` file excludes them. If they appear, stop and check that `.gitignore` is in the folder.
4. Type a summary such as `Version 2` and click **Commit to main**.
5. Click **Publish repository**. Untick **Keep this code private** (see the table above), and click **Publish repository**.

### Option B: Command line

Open a terminal in `F:\SRH Platform v2` and run, replacing `your-name` with your GitHub user name:

```bash
git init -b main
git add .
git commit -m "Version 2"
git remote add origin https://github.com/your-name/srh-platform-v2.git
git push -u origin main
```

If Git asks you to sign in, use your GitHub account in the browser window that opens.

## Step 3: Turn on GitHub Pages

1. On github.com, open the repository and go to **Settings > Pages** (left sidebar).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

That is the only setting needed. Do not choose "Deploy from a branch".

### If the workflow file is missing

The build instructions live in `.github/workflows/deploy.yml`. Windows hides folders that start with a dot in some views, and some copy tools skip them, so check on github.com that the repository shows a `.github` folder. If it does not:

1. Open the **Actions** tab and click **set up a workflow yourself**.
2. Name the file `deploy.yml` (GitHub places it in `.github/workflows/` automatically).
3. Paste the full contents of `docs/github-pages-workflow.yml` from the project and click **Commit changes**.

GitHub starts the first deployment straight away.

## Step 4: Run the first deployment

1. Open the **Actions** tab in the repository.
2. Select **Deploy to GitHub Pages** on the left. If the first run already started when you pushed, wait for it; otherwise click **Run workflow > Run workflow**.
3. The run takes 2 to 4 minutes. A green tick on both the "build" and "deploy" jobs means it worked.
4. The link appears on the "deploy" job and under **Settings > Pages**. It looks like:

```
https://your-name.github.io/srh-platform-v2/
```

Open it in a private browser window to see exactly what a new visitor sees: the sign-in screen with the environment and role picker.

## Updating the site

Every push to `main` rebuilds and republishes the site automatically.

- GitHub Desktop: make your changes, write a summary, click **Commit to main**, then **Push origin**.
- Command line: `git add .`, `git commit -m "Describe the change"`, `git push`.

The new version is live 2 to 4 minutes after the push.

## Sharing the link

- Send the link as it is. Visitors start at the sign-in screen and pick an environment and role, so no password is needed.
- Each visitor's actions (new orders, approvals, onboarded investors) are stored only in their own browser. Two people never see each other's changes.
- To return a browser to the original demo data, sign in and use **Settings > Reset demo data**.

## Using your own domain (optional)

To serve the site at an address such as `demo.srh.inc`:

1. In **Settings > Pages > Custom domain**, enter the domain and save.
2. At your DNS provider, add a `CNAME` record from `demo` to `your-name.github.io`.
3. In `.github/workflows/deploy.yml`, change the `NEXT_PUBLIC_BASE_PATH` line to an empty value (`NEXT_PUBLIC_BASE_PATH: ""`), because the site is then served from the root of the domain. Commit and push.
4. Tick **Enforce HTTPS** once GitHub has issued the certificate (usually within an hour).

The same empty base path applies if you name the repository `your-name.github.io`.

## If something goes wrong

| What you see | Cause and fix |
| --- | --- |
| The Actions run fails at "Install dependencies" | `package-lock.json` is missing from the repository. Make sure it was committed. |
| The run fails at "Type-check" | A code change introduced a type error. The log names the file and line. Run `npx tsc --noEmit` locally to reproduce it. |
| The "deploy" job says Pages is not enabled | Step 3 was skipped. Set **Source** to **GitHub Actions** and re-run the workflow. |
| The link shows a page without styling or broken images | The base path does not match the address. For `your-name.github.io/srh-platform-v2/` it must be `/srh-platform-v2`, which the workflow sets automatically from the repository name. For a custom domain it must be empty. |
| A GitHub 404 page | The first deployment has not finished, or the link is missing the repository name. Check **Settings > Pages** for the exact address. |
| A record created during the demo opens as "Page not found" after sharing its link | Records created in one browser exist only in that browser, so a link to a new order will not open on someone else's computer. Share links to the seeded records instead. |

## Alternative: Vercel

Vercel hosts Next.js projects with no build configuration and supports private repositories on its free Hobby plan.

1. Sign in at vercel.com with your GitHub account.
2. Click **Add New > Project**, pick the `srh-platform-v2` repository and click **Deploy**. Leave the default settings; no environment variables are needed.
3. The link looks like `https://srh-platform-v2.vercel.app`. Every push to `main` redeploys.

Vercel runs the normal Next.js build rather than the static export, so `NEXT_PUBLIC_BASE_PATH` and `STATIC_EXPORT` are not used there.

## Building locally (optional)

To check the static site on your own computer before pushing:

```bash
npm ci
npm run build:static
npx serve out
```

The site in `out` is served from the root, so leave `NEXT_PUBLIC_BASE_PATH` unset for this local check.
