import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const execMock = vi.hoisted(() =>
  vi.fn((command: string, options: unknown, callback: unknown) => {
    const cb = typeof options === 'function' ? options : callback;
    if (typeof cb === 'function') {
      cb(null, { stdout: 'mocked\n', stderr: '' });
    }
  }),
);

vi.mock('node:child_process', () => ({
  exec: execMock,
}));

import {
  checkoutIfNeeded,
  deriveRepoName,
  isExistingPath,
  resolveIngestRoot,
  resolveRepoSource,
  runGit,
  syncRepo,
} from './repo-git.js';

describe('repo helpers (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  afterEach(() => {
    execMock.mockClear();
  });

  it('derives repo name from urls and paths', () => {
    expect(deriveRepoName('https://github.com/sindresorhus/ky')).toBe('ky');
    expect(deriveRepoName('https://github.com/org/repo.git')).toBe('repo');
    expect(deriveRepoName('/tmp/my-repo.git')).toBe('my-repo');
  });

  it('resolves ingest root with fallback', () => {
    const resolved = resolveIngestRoot();
    expect(resolved).toBe(resolveIngestRoot(''));
  });

  it('checks for existing paths', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-repo-'));
    try {
      expect(await isExistingPath(dir)).toBe(true);
      expect(await isExistingPath(path.join(dir, 'missing'))).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('resolves repo source for local paths and urls', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-repo-'));
    try {
      const local = await resolveRepoSource(dir, '/tmp/ingest');
      expect(local.repoUrl).toContain('file://');
      const remote = await resolveRepoSource('https://github.com/org/repo', '/tmp/ingest');
      expect(remote.repoPath).toContain(path.join('/tmp/ingest', 'repo'));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('runs git commands', async () => {
    const output = await runGit(['status', '--short'], '/tmp');
    expect(output).toBe('mocked');
    expect(execMock).toHaveBeenCalled();
  });

  it('syncs repo by cloning when missing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-repo-'));
    const repoPath = path.join(dir, 'missing');
    try {
      await syncRepo(repoPath, 'https://github.com/org/repo');
      expect(execMock.mock.calls[0]?.[0]).toBe(`git clone https://github.com/org/repo ${repoPath}`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('syncs repo by fetching when present', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-repo-'));
    try {
      await syncRepo(dir, 'https://github.com/org/repo');
      expect(execMock.mock.calls[0]?.[0]).toBe('git fetch --all --prune');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('checks out requested refs', async () => {
    await checkoutIfNeeded('/tmp/repo', { commit: 'abc123' });
    expect(execMock.mock.calls[0]?.[0]).toBe('git checkout abc123');
    execMock.mockClear();
    await checkoutIfNeeded('/tmp/repo', { branch: 'main' });
    expect(execMock.mock.calls[0]?.[0]).toBe('git checkout main');
  });
});
