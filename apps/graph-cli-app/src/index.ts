import { startRepl } from './repl.js';

const banner = ['Graph CLI v0.1', "Type 'help' for available commands.", ''].join('\n');

console.log(banner);

startRepl().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal error: ${message}`);
  process.exitCode = 1;
});
