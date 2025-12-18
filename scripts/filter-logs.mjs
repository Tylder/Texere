#!/usr/bin/env node

/**
 * Filter noisy development logs to keep only meaningful errors and key output.
 * Removes warnings, deprecation notices, and progress messages.
 * Pass through stdin, filtered output goes to stdout and optionally to a file.
 */
import { writeFileSync } from 'node:fs';

const noisePatterns = [
  /ExperimentalWarning/,
  /DeprecationWarning/,
  /DEP\d+/,
  /\[nodemon\] watching/,
  /\[nodemon\] starting/,
  /Use `node --trace/,
  /--import 'data:text/,
  /pathToFileURL/,
  /fs\.Stats constructor/,
  /\(Use `.*trace.*\)/,
  /^> /,
  /^\[[^\]]+\]\s*>/,
  /^\[eslint-config\]$/,
  /^\[[^\]]+\]\s*$/,
  /\bStarting compilation in watch mode\.\.\.$/,
  /NX\s+Successfully ran target check-types/,
  /skip type checking for eslint-config package/,
  /^\s*$/, // Empty lines
  /^@personacore\/\w+:dev: \(node:\d+\)/, // Node process warnings
];

const stripAnsi = (line) =>
  line.replace(
    // ANSI escape sequences (colors, cursor moves, clear screen, OSC titles)
    // eslint-disable-next-line no-control-regex
    // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences require control characters
    // eslint-disable-next-line no-control-regex
    /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\u0007]*(\u0007|\x1b\\)|\x1b=|\x1b>|[^\S\r\n]*\u001b\[2J[^\S\r\n]*|[^\S\r\n]*\u001b\[3J[^\S\r\n]*/g,
    '',
  );

const isNoise = (line) => noisePatterns.some((pattern) => pattern.test(line));

const [outputFile] = process.argv.slice(2);
const typecheckCycleMarker = 'File change detected. Starting incremental compilation...';

const logLines = [];
const lastLineByPackage = new Map();
const rewriteLogFile = () => {
  if (!outputFile) return;
  writeFileSync(outputFile, `${logLines.join('\n')}\n`, 'utf8');
};

let buffer = '';

const flushLine = (line) => {
  if (!line) return;
  const cleaned = stripAnsi(line).trim();
  if (!cleaned) return;
  if (isNoise(cleaned)) return;
  const packageMatch = cleaned.match(/^\[([^\]]+)\]\s*/);
  if (packageMatch) {
    const packageName = packageMatch[1];
    if (lastLineByPackage.get(packageName) === cleaned) {
      return;
    }
    lastLineByPackage.set(packageName, cleaned);
  }
  if (packageMatch && cleaned.includes(typecheckCycleMarker)) {
    const packageName = packageMatch[1];
    for (let i = logLines.length - 1; i >= 0; i -= 1) {
      if (logLines[i].startsWith(`[${packageName}]`)) {
        logLines.splice(i, 1);
      }
    }
    rewriteLogFile();
    return;
  }
  if (outputFile) {
    logLines.push(cleaned);
    rewriteLogFile();
    return;
  }
  process.stdout.write(cleaned + '\n');
};

process.stdin.on('data', (chunk) => {
  buffer += chunk.toString();
  const parts = buffer.split(/[\r\n]/);
  buffer = parts.pop() ?? '';
  parts.forEach(flushLine);
});

process.stdin.on('end', () => {
  flushLine(buffer);
});
