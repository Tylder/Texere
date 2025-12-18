#!/usr/bin/env node

/**
 * Filter noisy development logs to keep only meaningful errors and key output.
 * Removes warnings, deprecation notices, and progress messages.
 * Pass through stdin, filtered output goes to stdout and optionally to a file.
 */
import { createWriteStream } from 'node:fs';

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

let output = process.stdout;
if (outputFile) {
  output = createWriteStream(outputFile, { flags: 'w' });
}

let buffer = '';

const resetOutputFile = () => {
  if (!outputFile) return;
  output.end();
  output = createWriteStream(outputFile, { flags: 'w' });
};

const flushLine = (line) => {
  if (!line) return;
  if (line.includes(typecheckCycleMarker)) {
    resetOutputFile();
    return;
  }
  const cleaned = stripAnsi(line).trim();
  if (!cleaned) return;
  if (isNoise(cleaned)) return;
  output.write(cleaned + '\n');
};

process.stdin.on('data', (chunk) => {
  buffer += chunk.toString();
  const parts = buffer.split(/[\r\n]/);
  buffer = parts.pop() ?? '';
  parts.forEach(flushLine);
});

process.stdin.on('end', () => {
  flushLine(buffer);
  if (outputFile) output.end();
});
