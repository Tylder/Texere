import { readFile } from 'node:fs/promises';

import type { CommandHandler, GraphSnapshot } from '../types.js';

export const diffCommand: CommandHandler = async (args, _flags, cli) => {
  const snap1Path = args[0];
  const snap2Path = args[1];

  if (!snap1Path || !snap2Path) {
    return { success: false, message: 'Missing required arguments: <snap1> <snap2>' };
  }

  try {
    const snap1 = await loadSnapshot(snap1Path);
    const snap2 = await loadSnapshot(snap2Path);
    const result = cli.diff(snap1, snap2);

    return {
      success: true,
      message: result.summary,
      data: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Diff failed';
    const result = { success: false, message };
    if (error instanceof Error) {
      return { ...result, error };
    }
    return result;
  }
};

async function loadSnapshot(path: string): Promise<GraphSnapshot> {
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content) as GraphSnapshot;
}
