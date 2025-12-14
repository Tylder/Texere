/**
 * @file status command tests
 * @description Unit tests for 'indexer status' command
 * @reference cli_spec.md §5 (status command)
 * @reference testing_specification.md §3–7 (test structure)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { IndexerConfig } from '@repo/indexer-types';

import { handleStatus } from './status.js';

describe('status command (cli_spec.md §5)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should check status with text format', async () => {
    const exitCode = await handleStatus({
      logFormat: 'text',
    });
    expect([0, 1]).toContain(exitCode);
  });

  it('should check status with json format', async () => {
    const exitCode = await handleStatus({
      logFormat: 'json',
    });
    expect([0, 1]).toContain(exitCode);
  });

  it('should return 0 or 1 (not blocker means ready)', async () => {
    const exitCode = await handleStatus({
      logFormat: 'text',
    });
    expect([0, 1]).toContain(exitCode);
  });

  it('should handle empty logFormat', async () => {
    const exitCode = await handleStatus({
      logFormat: '',
    });
    expect([0, 1]).toContain(exitCode);
  });

  it('should return numeric exit code', async () => {
    const exitCode = await handleStatus({
      logFormat: 'json',
    });
    expect(typeof exitCode).toBe('number');
  });

  it('should display configured codebases from config file (configuration_and_server_setup.md §3)', async () => {
    // Create a temp config file with codebases
    const tmpDir = path.join('/tmp', `status-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const configFile = path.join(tmpDir, '.indexer-config.json');
    const testConfig: IndexerConfig = {
      version: '1.0',
      codebases: [
        {
          id: 'test-repo-1',
          root: '/test1',
          trackedBranches: ['main'],
        },
        {
          id: 'test-repo-2',
          root: '/test2',
          trackedBranches: ['main', 'develop'],
        },
      ],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: {
        qdrantUrl: 'http://localhost:6333',
      },
    };

    fs.writeFileSync(configFile, JSON.stringify(testConfig));

    // Mock console to capture output
    let capturedOutput = '';
    vi.spyOn(console, 'log').mockImplementation((message) => {
      capturedOutput += String(message) + '\n';
    });

    const originalEnv = process.env['INDEXER_CONFIG_PATH'];
    const originalCwd = process.cwd();

    try {
      // Set config path explicitly
      process.env['INDEXER_CONFIG_PATH'] = configFile;

      const exitCode = await handleStatus({
        logFormat: 'text',
      });

      // Should succeed (exit code 0 or 1 depending on DB status)
      expect([0, 1]).toContain(exitCode);

      // Most importantly: should show the codebase count
      expect(capturedOutput).toMatch(/Codebases: 2/);
    } finally {
      if (originalEnv !== undefined) {
        process.env['INDEXER_CONFIG_PATH'] = originalEnv;
      } else {
        delete process.env['INDEXER_CONFIG_PATH'];
      }
      process.chdir(originalCwd);
      vi.restoreAllMocks();
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    }
  });
});
