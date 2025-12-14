/**
 * @file 'indexer validate' command implementation
 * @description Validate configuration syntax and structure without executing indexing
 * @reference cli_spec.md §3 (validate command)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { loadIndexerConfig } from '@repo/indexer-core';
import type { IndexerConfig } from '@repo/indexer-types';

import { OutputHandler, TextFormatter, type ValidateOutput } from '../output-formatter.js';

export interface ValidateOptions {
  config?: string;
  logFormat: string;
}

/**
 * Scan directory for .indexer-config.json files
 */
function scanForConfigs(reposDirectory?: string): string[] {
  const paths: string[] = [];

  // Check for orchestrator config
  if (process.env['INDEXER_CONFIG_PATH']) {
    paths.push(process.env['INDEXER_CONFIG_PATH']);
  }

  // Check current directory
  const cwdConfig = path.join(process.cwd(), '.indexer-config.json');
  if (fs.existsSync(cwdConfig)) {
    paths.push(cwdConfig);
  }

  // Scan repos directory if configured
  if (reposDirectory && fs.existsSync(reposDirectory)) {
    try {
      const entries = fs.readdirSync(reposDirectory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const repoConfigPath = path.join(reposDirectory, entry.name, '.indexer-config.json');
          if (fs.existsSync(repoConfigPath)) {
            paths.push(repoConfigPath);
          }
        }
      }
    } catch {
      // Ignore scan errors
    }
  }

  return [...new Set(paths)]; // Remove duplicates
}

/**
 * Validate a single config file
 */
function validateConfigFile(filePath: string): {
  valid: boolean;
  error?: string;
  config?: IndexerConfig;
} {
  try {
    const config = loadIndexerConfig({ path: filePath });
    return { valid: true, config };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle validate command
 * @reference cli_spec.md §3 (validate command)
 * @reference cli_spec.md §6 (exit codes: 0 all valid, 1 any errors)
 *
 * Complexity from scanning for configs, validating each one, and formatting output
 * in multiple formats is necessary per cli_spec.md §3.
 */
export function handleValidate(options: ValidateOptions): Promise<number> {
  // eslint-disable-next-line sonarjs/cognitive-complexity
  return Promise.resolve().then(() => {
    const outputFormat = (options.logFormat as 'json' | 'text') || 'text';
    const output = new OutputHandler(outputFormat);

    try {
      // Load orchestrator config to get reposDirectory
      let orchestratorConfig: IndexerConfig | null = null;
      try {
        const configPath = options.config || undefined;
        orchestratorConfig = loadIndexerConfig({
          ...(configPath && { path: configPath }),
          allowMissing: true,
        });
      } catch {
        // Ignore; orchestrator config is optional
      }

      // Scan for all configs
      const configPaths = scanForConfigs();
      if (options.config) {
        configPaths.unshift(options.config);
      }

      // Validate each config
      const results = configPaths.map((filePath) => {
        const result = validateConfigFile(filePath);
        return {
          path: filePath,
          status: result.valid ? ('valid' as const) : ('invalid' as const),
          codebaseId: result.config?.codebases[0]?.id,
          trackedBranches: result.config?.codebases[0]?.trackedBranches,
          error: result.error,
        };
      });

      const summary = {
        total: results.length,
        valid: results.filter((r) => r.status === 'valid').length,
        invalid: results.filter((r) => r.status === 'invalid').length,
      };

      // Format text output
      let textOutput = TextFormatter.section('Texere Indexer – Config Validation');

      if (orchestratorConfig) {
        textOutput += `Orchestrator Config\n`;
        textOutput += `  Path: ${options.config || process.env['INDEXER_CONFIG_PATH'] || '.indexer-config.json'}\n`;
        textOutput += `  Status: ✓ valid\n\n`;
      }

      if (results.length > 1 || !orchestratorConfig) {
        textOutput += `Per-Repo Configs\n`;
        for (const result of results) {
          textOutput += `  ${result.path}\n`;
          if (result.status === 'valid') {
            textOutput += `    Status: ✓ valid\n`;
            if (result.codebaseId) textOutput += `    Codebase ID: ${result.codebaseId}\n`;
            if (result.trackedBranches)
              textOutput += `    Tracked branches: ${result.trackedBranches.join(', ')}\n`;
          } else {
            textOutput += `    Status: ✗ invalid\n`;
            if (result.error) textOutput += `    Error: ${result.error}\n`;
          }
        }
        textOutput += '\n';
      }

      textOutput += `Summary: ${summary.total} configs checked, ${summary.valid} valid, ${summary.invalid} invalid ${summary.invalid > 0 ? '✗' : '✓'}\n`;

      const json: ValidateOutput = {
        command: 'validate',
        timestamp: new Date().toISOString(),
        configs: results,
        summary,
      };

      output.output(textOutput, json);

      return summary.invalid > 0 ? 1 : 0;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] ${errorMsg}`);
      return 1;
    }
  });
}
