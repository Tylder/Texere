import { describe, expect, it } from 'vitest';

import { sanitizeFtsQuery } from './sanitize.js';

describe('sanitizeFtsQuery', () => {
  it('sanitizes double quotes by removing them', () => {
    expect(sanitizeFtsQuery('"SQLite" database')).toBe('SQLite database');
  });

  it('preserves wildcard for prefix search', () => {
    expect(sanitizeFtsQuery('auth* token')).toBe('auth* token');
  });

  it('escapes OR, AND, NOT as literals', () => {
    expect(sanitizeFtsQuery('foo OR bar AND baz NOT qux')).toBe('foo "OR" bar "AND" baz "NOT" qux');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeFtsQuery('')).toBe('');
  });

  it('passes through normal text unchanged', () => {
    expect(sanitizeFtsQuery('sqlite migration strategy')).toBe('sqlite migration strategy');
  });
});
