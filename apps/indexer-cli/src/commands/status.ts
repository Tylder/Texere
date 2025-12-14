/**
 * @file 'indexer status' command implementation
 * @description Check daemon status and database connectivity
 * @reference cli_spec.md §5 (status command)
 */

import { loadIndexerConfig } from '@repo/indexer-core';

import { getDaemonStatus } from '../daemon-lock.js';
import { OutputHandler, TextFormatter, type StatusOutput } from '../output-formatter.js';

export interface StatusOptions {
  logFormat: string;
}

/**
 * Check Neo4j connectivity
 */
function checkNeo4j(_uri: string): Promise<{ connected: boolean; error?: string }> {
  // TODO: Slice 3 will implement real Neo4j connection test
  return Promise.resolve({ connected: false, error: 'Neo4j client not yet implemented (Slice 3)' });
}

/**
 * Check Qdrant connectivity
 */
function checkQdrant(_url: string): Promise<{ connected: boolean; error?: string }> {
  // TODO: Slice 5 will implement real Qdrant connection test
  return Promise.resolve({
    connected: false,
    error: 'Qdrant client not yet implemented (Slice 5)',
  });
}

/**
 * Handle status command
 * @reference cli_spec.md §5 (status command)
 * @reference cli_spec.md §6 (exit codes: 0 all OK, 1 blocker)
 *
 * Complexity from checking daemon status, database connectivity, and formatting
 * output in multiple formats is necessary per cli_spec.md §5.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function handleStatus(options: StatusOptions): Promise<number> {
  const outputFormat = (options.logFormat as 'json' | 'text') || 'text';
  const output = new OutputHandler(outputFormat);

  try {
    // Load config
    const config = loadIndexerConfig({ allowMissing: true });

    // Check daemon status
    const daemonStatus = getDaemonStatus();

    // Check database connectivity
    const neo4jStatus = await checkNeo4j(config.graph.neo4jUri);
    const qdrantStatus = await checkQdrant(config.vectors.qdrantUrl);

    // Format text output
    let textOutput = TextFormatter.section('Texere Indexer – System Status');

    textOutput += 'Daemon Status\n';
    if (daemonStatus.running) {
      textOutput += `  State: running\n`;
      if (daemonStatus.pid) {
        // TODO: Slice 7 will implement uptime calculation from lock creation time
        textOutput += `  PID: ${daemonStatus.pid}\n`;
      }
    } else {
      textOutput += `  State: stopped\n`;
      if (daemonStatus.stalePid) {
        textOutput += `  Last daemon crashed (PID ${daemonStatus.stalePid})\n`;
      }
    }
    textOutput += '\n';

    textOutput += 'Databases\n';
    textOutput += `  Neo4j:     ${neo4jStatus.connected ? '✓' : '✗'} ${
      neo4jStatus.connected
        ? `connected (${config.graph.neo4jUri})`
        : `connection failed (${neo4jStatus.error})`
    }\n`;
    textOutput += `  Qdrant:    ${qdrantStatus.connected ? '✓' : '✗'} ${
      qdrantStatus.connected
        ? `connected (${config.vectors.qdrantUrl})`
        : `connection failed (${qdrantStatus.error})`
    }\n\n`;

    textOutput += 'Configuration\n';
    textOutput += `  Config Path: ${process.env['INDEXER_CONFIG_PATH'] || '.indexer-config.json'}\n`;
    textOutput += `  Codebases: ${config.codebases.length}\n`;
    textOutput += '\n';

    // Determine readiness
    const hasBlockers = !neo4jStatus.connected || !qdrantStatus.connected;
    const summaryText = hasBlockers ? 'NOT ready ✗' : 'Ready to index ✓';
    textOutput += `Summary: ${summaryText}\n`;

    if (hasBlockers) {
      if (!neo4jStatus.connected) {
        textOutput += `  • Neo4j is unavailable (required)\n`;
      }
      if (!qdrantStatus.connected) {
        textOutput += `  • Qdrant is unavailable (required)\n`;
      }
      textOutput += '\nAction: Start required services or update INDEXER_CONFIG_PATH\n';
    } else if (!daemonStatus.running) {
      textOutput += `Use 'indexer run --daemon' to start daemon\n`;
    }

    const json: StatusOutput = {
      command: 'status',
      timestamp: new Date().toISOString(),
      daemon: {
        state: daemonStatus.running ? 'running' : 'stopped',
        pid: daemonStatus.pid || undefined,
      },
      databases: {
        neo4j: {
          connected: neo4jStatus.connected,
          uri: neo4jStatus.connected ? config.graph.neo4jUri : undefined,
          error: neo4jStatus.error || undefined,
        },
        qdrant: {
          connected: qdrantStatus.connected,
          url: qdrantStatus.connected ? config.vectors.qdrantUrl : undefined,
          error: qdrantStatus.error || undefined,
        },
      },
      configuration: {
        configPath: process.env['INDEXER_CONFIG_PATH'] || '.indexer-config.json',
      },
      summary: summaryText,
    };

    output.output(textOutput, json);

    return hasBlockers ? 1 : 0;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] ${errorMsg}`);
    return 1;
  }
}
