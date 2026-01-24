import type { CommandHandler } from '../types.js';

export function createHelpCommand(
  listCommands: () => Array<{ name: string; description: string; usage: string }>,
): CommandHandler {
  return (args) => {
    const commands = listCommands();
    if (args.length > 0) {
      const name = args.join(' ');
      const match = commands.find((command) => command.name === name);
      if (!match) {
        return Promise.resolve({ success: false, message: `Unknown command: ${name}` });
      }
      return Promise.resolve({
        success: true,
        message: `${match.usage}\n${match.description}`,
      });
    }

    const lines = ['Available commands:'];
    for (const command of commands) {
      lines.push(`- ${command.name}: ${command.description}`);
    }

    return Promise.resolve({ success: true, message: lines.join('\n') });
  };
}
