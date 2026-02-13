#!/usr/bin/env node

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { TextereDB } from '@texere/graph';

import { createTexereMcpServer } from './server.js';

const DEFAULT_DB_PATH = '.texere/texere.db';

export const parseDbPathArg = (argv: string[]): string => {
  for (const [index, value] of argv.entries()) {
    if (value === undefined) {
      continue;
    }

    if (value === '--db-path') {
      return argv[index + 1] ?? DEFAULT_DB_PATH;
    }

    if (value.startsWith('--db-path=')) {
      return value.slice('--db-path='.length) || DEFAULT_DB_PATH;
    }
  }

  return DEFAULT_DB_PATH;
};

export const start = async (argv: string[]): Promise<void> => {
  const dbPath = parseDbPathArg(argv);
  const absoluteDbPath = resolve(dbPath);

  await mkdir(dirname(absoluteDbPath), { recursive: true });

  const db = new TextereDB(absoluteDbPath);
  const mcp = createTexereMcpServer(db);
  const transport = new StdioServerTransport();

  await mcp.server.connect(transport);
};

start(process.argv.slice(2)).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
