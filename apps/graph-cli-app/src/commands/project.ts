import type { CommandHandler } from '../types.js';

export const projectCommand: CommandHandler = async (args, flags, cli) => {
  const name = args[0];
  if (!name) {
    return { success: false, message: 'Missing required argument: <name>' };
  }

  const policyScope = typeof flags['policy'] === 'string' ? flags['policy'] : undefined;
  const options = policyScope ? { policyScope } : undefined;

  try {
    const result = await cli.runProjection(name, options);
    return {
      success: true,
      message: `Projection ${result.name} selected ${result.nodes.length} nodes and ${result.edges.length} edges.`,
      data: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Projection failed';
    const result = { success: false, message };
    if (error instanceof Error) {
      return { ...result, error };
    }
    return result;
  }
};
