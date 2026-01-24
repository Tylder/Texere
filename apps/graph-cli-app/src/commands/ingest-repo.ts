import type { CommandHandler } from '../types.js';

export const ingestRepoCommand: CommandHandler = async (args, flags, cli) => {
  const source = args[0];
  if (!source) {
    return { success: false, message: 'Missing required argument: <source>' };
  }

  const commit = typeof flags['commit'] === 'string' ? flags['commit'] : undefined;
  const branch = typeof flags['branch'] === 'string' ? flags['branch'] : undefined;
  const projectId = typeof flags['project'] === 'string' ? flags['project'] : undefined;
  const policyScope = typeof flags['policy'] === 'string' ? flags['policy'] : undefined;

  const options = {
    ...(commit ? { commit } : {}),
    ...(branch ? { branch } : {}),
    ...(projectId ? { projectId } : {}),
    ...(policyScope ? { policyScope } : {}),
  };

  try {
    const result = await cli.ingestRepo(source, options);
    return {
      success: true,
      message: `Ingested ${result.nodeCount} nodes and ${result.edgeCount} edges. Dumps: ${result.outputDir}`,
      data: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ingest failed';
    const result = { success: false, message };
    if (error instanceof Error) {
      return { ...result, error };
    }
    return result;
  }
};
