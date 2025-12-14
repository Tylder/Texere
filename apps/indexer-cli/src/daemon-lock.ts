/**
 * @file Daemon Lock File Management (Re-exported from utils)
 * @description Re-exports daemon lock functionality from @repo/indexer-utils
 * @reference improvements-roadmap.md §4C.1 (Phase 4C: daemon-lock extraction to utils)
 * @reference cli_spec.md §10 (daemon lifecycle management)
 *
 * This file serves as a compatibility layer. The actual implementation is in:
 * @see packages/indexer/utils/src/daemon-lock.ts
 */

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
} from '@repo/indexer-utils';
