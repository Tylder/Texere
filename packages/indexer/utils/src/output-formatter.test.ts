/**
 * @file Tests for output formatters
 * @description Verify text and JSON formatting utilities
 * @reference testing_strategy.md §2.2.1 (unit tests 60–75%)
 * @reference testing_specification.md §3.6.1 (test file structure)
 * @reference config-schema-cli-refactoring.md §4 (Phase 3: migration validation)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  TextFormatter,
  JsonFormatter,
  OutputHandler,
  type JsonOutput,
  type ValidateOutput,
  type ListOutput,
  type StatusOutput,
  type RunOutput,
  type StopOutput,
} from './output-formatter.js';

// ============================================================================
// TextFormatter Tests
// ============================================================================

describe('TextFormatter (testing_specification.md §3.6.1)', () => {
  describe('section()', () => {
    it('formats section header with decorative line', () => {
      const result = TextFormatter.section('Status');
      expect(result).toContain('Status');
      expect(result).toContain('═════');
      expect(result).toMatch(/\n/);
    });

    it('matches line length to title length', () => {
      const title = 'Configuration';
      const result = TextFormatter.section(title);
      expect(result).toContain('═'.repeat(title.length));
    });

    it('handles empty strings', () => {
      const result = TextFormatter.section('');
      expect(result).toBeDefined();
      expect(result).toContain('\n');
    });

    it('handles special characters in title', () => {
      const result = TextFormatter.section('Status [OK]');
      expect(result).toContain('Status [OK]');
    });
  });

  describe('pair()', () => {
    it('formats key-value pair with default indent', () => {
      const result = TextFormatter.pair('key', 'value');
      expect(result).toBe('  key: value');
    });

    it('respects custom indent', () => {
      const result = TextFormatter.pair('key', 'value', 4);
      expect(result).toBe('    key: value');
    });

    it('handles zero indent', () => {
      const result = TextFormatter.pair('key', 'value', 0);
      expect(result).toBe('key: value');
    });

    it('handles empty values', () => {
      const result = TextFormatter.pair('key', '');
      expect(result).toBe('  key: ');
    });

    it('preserves special characters in values', () => {
      const result = TextFormatter.pair('uri', 'bolt://localhost:7687');
      expect(result).toContain('bolt://localhost:7687');
    });
  });

  describe('bullet()', () => {
    it('formats bullet point with default indent', () => {
      const result = TextFormatter.bullet('Item one');
      expect(result).toBe('  • Item one');
    });

    it('respects custom indent', () => {
      const result = TextFormatter.bullet('Item one', 4);
      expect(result).toBe('    • Item one');
    });

    it('uses bullet character', () => {
      const result = TextFormatter.bullet('text');
      expect(result).toContain('•');
    });
  });

  describe('nested()', () => {
    it('formats nested label with default indent', () => {
      const result = TextFormatter.nested('Subsection');
      expect(result).toBe('Subsection');
    });

    it('respects custom indent', () => {
      const result = TextFormatter.nested('Subsection', 4);
      expect(result).toBe('    Subsection');
    });

    it('handles zero indent', () => {
      const result = TextFormatter.nested('Subsection', 0);
      expect(result).toBe('Subsection');
    });
  });

  describe('status()', () => {
    it('formats valid status with checkmark', () => {
      const result = TextFormatter.status('Config', true);
      expect(result).toContain('Config');
      expect(result).toContain('✓');
      expect(result).toContain('valid');
    });

    it('formats invalid status with X mark', () => {
      const result = TextFormatter.status('Config', false);
      expect(result).toContain('Config');
      expect(result).toContain('✗');
      expect(result).toContain('invalid');
    });

    it('handles undefined status', () => {
      const result = TextFormatter.status('Config', undefined);
      expect(result).toContain('Config');
      expect(result).toContain('✗');
    });

    it('respects custom indent', () => {
      const result = TextFormatter.status('Config', true, 4);
      expect(result).toMatch(/^ {4}/); // starts with 4 spaces
    });
  });

  describe('row()', () => {
    it('formats columns without widths', () => {
      const result = TextFormatter.row(['col1', 'col2', 'col3'], [undefined, undefined, undefined]);
      expect(result).toBe('col1  col2  col3');
    });

    it('applies column widths', () => {
      const result = TextFormatter.row(['id', 'name', 'status'], [5, 10, 8]);
      expect(result).toBeDefined();
      expect(result).toContain('id');
      expect(result).toContain('name');
      expect(result).toContain('status');
    });

    it('pads columns to specified width', () => {
      const result = TextFormatter.row(['a', 'b'], [5, 5]);
      expect(result).toBeDefined();
      expect(result).toContain('a');
      expect(result).toContain('b');
    });

    it('handles mixed widths', () => {
      const result = TextFormatter.row(['short', 'medium', 'x'], [5, 10, undefined]);
      expect(result).toBeDefined();
    });

    it('trims trailing whitespace', () => {
      const result = TextFormatter.row(['a', 'b'], [5, 5]);
      expect(result).toMatch(/\S$/); // ends with non-whitespace
    });

    it('handles empty columns array', () => {
      const result = TextFormatter.row([], []);
      expect(result).toBe('');
    });
  });
});

// ============================================================================
// JsonFormatter Tests
// ============================================================================

describe('JsonFormatter (testing_specification.md §3.6.1)', () => {
  describe('create()', () => {
    it('creates JSON output with command and timestamp', () => {
      const result = JsonFormatter.create('test', { foo: 'bar' });
      expect(result.command).toBe('test');
      expect(result.timestamp).toBeDefined();
      expect(result['foo']).toBe('bar');
    });

    it('includes ISO timestamp', () => {
      const result = JsonFormatter.create('cmd', {});
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('merges data into output', () => {
      const data = { status: 'ok', count: 42 };
      const result = JsonFormatter.create('list', data);
      expect(result['status']).toBe('ok');
      expect(result['count']).toBe(42);
    });

    it('handles empty data object', () => {
      const result = JsonFormatter.create('cmd', {});
      expect(result.command).toBe('cmd');
      expect(result.timestamp).toBeDefined();
    });

    it('handles complex nested data', () => {
      const data = { nested: { deep: { value: 123 } } };
      const result = JsonFormatter.create('complex', data);
      const nested = result['nested'] as Record<string, unknown>;
      const deep = nested['deep'] as Record<string, unknown>;
      expect(deep['value']).toBe(123);
    });
  });
});

// ============================================================================
// OutputHandler Tests
// ============================================================================

describe('OutputHandler (testing_specification.md §3.6.1)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('text mode', () => {
    it('outputs text when format is text', () => {
      const handler = new OutputHandler('text');
      const json: JsonOutput = { command: 'test', timestamp: new Date().toISOString() };
      handler.output('text output', json);

      expect(consoleLogSpy).toHaveBeenCalledWith('text output');
    });

    it('outputs JSON when explicitly called in text mode', () => {
      const handler = new OutputHandler('text');
      const json: JsonOutput = { command: 'test', timestamp: new Date().toISOString() };
      handler.json(json);

      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0][0] as string;
      expect(() => JSON.parse(call)).not.toThrow();
    });

    it('text() method outputs in text mode', () => {
      const handler = new OutputHandler('text');
      handler.text('content');
      expect(consoleLogSpy).toHaveBeenCalledWith('content');
    });
  });

  describe('json mode', () => {
    it('outputs JSON when format is json', () => {
      const handler = new OutputHandler('json');
      const json: JsonOutput = { command: 'test', timestamp: '2024-01-01T00:00:00Z' };
      handler.output('ignored', json);

      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call);
      expect(parsed.command).toBe('test');
    });

    it('text() method does not output in json mode', () => {
      const handler = new OutputHandler('json');
      handler.text('content');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('json() method outputs in json mode', () => {
      const handler = new OutputHandler('json');
      const json: JsonOutput = { command: 'test', timestamp: '2024-01-01T00:00:00Z' };
      handler.json(json);

      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0][0] as string;
      expect(() => JSON.parse(call)).not.toThrow();
    });
  });

  describe('output() method', () => {
    it('formats JSON with proper indentation', () => {
      const handler = new OutputHandler('json');
      const json: JsonOutput = {
        command: 'test',
        timestamp: '2024-01-01T00:00:00Z',
        data: 'value',
      };
      handler.output('', json);

      const call = consoleLogSpy.mock.calls[0][0] as string;
      expect(call).toContain('  '); // indentation
    });

    it('handles complex JSON output', () => {
      const handler = new OutputHandler('json');
      const json: ValidateOutput = {
        command: 'validate',
        timestamp: '2024-01-01T00:00:00Z',
        configs: [{ path: '/path', status: 'valid' }],
        summary: { total: 1, valid: 1, invalid: 0 },
      };
      handler.output('', json);

      const call = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(call) as ValidateOutput;
      expect(parsed.configs).toHaveLength(1);
    });
  });
});

// ============================================================================
// Type Validation Tests
// ============================================================================

describe('Output type interfaces (testing_specification.md §3.6.1)', () => {
  it('ValidateOutput has correct structure', () => {
    const output: ValidateOutput = {
      command: 'validate',
      timestamp: new Date().toISOString(),
      configs: [
        {
          path: '/path/to/config.json',
          status: 'valid',
          type: 'orchestrator',
        },
      ],
      summary: { total: 1, valid: 1, invalid: 0 },
    };
    expect(output.command).toBe('validate');
    expect(output.configs).toHaveLength(1);
  });

  it('ListOutput has correct structure', () => {
    const output: ListOutput = {
      command: 'list',
      timestamp: new Date().toISOString(),
      codebases: [
        {
          id: 'repo1',
          root: '/path/to/repo',
          branches: [{ name: 'main', status: 'indexed', symbols: 100 }],
        },
      ],
      summary: { total: 1, indexed: 1, pending: 0 },
    };
    expect(output.command).toBe('list');
    expect(output.codebases).toHaveLength(1);
  });

  it('StatusOutput has correct structure', () => {
    const output: StatusOutput = {
      command: 'status',
      timestamp: new Date().toISOString(),
      daemon: { state: 'running', pid: 1234 },
      databases: {
        neo4j: { connected: true, uri: 'bolt://localhost', error: undefined },
        qdrant: { connected: true, url: 'http://localhost:6333', error: undefined },
      },
      configuration: { configPath: '/path' },
      summary: 'All systems operational',
    };
    expect(output.daemon.state).toBe('running');
  });

  it('RunOutput has correct structure', () => {
    const output: RunOutput = {
      command: 'run',
      timestamp: new Date().toISOString(),
      mode: 'once',
      dryRun: false,
      results: [
        {
          codebaseId: 'repo1',
          branch: 'main',
          snapshotId: 'snap1',
          commitHash: 'abc123',
          changedFiles: { added: 5, modified: 3, deleted: 1, renamed: 0 },
          skipped: false,
        },
      ],
    };
    expect(output.mode).toBe('once');
    expect(output.results).toHaveLength(1);
  });

  it('StopOutput has correct structure', () => {
    const output: StopOutput = {
      command: 'stop',
      timestamp: new Date().toISOString(),
      daemonPid: 1234,
      state: 'stopped',
      message: 'Daemon stopped successfully',
    };
    expect(output.state).toBe('stopped');
  });
});
