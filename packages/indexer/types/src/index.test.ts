import { describe, expect, it } from 'vitest';

import { typesVersion, type FileIndexResult } from './index.js';

describe('types skeleton (ingest_spec §3)', () => {
  it('exposes runtime marker', () => {
    expect(typesVersion).toBe('0.0.0');
  });

  it('FileIndexResult shape is structurally assignable', () => {
    const result: FileIndexResult = {
      filePath: 'src/foo.ts',
      language: 'ts',
      symbols: [],
      calls: [],
      references: [],
    };
    expect(result.filePath).toBe('src/foo.ts');
  });
});
