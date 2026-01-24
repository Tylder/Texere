import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createExitCommand,
  createHelpCommand,
  diffCommand,
  dumpCommand,
  ingestRepoCommand,
  projectCommand,
  traceCommand,
} from './index.js';

describe('command handlers (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('handles dump command formats', async () => {
    const cli = {
      dumpToJSON: () => ({ ok: true }),
      dumpToText: () => 'text',
    };

    const jsonResult = await dumpCommand([], { format: 'json' }, cli as any);
    expect(jsonResult.message).toContain('"ok": true');

    const textResult = await dumpCommand([], {}, cli as any);
    expect(textResult.message).toBe('text');
  });

  it('diff command compares snapshots', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-cli-diff-'));
    const snap1Path = path.join(dir, 'snap1.json');
    const snap2Path = path.join(dir, 'snap2.json');
    try {
      await writeFile(snap1Path, JSON.stringify({ nodes: [], edges: [] }), 'utf-8');
      await writeFile(snap2Path, JSON.stringify({ nodes: [], edges: [] }), 'utf-8');

      const cli = {
        diff: () => ({ summary: 'ok', added: [], removed: [], modified: [] }),
      };
      const result = await diffCommand([snap1Path, snap2Path], {}, cli as any);
      expect(result.success).toBe(true);
      expect(result.message).toBe('ok');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('diff command reports missing args', async () => {
    const result = await diffCommand([], {}, {} as any);
    expect(result.success).toBe(false);
  });

  it('trace command reports missing node id', async () => {
    const result = await traceCommand([], {}, {} as any);
    expect(result.success).toBe(false);
  });

  it('trace command returns results', async () => {
    const cli = {
      trace: () => ({ nodes: [1, 2], edges: [3] }),
    };
    const result = await traceCommand(['node'], { depth: '2' }, cli as any);
    expect(result.success).toBe(true);
    expect(result.message).toContain('2 nodes');
  });

  it('project command reports missing name', async () => {
    const result = await projectCommand([], {}, {} as any);
    expect(result.success).toBe(false);
  });

  it('project command returns projection results', async () => {
    const cli = {
      runProjection: async () => ({ name: 'proj', nodes: [1], edges: [] }),
    };
    const result = await projectCommand(['proj'], { policy: 'repo' }, cli as any);
    expect(result.success).toBe(true);
    expect(result.message).toContain('proj');
  });

  it('ingest repo command validates args', async () => {
    const result = await ingestRepoCommand([], {}, {} as any);
    expect(result.success).toBe(false);
  });

  it('ingest repo command returns success', async () => {
    const cli = {
      ingestRepo: async () => ({ nodeCount: 1, edgeCount: 2, outputDir: '/tmp' }),
    };
    const result = await ingestRepoCommand(['repo'], { commit: 'abc' }, cli as any);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Ingested 1 nodes');
  });

  it('help command returns usage', async () => {
    const handler = createHelpCommand(() => [{ name: 'dump', description: 'Dump', usage: 'dump' }]);
    const result = await handler(['dump'], {} as any, {} as any);
    expect(result.success).toBe(true);
    expect(result.message).toContain('dump');
  });

  it('help command lists commands', async () => {
    const handler = createHelpCommand(() => [
      { name: 'dump', description: 'Dump', usage: 'dump' },
      { name: 'trace', description: 'Trace', usage: 'trace' },
    ]);
    const result = await handler([], {} as any, {} as any);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Available commands');
  });

  it('exit command signals exit', async () => {
    const handler = createExitCommand();
    const result = await handler([], {} as any, {} as any);
    expect(result.data).toEqual({ exit: true });
  });
});
