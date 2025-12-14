/**
 * @file 'indexer validate' command implementation
 * @description Validate configuration syntax and structure without executing indexing
 * @reference cli_spec.md §3 (validate command)
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §1–2 (recursive discovery pattern)
 */

import { discoverConfigs, type DiscoveredConfigs } from '@repo/indexer-core';

import { createFallbackEnvProvider } from '../env/fallback-env-provider.js';
import { OutputHandler, TextFormatter, type ValidateOutput } from '../output-formatter.js';

type ValidationIssue = {
  message: string;
  configPath: string;
  codebaseId?: string;
  source?: string;
  code?: string;
};

export interface ValidateOptions {
  config?: string;
  noRecursive?: boolean;
  logFormat: string;
}

/**
 * Handle validate command
 * @reference cli_spec.md §3 (validate command)
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §1–2 (recursive config discovery pattern)
 * @reference cli_spec.md §6 (exit codes: 0 all valid, 1 any errors)
 *
 * Validates configuration files using recursive discovery:
 * 1. Load orchestrator config (explicit --config, INDEXER_CONFIG_PATH, or auto-discover)
 * 2. If --recursive enabled (default): discover per-repo configs at each codebase root
 * 3. Validate all discovered configs
 * 4. Report per-config pass/fail status grouped by type
 * 5. Exit with 0 (all valid) or 1 (validation errors)
 */
function filterDiscoveredErrors(
  rawErrors: ValidationIssue[],
  options: ValidateOptions,
): ValidationIssue[] {
  return rawErrors.filter((err) => {
    if (err.source === 'per-repo') return false; // Slice 1: per-repo validation is non-blocking
    if (!options.config && err.code === 'CONFIG_NOT_FOUND') {
      // Auto-discovery missing config should be non-fatal (treated as empty config set)
      return false;
    }
    return true;
  });
}

function buildValidationResults(
  discovered: DiscoveredConfigs,
  errors: ValidationIssue[],
): Array<{
  type: 'orchestrator' | 'per-repo';
  path: string;
  status: 'valid' | 'invalid';
  codebaseId?: string;
  error?: string;
}> {
  const results: Array<{
    type: 'orchestrator' | 'per-repo';
    path: string;
    status: 'valid' | 'invalid';
    codebaseId?: string;
    error?: string;
  }> = [];

  const orchestratorErrors =
    errors.filter(
      (err) => err.configPath === discovered.orchestrator.path || err.source === 'orchestrator',
    ) || [];
  results.push({
    type: 'orchestrator',
    path: discovered.orchestrator.path,
    status: orchestratorErrors.length > 0 ? 'invalid' : 'valid',
    ...(orchestratorErrors.length > 0
      ? { error: orchestratorErrors.map((e) => e.message).join('; ') }
      : {}),
  });

  for (const perRepo of discovered.perRepo) {
    const perRepoErrors = errors.filter(
      (err) =>
        err.configPath === perRepo.path ||
        err.codebaseId === perRepo.codebaseId ||
        err.source === 'per-repo',
    );
    results.push({
      type: 'per-repo',
      path: perRepo.path,
      status: perRepoErrors.length > 0 ? 'invalid' : 'valid',
      ...(perRepo.codebaseId ? { codebaseId: perRepo.codebaseId } : {}),
      ...(perRepoErrors.length > 0
        ? { error: perRepoErrors.map((e) => e.message).join('; ') }
        : {}),
    });
  }

  return results;
}

export function handleValidate(options: ValidateOptions): Promise<number> {
  return Promise.resolve().then(() => {
    const outputFormat = (options.logFormat as 'json' | 'text') || 'text';
    const output = new OutputHandler(outputFormat);

    try {
      const errors: ValidationIssue[] = [];
      const envProvider = createFallbackEnvProvider();
      const recursive = options.noRecursive !== true; // default: true

      // Discover configs using unified pattern
      // @reference RECURSIVE_CONFIG_DISCOVERY.md §1 (discovery pattern)
      const discoveryOptions: Parameters<typeof discoverConfigs>[0] = {
        recursive,
        envProvider,
        ...(options.config ? { configPath: options.config } : {}),
        allowMissingOrchestrator: !options.config,
      };

      const discovered: DiscoveredConfigs = discoverConfigs(discoveryOptions);

      const discoveredErrors = filterDiscoveredErrors(discovered.errors ?? [], options);
      errors.push(...discoveredErrors);

      // Format validation results grouped by config type
      const results = buildValidationResults(discovered, errors);

      // Format text output
      let textOutput = TextFormatter.section('Texere Indexer – Config Validation');

      textOutput += 'Orchestrator Config\n';
      const orchestratorResult = results.find((r) => r.type === 'orchestrator');
      if (orchestratorResult) {
        textOutput += `  Path: ${orchestratorResult.path}\n`;
        textOutput += `  Status: ✓ valid\n`;
      }
      textOutput += '\n';

      if (discovered.perRepo.length > 0) {
        textOutput += 'Per-Repo Configs\n';
        for (const result of results.filter((r) => r.type === 'per-repo')) {
          textOutput += `  ${result.path}\n`;
          const mark = result.status === 'valid' ? '✓ valid' : '✗ invalid';
          textOutput += `    Status: ${mark}\n`;
          if (result.codebaseId) textOutput += `    Codebase ID: ${result.codebaseId}\n`;
          if (result.error) textOutput += `    Error: ${result.error}\n`;
        }
        textOutput += '\n';
      }

      const invalidCount = results.filter((r) => r.status === 'invalid').length;
      const summary = {
        total: results.length,
        valid: results.length - invalidCount,
        invalid: invalidCount,
      };

      textOutput += `Summary: ${summary.total} config${summary.total !== 1 ? 's' : ''} checked, ${summary.valid} valid, ${summary.invalid} invalid ${summary.invalid > 0 ? '✗' : '✓'}\n`;

      const json: ValidateOutput = {
        command: 'validate',
        timestamp: new Date().toISOString(),
        configs: results.map((r) => ({
          path: r.path,
          status: r.status,
          type: r.type,
          ...(r.codebaseId ? { codebaseId: r.codebaseId } : {}),
          ...(r.error ? { error: r.error } : {}),
        })),
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
