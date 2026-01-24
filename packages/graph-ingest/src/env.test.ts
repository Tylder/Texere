import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadEnvConfig, parseEnv } from './env.js';

describe('env config parsing (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('parses .env values with quotes', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-env-'));
    try {
      await writeFile(
        path.join(dir, '.env'),
        'GRAPH_INGEST_ROOT="/tmp/ingest"\nGRAPH_PROJECT_ID=\'project-123\'\n',
        'utf-8',
      );

      const config = await loadEnvConfig(dir);
      expect(config.GRAPH_INGEST_ROOT).toBe('/tmp/ingest');
      expect(config.GRAPH_PROJECT_ID).toBe('project-123');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('parses raw content directly', () => {
    const parsed = parseEnv('GRAPH_INGEST_ROOT=/tmp/root\nGRAPH_PROJECT_ID=proj\n');
    expect(parsed.GRAPH_INGEST_ROOT).toBe('/tmp/root');
    expect(parsed.GRAPH_PROJECT_ID).toBe('proj');
  });

  it('falls back to process env when no .env file exists', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'graph-env-'));
    const previousRoot = process.env['GRAPH_INGEST_ROOT'];
    const previousProject = process.env['GRAPH_PROJECT_ID'];

    process.env['GRAPH_INGEST_ROOT'] = '/tmp/fallback-root';
    process.env['GRAPH_PROJECT_ID'] = 'fallback-project';

    try {
      const config = await loadEnvConfig(dir);
      expect(config.GRAPH_INGEST_ROOT).toBe('/tmp/fallback-root');
      expect(config.GRAPH_PROJECT_ID).toBe('fallback-project');
    } finally {
      if (previousRoot === undefined) {
        delete process.env['GRAPH_INGEST_ROOT'];
      } else {
        process.env['GRAPH_INGEST_ROOT'] = previousRoot;
      }
      if (previousProject === undefined) {
        delete process.env['GRAPH_PROJECT_ID'];
      } else {
        process.env['GRAPH_PROJECT_ID'] = previousProject;
      }
      await rm(dir, { recursive: true, force: true });
    }
  });
});
