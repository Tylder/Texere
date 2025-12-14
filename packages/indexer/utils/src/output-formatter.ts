/**
 * @file Output Formatting for Text and JSON
 * @description Consistent output formatting across all CLI commands
 * @reference cli_spec.md §8 (output formats)
 * @reference config-schema-cli-refactoring.md §4 (Phase 3: extracted to utils)
 */

export type OutputFormat = 'json' | 'text';

// ============================================================================
// Text Formatter (human-readable)
// ============================================================================

export class TextFormatter {
  /**
   * Format section header with decorative line
   */
  static section(title: string): string {
    const line = '═'.repeat(title.length);
    return `\n${title}\n${line}\n`;
  }

  /**
   * Format key-value pair
   */
  static pair(key: string, value: string, indent = 2): string {
    const spaces = ' '.repeat(indent);
    return `${spaces}${key}: ${value}`;
  }

  /**
   * Format bullet point
   */
  static bullet(text: string, indent = 2): string {
    const spaces = ' '.repeat(indent);
    return `${spaces}• ${text}`;
  }

  /**
   * Format nested section
   */
  static nested(label: string, indent = 0): string {
    const spaces = ' '.repeat(indent);
    return `${spaces}${label}`;
  }

  /**
   * Format status with checkmark or X
   */
  static status(label: string, valid: boolean | undefined, indent = 2): string {
    const spaces = ' '.repeat(indent);
    const mark = valid ? '✓' : '✗';
    return `${spaces}${label}\n${spaces}  Status: ${mark} ${valid ? 'valid' : 'invalid'}`;
  }

  /**
   * Format table row
   */
  static row(columns: string[], widths: (number | undefined)[]): string {
    return columns
      .map((col, i) => {
        const width = widths[i];
        return width ? col.padEnd(width) : col;
      })
      .join('  ')
      .trimEnd();
  }
}

// ============================================================================
// JSON Formatter
// ============================================================================

export interface JsonOutput {
  command: string;
  timestamp: string;
  [key: string]: unknown;
}

export class JsonFormatter {
  static create(command: string, data: Record<string, unknown>): JsonOutput {
    return {
      command,
      timestamp: new Date().toISOString(),
      ...data,
    };
  }
}

// ============================================================================
// Generic Output Handler
// ============================================================================

export class OutputHandler {
  constructor(private format: OutputFormat) {}

  /**
   * Output text or JSON based on format
   */
  output(text: string, json: JsonOutput): void {
    if (this.format === 'json') {
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log(text);
    }
  }

  /**
   * Output text (always print, regardless of format)
   */
  text(content: string): void {
    if (this.format !== 'json') {
      console.log(content);
    }
  }

  /**
   * Output JSON (always print, regardless of format)
   */
  json(data: JsonOutput): void {
    console.log(JSON.stringify(data, null, 2));
  }
}

// ============================================================================
// Specialized Formatters by Command
// ============================================================================

/**
 * Format validate command output
 */
export interface ValidateOutput extends JsonOutput {
  command: 'validate';
  configs: Array<{
    path: string;
    status: 'valid' | 'invalid';
    type?: 'orchestrator' | 'per-repo';
    codebaseId?: string;
    trackedBranches?: string[];
    error?: string;
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}

/**
 * Format list command output
 */
export interface ListOutput extends JsonOutput {
  command: 'list';
  codebases: Array<{
    id: string;
    root: string;
    branches: Array<{
      name: string;
      status: 'indexed' | 'not indexed';
      lastIndexed?: string;
      commitHash?: string;
      symbols?: number;
      boundaries?: number;
      tests?: number;
    }>;
  }>;
  summary: {
    total: number;
    indexed: number;
    pending: number;
  };
}

/**
 * Format status command output
 */
export interface StatusOutput extends JsonOutput {
  command: 'status';
  daemon: {
    state: 'running' | 'stopped';
    pid: number | undefined;
    uptime?: string;
  };
  workers?: {
    total: number;
    available: number;
    inFlightJobs: number;
  };
  databases: {
    neo4j: {
      connected: boolean;
      uri: string | undefined;
      error: string | undefined;
    };
    qdrant: {
      connected: boolean;
      url: string | undefined;
      error: string | undefined;
    };
  };
  configuration: {
    configPath?: string;
    reposDirectory?: string;
  };
  summary: string;
}

/**
 * Format run command output
 */
export interface RunOutput extends JsonOutput {
  command: 'run';
  mode: 'once' | 'daemon' | 'detached';
  dryRun: boolean;
  results?: Array<{
    codebaseId: string;
    branch: string;
    snapshotId: string;
    commitHash: string;
    changedFiles: {
      added: number;
      modified: number;
      deleted: number;
      renamed: number;
    };
    skipped: boolean;
  }>;
  plan?: {
    snapshots: Array<{
      snapshotId: string;
      commitHash: string;
      branch: string | undefined;
      changedFiles: {
        added: string[];
        modified: string[];
        deleted: string[];
        renamed: Array<{ from: string; to: string }>;
      };
      plannedOperations: string[];
    }>;
  };
  daemonPid?: number;
  summary?: string;
}

/**
 * Format stop command output
 */
export interface StopOutput extends JsonOutput {
  command: 'stop';
  daemonPid?: number;
  state: 'stopped' | 'not found' | 'timeout';
  message: string;
}
