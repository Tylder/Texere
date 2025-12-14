/**
 * @file Public exports for @repo/indexer-utils
 * @description Shared utilities for indexer CLI, workers, servers, and agents
 * @reference config-schema-cli-refactoring.md §4 (Phase 3: extracted to utils)
 * @reference improvements-roadmap.md §4C.1 (Phase 4C: daemon-lock extraction)
 */

export {
  TextFormatter,
  JsonFormatter,
  OutputHandler,
  type OutputFormat,
  type JsonOutput,
  type ValidateOutput,
  type ListOutput,
  type StatusOutput,
  type RunOutput,
  type StopOutput,
} from './output-formatter.js';

export {
  createLock,
  readLock,
  removeLock,
  getDaemonStatus,
  getLockFilePath,
  signalDaemon,
  waitForDaemonShutdown,
  type DaemonLock,
  type EnvironmentProvider,
  type FileSystemProvider,
  type ProcessApi,
} from './daemon-lock.js';
