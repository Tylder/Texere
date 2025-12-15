/**
 * @file Tests for BaseCommand class
 * @description Verify output handling, error handling, and command lifecycle
 * @reference improvements-roadmap.md §4C.3 (command base class tests)
 * @reference testing_specification.md §3.6.1 (abstract class testing patterns)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { JsonOutput, OutputFormat } from '@repo/indexer-utils';

import { BaseCommand } from './base-command.js';

/**
 * Concrete implementation for testing abstract BaseCommand
 */
class TestCommand extends BaseCommand {
  protected format: OutputFormat;

  constructor(format: OutputFormat = 'text') {
    super(format);
    this.format = format;
  }

  async execute(): Promise<number> {
    return 0;
  }
}

describe('BaseCommand (improvements-roadmap.md §4C.3)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  describe('initialization (§3.6.1)', () => {
    it('creates command with default text format', async () => {
      const cmd = new TestCommand();
      const result = await cmd.execute();
      expect(result).toBe(0);
    });

    it('creates command with json format', async () => {
      const cmd = new TestCommand('json');
      const result = await cmd.execute();
      expect(result).toBe(0);
    });
  });

  describe('output() method (§8)', () => {
    it('outputs text and JSON in text mode', async () => {
      const cmd = new TestCommand('text');
      const textOutput = 'Sample text output';
      const jsonOutput: JsonOutput = {
        command: 'test',
        timestamp: new Date().toISOString(),
      };

      cmd['output'](textOutput, jsonOutput);
      expect(consoleLogSpy).toHaveBeenCalledWith(textOutput);
    });

    it('outputs JSON only in json mode', async () => {
      const cmd = new TestCommand('json');
      const textOutput = 'Sample text output';
      const jsonOutput: JsonOutput = {
        command: 'test',
        timestamp: new Date().toISOString(),
      };

      cmd['output'](textOutput, jsonOutput);
      expect(consoleLogSpy).toHaveBeenCalled();
      const callArg = consoleLogSpy.mock.calls[0]?.[0];
      expect(typeof callArg).toBe('string');
      expect(() => JSON.parse(callArg as string)).not.toThrow();
    });
  });

  describe('error() method (§6)', () => {
    it('logs error message and exits with exit code 1 (default)', () => {
      const cmd = new TestCommand();
      const message = 'Test error message';

      expect(() => {
        cmd['error'](message);
      }).toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(`Error: ${message}`);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits with custom exit code', () => {
      const cmd = new TestCommand();
      const message = 'Custom error';
      const code = 2;

      expect(() => {
        cmd['error'](message, code);
      }).toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(code);
    });

    it('handles config validation errors (exit code 1)', () => {
      const cmd = new TestCommand();
      expect(() => {
        cmd['error']('Config validation failed', 1);
      }).toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('handles git/IO errors (exit code 2)', () => {
      const cmd = new TestCommand();
      expect(() => {
        cmd['error']('Git operation failed', 2);
      }).toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    it('handles DB errors (exit code 3)', () => {
      const cmd = new TestCommand();
      expect(() => {
        cmd['error']('Database connection failed', 3);
      }).toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(3);
    });

    it('handles external/LLM errors (exit code 4)', () => {
      const cmd = new TestCommand();
      expect(() => {
        cmd['error']('LLM service unavailable', 4);
      }).toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(4);
    });
  });

  describe('output format negotiation (§8)', () => {
    it('supports text output format', async () => {
      const cmd = new TestCommand('text');
      const textOutput = 'Formatted text output';
      const jsonOutput: JsonOutput = { command: 'test', timestamp: new Date().toISOString() };

      cmd['output'](textOutput, jsonOutput);
      expect(consoleLogSpy).toHaveBeenCalledWith(textOutput);
    });

    it('supports json output format', async () => {
      const cmd = new TestCommand('json');
      const textOutput = 'Formatted text output';
      const jsonOutput: JsonOutput = { command: 'test', timestamp: new Date().toISOString() };

      cmd['output'](textOutput, jsonOutput);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('defaults to text when not specified', async () => {
      const cmd = new TestCommand();
      const textOutput = 'Default text';
      const jsonOutput: JsonOutput = { command: 'test', timestamp: new Date().toISOString() };

      cmd['output'](textOutput, jsonOutput);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('error handling consistency (§7)', () => {
    it('provides consistent error interface across all commands', () => {
      const cmd1 = new TestCommand('text');
      const cmd2 = new TestCommand('json');

      // Both should have error method
      expect(cmd1['error']).toBeDefined();
      expect(cmd2['error']).toBeDefined();

      // Both should exit with same default code
      expect(() => {
        cmd1['error']('Error 1');
      }).toThrow();

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('preserves exit code across format changes', () => {
      const cmd = new TestCommand('json');

      expect(() => {
        cmd['error']('Error message', 2);
      }).toThrow();

      expect(exitSpy).toHaveBeenCalledWith(2);
    });
  });
});
