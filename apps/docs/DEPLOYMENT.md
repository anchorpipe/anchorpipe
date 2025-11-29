# Documentation Deployment Guide

This guide explains how to set up and manage automatic deployments of the anchorpipe documentation site to Vercel.

## Overview

The documentation site is automatically deployed to Vercel:

- **Production**: Deploys on every push to `main` branch
- **Preview**: Creates preview deployments for pull requests

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

### 2. Get Vercel Credentials

After creating the project, you need to get the following values:

#### VERCEL_TOKEN

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name it (e.g., "GitHub Actions - Documentation")
4. Set expiration (recommended: "No expiration" for CI/CD)
5. Copy the token (you'll only see it once)

#### VERCEL_ORG_ID (Optional - Only for Team Accounts)

**Note:** This is only required if you're using a Vercel team account. For personal accounts, you can skip this.

1. Go to your [Vercel Team Settings](https://vercel.com/teams)
2. Select your team/organization
3. The Organization ID is in the URL: `https://vercel.com/teams/[ORG_ID]/settings`
4. Or use the Vercel CLI: `vercel whoami` and check the output

**If you're using a personal account:** You can leave this secret empty or not set it at all. The workflow will work without it.

#### VERCEL_PROJECT_ID

1. Go to your project settings in Vercel
2. Navigate to "Settings" → "General"
3. The Project ID is listed under "Project ID"
4. Or use the Vercel CLI: `vercel ls` to list projects and their IDs

### 3. Configure GitHub Secrets

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

### 4. Configure Custom Domain (Optional)

1. In Vercel project settings, go to **Settings** → **Domains**
2. Add your custom domain: `docs.anchorpipe.dev`
3. Follow Vercel's DNS configuration instructions
4. Update your DNS provider with the required records:
   - Add a CNAME record: `docs` → `cname.vercel-dns.com`
   - Or add an A record as instructed by Vercel
5. Wait for DNS propagation (can take up to 48 hours)
6. Vercel will automatically provision an SSL certificate

## How It Works

### Workflow Triggers

The deployment workflow (`.github/workflows/docs-deploy.yml`) runs when:

- **Push to main**: Deploys to production
- **Pull request**: Creates a preview deployment
- **Manual trigger**: Can be triggered manually via GitHub Actions UI

The workflow only runs when files in these directories change:

- `apps/docs/`
- `docs/`
- `adr/`

### Deployment Process

1. **Checkout code**: Gets the latest code from GitHub
2. **Setup Node.js**: Installs Node.js 20
3. **Install dependencies**: Runs `npm install --legacy-peer-deps`
4. **Build documentation**: Runs `npm run build` in `apps/docs`
5. **Deploy to Vercel**:
   - Production: Uses `--prod` flag for main branch
   - Preview: Uses `--force` flag for PRs
6. **Comment on PR**: Adds preview URL to pull request (preview deployments only)

### Preview Deployments

When a pull request is opened or updated:

- A preview deployment is automatically created
- A comment is added to the PR with the preview URL
- The preview URL is updated when new commits are pushed
- Preview deployments are automatically cleaned up when the PR is closed

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
