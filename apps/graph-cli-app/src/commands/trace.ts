import type { CommandHandler } from '../types.js';

export const traceCommand: CommandHandler = (args, flags, cli) => {
  const nodeId = args[0];
  if (!nodeId) {
    return Promise.resolve({ success: false, message: 'Missing required argument: <node-id>' });
  }

  const depthFlag = flags['depth'];
  const depth = typeof depthFlag === 'string' ? Number(depthFlag) : 3;

  try {
    const result = cli.trace(nodeId, Number.isFinite(depth) ? depth : 3);
    return Promise.resolve({
      success: true,
      message: `Trace returned ${result.nodes.length} nodes and ${result.edges.length} edges.`,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Trace failed';
    const result = { success: false, message };
    if (error instanceof Error) {
      return Promise.resolve({ ...result, error });
    }
    return Promise.resolve(result);
  }
};
