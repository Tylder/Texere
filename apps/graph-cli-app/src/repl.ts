import { prompt } from 'enquirer';

import { GraphCLI } from './cli.js';
import {
  createExitCommand,
  createHelpCommand,
  diffCommand,
  dumpCommand,
  ingestRepoCommand,
  projectCommand,
  traceCommand,
} from './commands/index.js';
import { CommandDispatcher } from './dispatcher.js';
import type { CommandResult } from './types.js';

export async function startRepl(): Promise<void> {
  const cli = new GraphCLI();
  const dispatcher = new CommandDispatcher();

  dispatcher.register('ingest repo', {
    handler: ingestRepoCommand,
    description: 'Ingest a repository',
    usage: 'ingest repo <source> [--commit <ref>] [--branch <branch>]',
  });
  dispatcher.register('dump', {
    handler: dumpCommand,
    description: 'Display current graph state',
    usage: 'dump [--format json|text]',
  });
  dispatcher.register('trace', {
    handler: traceCommand,
    description: 'Trace graph relationships from a node',
    usage: 'trace <node-id> [--depth <n>]',
  });
  dispatcher.register('diff', {
    handler: diffCommand,
    description: 'Compare two snapshots',
    usage: 'diff <snap1> <snap2>',
  });
  dispatcher.register('project', {
    handler: projectCommand,
    description: 'Run a projection',
    usage: 'project <name>',
  });
  dispatcher.register('help', {
    handler: createHelpCommand(() => dispatcher.listCommands()),
    description: 'Show available commands',
    usage: 'help [command]',
  });
  dispatcher.register('exit', {
    handler: createExitCommand(),
    description: 'Exit the CLI',
    usage: 'exit',
    aliases: ['quit'],
  });

  while (true) {
    const input = await promptUser();
    if (!input) {
      continue;
    }

    const result = await dispatcher.execute(input, cli);
    renderResult(result);

    if (shouldExit(result)) {
      return;
    }
  }
}

async function promptUser(): Promise<string> {
  const response = await prompt<{ input: string }>({
    type: 'input',
    name: 'input',
    message: '>',
  });

  return response.input.trim();
}

function renderResult(result: CommandResult): void {
  if (!result.message) {
    return;
  }

  if (result.success) {
    console.log(result.message);
    return;
  }

  console.error(result.message);
  if (result.error?.stack) {
    console.error(result.error.stack);
  }
}

function shouldExit(result: CommandResult): boolean {
  if (!result.data || typeof result.data !== 'object') {
    return false;
  }

  return 'exit' in result.data && (result.data as { exit?: boolean }).exit === true;
}
