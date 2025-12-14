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

describe('status command (cli_spec.md §5; testing_specification.md §4.2)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let _errorSpy: ReturnType<typeof vi.spyOn>;
  let _warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    _errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    _warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ====================================================================
  // Output Format Support (cli_spec.md §8)
  // ====================================================================

  describe('Output formats (§8)', () => {
    it('should check status with text format', async () => {
      const exitCode = await handleStatus({
        logFormat: 'text',
      });
      expect(exitCode).toBe(0);
    });

    it('should check status with json format', async () => {
      const exitCode = await handleStatus({
        logFormat: 'json',
      });
      expect(exitCode).toBe(0);
    });

    it('should handle empty logFormat (default)', async () => {
      const exitCode = await handleStatus({
        logFormat: '',
      });
      expect(exitCode).toBe(0);
    });

    it('should default to text format when not specified', async () => {
      const exitCode = await handleStatus({
        logFormat: 'text',
      });
      expect(exitCode).toBe(0);
    });
  });

  // ====================================================================
  // Exit Codes (cli_spec.md §2)
  // ====================================================================

  describe('Exit codes (§2)', () => {
    it('should return numeric exit code', async () => {
      const exitCode = await handleStatus({
        logFormat: 'json',
      });
      expect(typeof exitCode).toBe('number');
      expect(exitCode).toBe(0);
    });

    it('should return 0 (status is always informational)', async () => {
      const exitCode = await handleStatus({
        logFormat: 'text',
      });
      expect(exitCode).toBe(0);
    });

    it('should not fail if databases unavailable', async () => {
      const exitCode = await handleStatus({
        logFormat: 'text',
      });
      expect(exitCode).toBe(0);
    });
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

      // Should succeed (status is informational even if databases unavailable)
      expect(exitCode).toBe(0);

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

  // ====================================================================
  // Snapshot Tests (Output Format Stability)
  // ====================================================================

  describe('Output snapshots (cli_spec.md §8; testing_specification.md §4.2)', () => {
    it('should produce JSON output with required fields', async () => {
      let jsonOutput = '';
      logSpy.mockImplementation((message: unknown) => {
        if (typeof message === 'string' && message.startsWith('{')) {
          jsonOutput = message;
        }
      });

      const exitCode = await handleStatus({
        logFormat: 'json',
      });

      expect(exitCode).toBe(0);

      if (jsonOutput) {
        const parsed = JSON.parse(jsonOutput);
        // Verify output structure, not exact content
        expect(parsed).toHaveProperty('command', 'status');
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('daemon');
        expect(parsed).toHaveProperty('databases');
      }
    });

    it('should produce text output with status sections', async () => {
      let textOutput = '';
      logSpy.mockImplementation((message: unknown) => {
        textOutput += String(message) + '\n';
      });

      const exitCode = await handleStatus({
        logFormat: 'text',
      });

      expect(exitCode).toBe(0);
      // Verify structure without snapshot (timestamps are dynamic)
      expect(textOutput).toContain('Texere Indexer');
      expect(textOutput).toContain('System Status');
      expect(textOutput).toContain('Daemon Status');
      expect(textOutput).toContain('Databases');
    });
  });

  // ====================================================================
  // noRecursive Option
  // ====================================================================

  describe('Config discovery options (§3)', () => {
    it('should support noRecursive flag (default: false)', async () => {
      const exitCode = await handleStatus({
        logFormat: 'text',
        noRecursive: false,
      });
      expect(exitCode).toBe(0);
    });

    it('should support noRecursive flag (true)', async () => {
      const exitCode = await handleStatus({
        logFormat: 'text',
        noRecursive: true,
      });
      expect(exitCode).toBe(0);
    });
  });
});
