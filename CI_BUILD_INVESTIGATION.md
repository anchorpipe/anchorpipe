# CI Build Investigation - Redis Rate Limiting

## Current Status
The CI build job is failing with exit code 1 at the "Build web app" step. The build passes locally on Windows but fails on Ubuntu in CI.

## PR Link
https://github.com/anchorpipe/anchorpipe/pull/270

## Failed CI Runs
- CI Build: https://github.com/anchorpipe/anchorpipe/actions/runs/19667116463/job/56326681375?pr=270
- Docker Build: https://github.com/anchorpipe/anchorpipe/actions/runs/19667116463

## Questions for Investigation

### 1. What is the actual error message?
Can you access the full CI logs and paste the exact error output from the "Build web app" step? The web search results only show "Process completed with exit code 1" but not the actual error.

### 2. Is this a module resolution issue?
The `@anchorpipe/redis` package is a workspace package that imports `ioredis`. Possible issues:
- Does npm workspaces properly symlink `libs/redis` on Linux?
- Is the `exports: "./src/index.ts"` in `libs/redis/package.json` causing issues with Next.js bundler?
- Should we use `exports: { ".": "./src/index.ts" }` instead?

### 3. Is this a TypeScript/transpilation issue?
The redis lib uses:
```json
{
  "type": "module",
  "exports": "./src/index.ts"
}
```
This means Next.js needs to transpile the TypeScript source. The `transpilePackages: ['@anchorpipe/*']` in `next.config.mjs` should handle this, but maybe it's not working in CI.

### 4. Environment differences
- CI runs on `ubuntu-latest` with Node 20
- CI does `npm install --legacy-peer-deps` at root, then `cd apps/web && npm install --legacy-peer-deps`
- Local Windows build passes

## Files Changed in This PR

### New Files
- `libs/redis/src/index.ts` - Re-exports redis client
- `libs/redis/src/lib/redis.ts` - ioredis client factory
- `libs/redis/package.json` - Package config with `type: module`
- `adr/0015-redis-rate-limiting.md` - Architecture decision record

### Modified Files
- `apps/web/src/lib/server/rate-limit.ts` - Now imports from `@anchorpipe/redis`
- `apps/web/src/middleware.ts` - Uses new rate limiting
- `apps/web/package.json` - Added `@anchorpipe/redis` dependency
- `apps/web/Dockerfile` - Added redis lib to build
- `.github/workflows/ci.yml` - Added redis lib install step

## Potential Fixes to Try

### Option A: Change exports format
```json
// libs/redis/package.json
{
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  }
}
```

### Option B: Add tsconfig.json copy to Dockerfile
```dockerfile
COPY libs/redis/tsconfig.json ./libs/redis/tsconfig.json
```

### Option C: Pre-compile the redis lib
Build the redis lib to JS before the web app build.

### Option D: Use relative import instead of workspace package
Change `@anchorpipe/redis` to a relative import path in the rate-limit.ts file.

## Request
Please paste the full error log from the CI build step so we can identify the exact failure point.

