import type { CommandHandler } from '../types.js';

export const diffCommand: CommandHandler = (args) => {
  if (args.length < 2) {
    return Promise.resolve({
      success: false,
      message: 'Missing required arguments: <snap1> <snap2>',
    });
  }

  return Promise.resolve({
    success: false,
    message: `Diff not implemented yet. (snap1=${args[0]}, snap2=${args[1]})`,
  });
};
