import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type EnvConfig = {
  GRAPH_INGEST_ROOT: string | undefined;
  GRAPH_PROJECT_ID: string | undefined;
};

export async function loadEnvConfig(cwd = process.cwd()): Promise<EnvConfig> {
  const envPath = path.join(cwd, '.env');
  if (!existsSync(envPath)) {
    return {
      GRAPH_INGEST_ROOT: process.env['GRAPH_INGEST_ROOT'],
      GRAPH_PROJECT_ID: process.env['GRAPH_PROJECT_ID'],
    };
  }

  const content = await readFile(envPath, 'utf-8');
  const parsed = parseEnv(content);

  return {
    GRAPH_INGEST_ROOT: parsed.GRAPH_INGEST_ROOT ?? process.env['GRAPH_INGEST_ROOT'],
    GRAPH_PROJECT_ID: parsed.GRAPH_PROJECT_ID ?? process.env['GRAPH_PROJECT_ID'],
  };
}

export function parseEnv(content: string): EnvConfig {
  const result: EnvConfig = {
    GRAPH_INGEST_ROOT: undefined,
    GRAPH_PROJECT_ID: undefined,
  };
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const index = trimmed.indexOf('=');
    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = stripQuotes(rawValue);

    if (key === 'GRAPH_INGEST_ROOT') {
      result.GRAPH_INGEST_ROOT = value;
    }
    if (key === 'GRAPH_PROJECT_ID') {
      result.GRAPH_PROJECT_ID = value;
    }
  }

  return result;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
