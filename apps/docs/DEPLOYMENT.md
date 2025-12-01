# Documentation Deployment Guide

This guide explains how to set up and manage automatic deployments of the anchorpipe documentation site to Vercel.

## Overview

The documentation site is automatically deployed to Vercel via **Vercel's GitHub integration**:

- **Production**: Deploys **only** on every push to `main` branch (this is your live site)
- **Preview**: Creates preview deployments for pull requests (temporary, separate from production)

:::note Important
Preview deployments are **NOT production**. They are temporary URLs that:

- Are only accessible via the preview URL
- Are automatically deleted when the PR is closed
- Do not affect your production site
- Help reviewers see changes before merging

**Production deployments only happen when code is merged to `main`.**
:::

:::tip
Vercel handles deployments automatically when the project is connected to GitHub.
The GitHub Actions workflow (`.github/workflows/docs-deploy.yml`) is optional and only adds PR comments with preview URLs.
If you prefer, you can rely entirely on Vercel's native GitHub integration.
:::

## Initial Setup

### 1. Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import the `anchorpipe/anchorpipe` GitHub repository
4. **IMPORTANT - Configure the project:**
   - **Framework Preset**: Other (or Docusaurus if available)
   - **Root Directory**: `apps/docs` ⚠️ **This is critical!** Set this to `apps/docs`
   - **Build Command**: Leave empty (will use `npm run build` from `apps/docs/vercel.json`)
   - **Output Directory**: `build` (relative to `apps/docs`)
   - **Install Command**: `npm install --legacy-peer-deps` (runs from root)
5. Click "Deploy"

**Why Root Directory is Important:**

- Setting Root Directory to `apps/docs` tells Vercel to treat `apps/docs` as the project root
- This prevents Vercel from trying to use Nx to build the entire monorepo
- The `apps/docs/vercel.json` file will be used for configuration

### 2. Configure Deployment Settings

Once you've imported the repository, Vercel will automatically:

- Deploy on every push to `main` (production) ✅ **This is your live site**
- Create preview deployments for pull requests (optional, see below)
- Add deployment status checks to PRs

**To disable preview deployments** (if you don't want them):

1. Go to your Vercel project settings
2. Navigate to **Settings** → **Git**
3. Under **Production Branch**, ensure it's set to `main`
4. Under **Preview Deployments**, you can:
   - **Disable for all branches**: Turn off preview deployments entirely
   - **Keep enabled**: Preview deployments help reviewers see changes (recommended)

**Recommendation**: Keep preview deployments enabled. They:

- Help reviewers see documentation changes before merging
- Are automatically cleaned up when PRs are closed
- Do not affect production
- Use minimal resources (only build when PRs are opened/updated)

### 3. Get Vercel Credentials (Optional - for PR comments)

If you want the GitHub Actions workflow to comment preview URLs on PRs, you need to get the following values:

#### VERCEL_TOKEN

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name it (e.g., "GitHub Actions - Documentation")
4. Set expiration (recommended: "No expiration" for CI/CD)
5. Copy the token (you'll only see it once)

#### VERCEL_ORG_ID (Optional - Only for Team Accounts)

**Note:** This is only required if you're using a Vercel team account.
For personal accounts, you can skip this.

1. Go to your [Vercel Team Settings](https://vercel.com/teams)
2. Select your team/organization
3. The Organization ID is in the URL: `https://vercel.com/teams/[ORG_ID]/settings`
4. Or use the Vercel CLI: `vercel whoami` and check the output

**If you're using a personal account:** You can leave this secret empty or not set it at all.
The workflow will work without it.

#### VERCEL_PROJECT_ID

1. Go to your project settings in Vercel
2. Navigate to "Settings" → "General"
3. The Project ID is listed under "Project ID"
4. Or use the Vercel CLI: `vercel ls` to list projects and their IDs

### 4. Configure GitHub Secrets (Optional)

1. Go to your GitHub repository: `https://github.com/anchorpipe/anchorpipe`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret" and add:
   - **Name**: `VERCEL_TOKEN` (Required)
     - **Value**: The token from step 2.1
   - **Name**: `VERCEL_PROJECT_ID` (Required)
     - **Value**: Your project ID from step 2.3
   - **Name**: `VERCEL_ORG_ID` (Optional - Only for Team Accounts)
     - **Value**: Your organization ID from step 2.2
     - **Note**: Only needed if you're using a Vercel team account. Personal accounts can skip this.

### 5. Configure Custom Domain (Optional)

1. In Vercel project settings, go to **Settings** → **Domains**
2. Add your custom domain: `docs.anchorpipe.dev`
3. Follow Vercel's DNS configuration instructions
4. Update your DNS provider with the required records:
   - Add a CNAME record: `docs` → `cname.vercel-dns.com`
   - Or add an A record as instructed by Vercel
5. Wait for DNS propagation (can take up to 48 hours)
6. Vercel will automatically provision an SSL certificate

## How It Works

### How Deployments Work

**Vercel handles deployments automatically** via GitHub integration:

1. **Push to `main`**: Vercel automatically deploys to **production** (your live site)
2. **Pull request**: Vercel automatically creates a **preview deployment** (temporary, separate URL)
3. **Deployment status**: Vercel adds deployment checks to PRs

**Key Points:**

- ✅ **Production only deploys from `main`** - Your live site is only updated when code is merged
- ✅ **Preview deployments are temporary** - They don't affect production and are deleted when PRs close
- ✅ **Preview deployments help reviewers** - They can see documentation changes before merging

The GitHub Actions workflow (`.github/workflows/docs-deploy.yml`) is **optional** and only:

- Fetches preview URLs from Vercel API
- Comments on PRs with preview URLs
- Updates existing comments when new commits are pushed

**Note**: If you don't configure GitHub secrets, Vercel will still deploy automatically. The workflow just won't add PR comments.

### Preview Deployments

When a pull request is opened or updated:

- A preview deployment is automatically created (separate from production)
- A comment is added to the PR with the preview URL
- The preview URL is updated when new commits are pushed
- Preview deployments are automatically cleaned up when the PR is closed
- **Preview deployments never affect your production site**

**To disable preview deployments:**

1. Go to Vercel project settings → **Settings** → **Git**
2. Under **Preview Deployments**, disable them
3. Note: This means reviewers won't be able to preview documentation changes before merging

## Manual Deployment

### Using GitHub Actions

1. Go to **Actions** tab in GitHub
2. Select "Deploy Documentation to Vercel" workflow
3. Click "Run workflow"
4. Select branch and click "Run workflow"

### Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from apps/docs directory
cd apps/docs
vercel --prod
```

## Troubleshooting

### Deployment Fails

**Issue**: Build fails in GitHub Actions

**Solutions**:

- Check build logs in GitHub Actions
- Test build locally: `cd apps/docs && npm run build`
- Verify all dependencies are installed correctly
- Check for broken links: `npm run build` will fail on broken links

### Secrets Not Configured

**Issue**: Workflow shows "Vercel secrets are not configured"

**Solutions**:

- Verify required secrets are set: `VERCEL_TOKEN` and `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID` is optional (only needed for team accounts)
- Check secret names match exactly
- Ensure secrets are not empty

### Build Fails with "Cannot find project 'docs'"

**Issue**: Vercel tries to run `nx build docs` and fails

**Solutions**:

- **Most Important**: Make sure Root Directory is set to `apps/docs` in Vercel project settings
- Go to Project Settings → General → Root Directory
- Set it to `apps/docs`
- This tells Vercel to use `apps/docs` as the project root, not the monorepo root
- Redeploy after changing the root directory

### Preview URL Not Commented

**Issue**: Preview deployment succeeds but no comment on PR

**Solutions**:

- Check GitHub Actions logs for errors
- Verify the workflow has permission to comment on PRs
- Check if the PR is from a fork (may have permission issues)

### Production Domain Shows Preview URL

**Issue**: GitHub deployments page shows a preview-style URL for production deployments instead of the production domain.

- Example: `anchorpipe-docs-xxx.vercel.app`

**Explanation**: This is **completely normal and expected behavior**. Here's what's happening:

1. **Vercel creates a unique deployment URL** for each deployment. The preview-style URL looks like `anchorpipe-docs-qkr3z6dgg-...vercel.app`.
2. **Your production domain** (`anchorpipe-docs.vercel.app`) is an **alias** that automatically points to the latest production deployment.
3. **Both URLs work** and point to the same deployment—they're just different ways to access it.
4. **GitHub shows the deployment URL** because that's what Vercel reports, but your production domain is configured separately.

**This is not a problem** - it's how Vercel works. The production domain is the one you should:

- Share with users
- Use in documentation
- Set as your primary URL

The preview-style URL in GitHub is just the unique identifier for that specific deployment. Both URLs work because they point to the same deployment.

**Solutions** (only if the production domain doesn't work):

1. **Verify Production Branch is Set Correctly**:
   - Go to Vercel project settings → **Settings** → **Git**
   - Under **Production Branch**, ensure it's set to `main`
   - If it's not `main`, change it and redeploy

2. **Verify Domain Assignment**:
   - Go to Vercel project settings → **Settings** → **Domains**
   - Ensure `anchorpipe-docs.vercel.app` is listed and shows "Valid Configuration"
   - The domain should show "Production" as its environment
   - If it shows "Preview" or another environment, click "Edit" and assign it to "Production"

3. **Test Production Domain**:
   - Visit `https://anchorpipe-docs.vercel.app` directly
   - It should show your production site (latest code from `main` branch)
   - **Both URLs work** - the preview-style URL and the production domain point to the same deployment
   - The production domain (`anchorpipe-docs.vercel.app`) is the one you should use and share
   - The preview-style URL in GitHub is just the unique deployment identifier—this is normal.

4. **Redeploy if Needed**:
   - If the domain isn't working, trigger a new production deployment:
     - Push a commit to `main`, or
     - Go to Vercel dashboard → Deployments → Find the latest production deployment → Click "..." → "Redeploy"

### Custom Domain Not Working

**Issue**: `docs.anchorpipe.dev` doesn't resolve

**Solutions**:

- Verify DNS records are configured correctly
- Check DNS propagation: `dig docs.anchorpipe.dev`
- Wait up to 48 hours for DNS propagation
- Verify domain is added in Vercel project settings
- Check SSL certificate status in Vercel dashboard

## Configuration Files

### `vercel.json`

Located in `apps/docs/vercel.json`, this file configures:

- Build command
- Output directory
- Security headers
- URL rewrites

### `.github/workflows/docs-deploy.yml`

The GitHub Actions workflow that:

- Triggers on code changes
- Builds the documentation
- Deploys to Vercel
- Comments on PRs with preview URLs

## Security

The deployment workflow includes:

- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- HTTPS enforcement (automatic with Vercel)
- Secure secret management (GitHub Secrets)

## Monitoring

- **Deployment Status**: Check GitHub Actions workflow runs
- **Vercel Dashboard**: View deployments, logs, and analytics
- **Build Logs**: Available in both GitHub Actions and Vercel dashboard

## Support

For issues or questions:

- Check [Vercel Documentation](https://vercel.com/docs)
- Review [GitHub Actions Documentation](https://docs.github.com/en/actions)
- Open an issue in the repository
