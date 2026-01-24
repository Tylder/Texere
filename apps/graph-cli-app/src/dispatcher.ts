import type { GraphCLI } from './cli.js';
import type { CommandDefinition, CommandResult, ParsedInput } from './types.js';

export class CommandDispatcher {
  private commands = new Map<string, CommandDefinition>();
  private aliases = new Map<string, string>();

  register(name: string, definition: CommandDefinition): void {
    this.commands.set(name, definition);
    for (const alias of definition.aliases ?? []) {
      this.aliases.set(alias, name);
    }
  }

  listCommands(): Array<{ name: string; description: string; usage: string }> {
    return [...this.commands.entries()]
      .map(([name, definition]) => ({
        name,
        description: definition.description,
        usage: definition.usage,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async execute(input: string, cli: GraphCLI): Promise<CommandResult> {
    const parsed = this.parseInput(input);
    if (!parsed.command) {
      return { success: true, message: '' };
    }

    const resolved = this.aliases.get(parsed.command) ?? parsed.command;
    const definition = this.commands.get(resolved);
    if (!definition) {
      return {
        success: false,
        message: `Unknown command: ${parsed.command}. Type 'help' for available commands.`,
      };
    }

    try {
      return await definition.handler(parsed.args, parsed.flags, cli);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const result: CommandResult = { success: false, message };
      if (error instanceof Error) {
        result.error = error;
      }
      return result;
    }
  }

  private parseInput(input: string): ParsedInput {
    const tokens = input.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      return { command: '', args: [], flags: {} };
    }

    const first = tokens[0];
    if (!first) {
      return { command: '', args: [], flags: {} };
    }

    const second = tokens[1];
    const twoWordCommand = second ? `${first} ${second}` : '';
    let command = first;
    let index = 1;

    if (twoWordCommand && (this.commands.has(twoWordCommand) || this.aliases.has(twoWordCommand))) {
      command = twoWordCommand;
      index = 2;
    }

    const args: string[] = [];
    const flags: Record<string, string | boolean> = {};

    while (index < tokens.length) {
      const token = tokens[index];
      if (!token) {
        break;
      }
      if (token.startsWith('--')) {
        const key = token.slice(2);
        const next = tokens[index + 1];
        if (!next || next.startsWith('--')) {
          flags[key] = true;
          index += 1;
        } else {
          flags[key] = next;
          index += 2;
        }
        continue;
      }

      args.push(token);
      index += 1;
    }

    return { command, args, flags };
  }
}
