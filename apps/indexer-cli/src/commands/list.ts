/**
 * @file 'indexer list' command implementation
 * @description Discover all configured codebases, their tracked branches, and index status
 * @reference cli_spec.md §4 (list command)
 */

import { loadIndexerConfig } from '@repo/indexer-core';

import { OutputHandler, TextFormatter, type ListOutput } from '../output-formatter.js';

export interface ListOptions {
  logFormat: string;
  verbose: boolean;
}

/**
 * Handle list command
 * @reference cli_spec.md §4 (list command)
 * @reference cli_spec.md §6 (exit codes: 0 success, 1 config error)
 */
export function handleList(options: ListOptions): Promise<number> {
  return Promise.resolve().then(() => {
    const outputFormat = (options.logFormat as 'json' | 'text') || 'text';
    const output = new OutputHandler(outputFormat);

    try {
      // Load config
      const config = loadIndexerConfig({ allowMissing: true });

      if (config.codebases.length === 0) {
        const textOutput = 'No codebases found in configuration.\n';
        const json: ListOutput = {
          command: 'list',
          timestamp: new Date().toISOString(),
          codebases: [],
          summary: { total: 0, indexed: 0, pending: 0 },
        };
        output.output(textOutput, json);
        return 0;
      }

      // Format output
      let textOutput = TextFormatter.section('Texere Indexer – Discovered Codebases');

      const codebases = config.codebases.map((codebaseConfig) => ({
        id: codebaseConfig.id,
        root: codebaseConfig.root,
        branches: codebaseConfig.trackedBranches.map((branch) => ({
          name: branch,
          status: 'not indexed' as const,
          // TODO: Slice 3 will query graph for latest snapshot per branch
        })),
      }));

      let indexedCount = 0;
      let pendingCount = 0;

      for (const codebase of codebases) {
        textOutput += `Codebase: ${codebase.id}\n`;
        textOutput += `  Root: ${codebase.root}\n`;
        textOutput += `  Branches:\n`;

        for (const branch of codebase.branches) {
          textOutput += `    ${branch.name}\n`;
          textOutput += `      Status: ${branch.status}\n`;

          if (branch.status !== 'not indexed') {
            indexedCount++;
          } else {
            pendingCount++;
          }
        }
        textOutput += '\n';
      }

      const summary = {
        total: config.codebases.length,
        indexed: indexedCount,
        pending: pendingCount,
      };

      textOutput += `Total: ${summary.total} codebases, ${config.codebases.reduce(
        (sum, c) => sum + c.trackedBranches.length,
        0,
      )} branches (${summary.indexed} indexed, ${summary.pending} pending)\n`;

      const json: ListOutput = {
        command: 'list',
        timestamp: new Date().toISOString(),
        codebases,
        summary,
      };

      output.output(textOutput, json);

      return 0;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] ${errorMsg}`);
      return 1;
    }
  });
}
