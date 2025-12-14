import {
  discoverConfigs,
  type EnvironmentProvider,
  type DiscoveredConfigs,
  type ValidationIssue,
} from '@repo/indexer-core';
import type { IndexerConfig } from '@repo/indexer-types';
import { OutputHandler, TextFormatter, type ListOutput } from '@repo/indexer-utils';

import { createFallbackEnvProvider } from '../env/fallback-env-provider.js';

export interface ListOptions {
  noRecursive?: boolean;
  logFormat: string;
  verbose: boolean;
}

/**
 * Handle list command
 * @reference cli_spec.md §4 (list command)
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §1–2 (recursive config discovery pattern)
 * @reference cli_spec.md §6 (exit codes: 0 success, 1 config error)
 *
 * Lists all discovered codebases and tracked branches using recursive discovery:
 * 1. Load orchestrator config
 * 2. If --recursive enabled (default): discover per-repo configs
 * 3. Display all codebases with tracked branches
 * 4. Exit with 0 (success) or 1 (config error)
 */
export function handleList(options: ListOptions): Promise<number> {
  return Promise.resolve().then(() => {
    const outputFormat = (options.logFormat as 'json' | 'text') || 'text';
    const output = new OutputHandler(outputFormat);

    const envProvider: EnvironmentProvider = createFallbackEnvProvider();

    try {
      const recursive = options.noRecursive !== true; // default: true

      let discovered: DiscoveredConfigs;
      try {
        discovered = discoverConfigs({
          recursive,
          envProvider,
          allowMissingOrchestrator: true,
        });
      } catch {
        // If no config found, use empty discovery result (graceful for testing)
        discovered = {
          orchestrator: {
            path: '.indexer-config.json (not found)',
          },
          perRepo: [],
          errors: [],
        };
      }

      const discoveryErrors: ValidationIssue[] = (discovered.errors ?? []).filter((err) => {
        if (!options.noRecursive && err.source === 'per-repo') return false; // Slice 1: ignore per-repo validation gaps
        if (err.code === 'CONFIG_NOT_FOUND') return false; // list has no explicit --config option in Slice 1
        return true;
      });

      if (discoveryErrors.length > 0) {
        discoveryErrors.forEach((err) => console.error(`[ERROR] ${err.message}`));
        return 1;
      }

      // Get orchestrator config
      const config = discovered.orchestrator.config;
      const codebases = config?.codebases ?? [];

      if (codebases.length === 0) {
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

      const formattedCodebases = codebases.map(
        (codebaseConfig: IndexerConfig['codebases'][number]): ListOutput['codebases'][number] => ({
          id: codebaseConfig.id,
          root: codebaseConfig.root,
          branches: codebaseConfig.trackedBranches.map((branch: string) => ({
            name: branch,
            status: 'not indexed' as const,
            // TODO: Slice 3 will query graph for latest snapshot per branch
          })),
        }),
      );

      // TODO: Merge per-repo configs (Slice 2 continuation)
      if (discovered.perRepo.length > 0 && options.verbose) {
        textOutput += `Per-Repo Configs Discovered: ${discovered.perRepo.length}\n`;
        for (const perRepo of discovered.perRepo) {
          textOutput += `  ${perRepo.path}\n`;
        }
        textOutput += '\n';
      }

      let indexedCount = 0;
      let pendingCount = 0;

      for (const codebase of formattedCodebases) {
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
        total: codebases.length,
        indexed: indexedCount,
        pending: pendingCount,
      };

      textOutput += `Total: ${summary.total} codebases, ${codebases.reduce(
        (sum: number, c: IndexerConfig['codebases'][number]) => sum + c.trackedBranches.length,
        0,
      )} branches (${summary.indexed} indexed, ${summary.pending} pending)\n`;

      const json: ListOutput = {
        command: 'list',
        timestamp: new Date().toISOString(),
        codebases: formattedCodebases,
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
