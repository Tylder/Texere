import { stat } from 'node:fs/promises';
import path from 'node:path';

export async function isExistingPath(candidate: string): Promise<boolean> {
  try {
    const stats = await stat(candidate);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export function resolveIngestRoot(root?: string): string {
  const fallback = path.join('.', 'tmp', 'Texere', 'graph-ingest');
  const value = root && root.trim().length > 0 ? root : fallback;
  return path.resolve(value);
}

export function deriveRepoName(source: string): string {
  try {
    const url = new URL(source);
    const parts = url.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] ?? 'repo';
    return sanitizeName(last);
  } catch {
    return sanitizeName(path.basename(source));
  }
}

function sanitizeName(name: string): string {
  const trimmed = name.replace(/\.git$/i, '');
  const cleaned = trimmed.replace(/[^a-zA-Z0-9-_]+/g, '-');
  return cleaned.length > 0 ? cleaned : 'repo';
}
