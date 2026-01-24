import type { CommandHandler } from '../types.js';

export const traceCommand: CommandHandler = (args) => {
  const nodeId = args[0];
  if (!nodeId) {
    return Promise.resolve({ success: false, message: 'Missing required argument: <node-id>' });
  }

  return Promise.resolve({
    success: false,
    message: `Trace not implemented yet. (node-id=${nodeId})`,
  });
};
