#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse as parseJsonc } from 'jsonc-parser';
import { lint as markdownlint } from 'markdownlint/promise';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const binExt = process.platform === 'win32' ? '.cmd' : '';
const command = process.argv[2] ?? 'all';
const extraArgs = process.argv.slice(3);
const scope = extraArgs.includes('--all') ? 'all' : 'changed';

function log(message) {
  console.log(`[docs:validate] ${message}`);
}

function run(command, args, { cwd = repoRoot, stdio = 'inherit' } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio,
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status !== 0) {
    const cmd = [command, ...args].join(' ');
    throw new Error(`Command failed (${cmd})`);
  }

  return result;
}

function runAndCapture(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  if (result.status !== 0) {
    const cmd = [command, ...args].join(' ');
    throw new Error(`Command failed (${cmd}): ${result.stderr}`);
  }

  return result.stdout.trim();
}

function gitHasRef(ref) {
  const result = spawnSync('git', ['rev-parse', '--verify', '--quiet', ref], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
  return result.status === 0;
}

function rootDocPath(file) {
  if (!file.endsWith('.md') && !file.endsWith('.mdx')) {
    return false;
  }
  return !file.includes('/');
}

function isDocPath(file) {
  return (
    file.startsWith('apps/docs/docs/') ||
    file.startsWith('docs/') ||
    file.startsWith('adr/') ||
    (file.startsWith('apps/docs/') && !file.slice('apps/docs/'.length).includes('/') && (file.endsWith('.md') || file.endsWith('.mdx'))) ||
    rootDocPath(file)
  );
}

function listDocFiles() {
  if (scope === 'all') {
    const output = runAndCapture('git', ['ls-files']);
    return output.split(/\r?\n/).filter(Boolean).filter(isDocPath);
  }

  let baseRef = process.env.GITHUB_BASE_REF || 'origin/main';
  if (!gitHasRef(baseRef)) {
    baseRef = 'main';
  }
  if (!gitHasRef(baseRef)) {
    const commits = runAndCapture('git', ['rev-list', '--max-parents=0', 'HEAD']).split(/\r?\n/);
    baseRef = commits.pop();
  }
  const mergeBase = runAndCapture('git', ['merge-base', baseRef, 'HEAD']);
  const diff = runAndCapture('git', ['diff', '--name-only', `${mergeBase}...HEAD`]);
  return diff.split(/\r?\n/).filter(Boolean).filter(isDocPath);
}

function loadMarkdownlintConfig() {
  const configPath = path.join(repoRoot, '.markdownlint-cli2.jsonc');
  const raw = readFileSync(configPath, 'utf-8');
  return { configPath, data: parseJsonc(raw) };
}

async function runMarkdownlint(files) {
  if (scope !== 'all' && !files.length) {
    log('No documentation files changed; skipping markdownlint');
    return;
  }

  const { data } = loadMarkdownlintConfig();
  const config = data.config || {};
  const targetFiles = scope === 'all' ? files : files;

  log(
    scope === 'all'
      ? `Running markdownlint on ${targetFiles.length} file(s) (full scan)`
      : `Running markdownlint on ${targetFiles.length} changed file(s)`
  );

  const results = await markdownlint({
    files: targetFiles,
    config,
  });

  const output = results.toString().trim();
  if (output) {
    console.error(output);
    throw new Error('Markdownlint failed');
  }
}

function runCspell(files) {
  if (!files.length) {
    log('No documentation files changed; skipping cspell');
    return;
  }
  const bin = path.join(repoRoot, 'node_modules', '.bin', `cspell${binExt}`);
  log(`Running cspell on ${files.length} file(s)`);
  run(bin, ['lint', ...files]);
}

function runBuild() {
  log('Building docs (fails on broken links)');
  run('npm', ['run', 'docs:build']);
}

async function main() {
  const docFiles = listDocFiles();

  switch (command) {
    case 'lint':
      await runMarkdownlint(docFiles);
      break;
    case 'spell':
      runCspell(docFiles);
      break;
    case 'build':
      runBuild();
      break;
    case 'all':
      await runMarkdownlint(docFiles);
      runCspell(docFiles);
      runBuild();
      break;
    default:
      console.error('Unknown command:', command);
      console.error('Usage: node scripts/validate-docs.mjs [lint|spell|build|all] [--all]');
      process.exit(1);
  }

  log(`Documentation validation step '${command}' completed`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
