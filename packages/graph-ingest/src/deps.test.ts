import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const execMock = vi.hoisted(() =>
  vi.fn((command: string, options: unknown, callback: unknown) => {
    const cb = typeof options === 'function' ? options : callback;
    if (typeof cb === 'function') {
      cb(null, { stdout: 'ok', stderr: '' });
    }
  }),
);

vi.mock('node:child_process', () => ({
  exec: execMock,
}));

import { detectPackageManager, installDependencies } from './deps.js';

describe('dependency detection (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  afterEach(() => {
    execMock.mockClear();
  });

  it('detects pnpm via lockfile', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-deps-'));
    try {
      await writeFile(path.join(dir, 'pnpm-lock.yaml'), '', 'utf-8');
      expect(await detectPackageManager(dir)).toBe('pnpm');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('detects yarn via lockfile', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-deps-'));
    try {
      await writeFile(path.join(dir, 'yarn.lock'), '', 'utf-8');
      expect(await detectPackageManager(dir)).toBe('yarn');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('defaults to npm without lockfiles', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-deps-'));
    try {
      expect(await detectPackageManager(dir)).toBe('npm');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('installs dependencies using pnpm', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-deps-'));
    try {
      await installDependencies(dir, 'pnpm');
      expect(execMock).toHaveBeenCalled();
      expect(execMock.mock.calls[0]?.[0]).toBe('pnpm install --frozen-lockfile');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('installs dependencies using yarn', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-deps-'));
    try {
      await installDependencies(dir, 'yarn');
      expect(execMock).toHaveBeenCalled();
      expect(execMock.mock.calls[0]?.[0]).toBe('yarn install --frozen-lockfile');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('installs dependencies using npm ci when lockfile exists', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-deps-'));
    try {
      await writeFile(path.join(dir, 'package-lock.json'), '', 'utf-8');
      await installDependencies(dir, 'npm');
      expect(execMock).toHaveBeenCalled();
      expect(execMock.mock.calls[0]?.[0]).toBe('npm ci');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('installs dependencies using npm install when lockfile is missing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-deps-'));
    try {
      await installDependencies(dir, 'npm');
      expect(execMock).toHaveBeenCalled();
      expect(execMock.mock.calls[0]?.[0]).toBe('npm install');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
