import type { CommandHandler } from '../types.js';

export const dumpCommand: CommandHandler = (_args, flags, cli) => {
  const format = typeof flags['format'] === 'string' ? flags['format'] : 'text';

  if (format === 'json') {
    const snapshot = cli.dumpToJSON();
    return Promise.resolve({ success: true, message: JSON.stringify(snapshot, null, 2) });
  }

  return Promise.resolve({ success: true, message: cli.dumpToText() });
};
