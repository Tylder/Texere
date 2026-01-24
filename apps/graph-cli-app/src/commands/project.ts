import type { CommandHandler } from '../types.js';

export const projectCommand: CommandHandler = (args) => {
  const name = args[0];
  if (!name) {
    return Promise.resolve({ success: false, message: 'Missing required argument: <name>' });
  }

  return Promise.resolve({
    success: false,
    message: `Projection not implemented yet. (name=${name})`,
  });
};
