import type { CommandHandler } from '../types.js';

export const ingestRepoCommand: CommandHandler = (args, flags) => {
  const source = args[0];
  if (!source) {
    return Promise.resolve({ success: false, message: 'Missing required argument: <source>' });
  }

  const commit = typeof flags['commit'] === 'string' ? flags['commit'] : undefined;
  const branch = typeof flags['branch'] === 'string' ? flags['branch'] : undefined;
  const details = [
    `source=${source}`,
    commit ? `commit=${commit}` : null,
    branch ? `branch=${branch}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return Promise.resolve({
    success: false,
    message: `Ingest not implemented yet. (${details})`,
  });
};
