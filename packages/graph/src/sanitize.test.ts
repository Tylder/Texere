import { describe, expect, it } from 'vitest';

import { sanitizeFtsQueryStrict } from './sanitize.js';

describe('sanitizeFtsQueryStrict', () => {
  it('sanitizes double quotes by removing them', () => {
    expect(sanitizeFtsQueryStrict('"SQLite" database')).toBe('SQLite database');
  });

  it('preserves wildcard for prefix search', () => {
    expect(sanitizeFtsQueryStrict('auth* token')).toBe('auth* token');
  });

  it('escapes OR, AND, NOT as literals', () => {
    expect(sanitizeFtsQueryStrict('foo OR bar AND baz NOT qux')).toBe(
      'foo "OR" bar "AND" baz "NOT" qux',
    );
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeFtsQueryStrict('')).toBe('');
  });

  it('passes through normal text unchanged', () => {
    expect(sanitizeFtsQueryStrict('sqlite migration strategy')).toBe('sqlite migration strategy');
  });
});
