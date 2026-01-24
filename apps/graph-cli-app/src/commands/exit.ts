import type { CommandHandler } from '../types.js';

export function createExitCommand(): CommandHandler {
  return () =>
    Promise.resolve({
      success: true,
      message: 'Exiting.',
      data: { exit: true },
    });
}
