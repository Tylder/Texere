import { describe, expect, it } from 'vitest';

import { sanitizeFtsQueryStrict } from './sanitize.js';

describe('sanitizeFtsQueryStrict', () => {
  it('passes through valid barewords unchanged', () => {
    expect(sanitizeFtsQueryStrict('hello')).toBe('hello');
    expect(sanitizeFtsQueryStrict('test123')).toBe('test123');
    expect(sanitizeFtsQueryStrict('_private')).toBe('_private');
  });

  it('passes through unicode barewords unchanged', () => {
    expect(sanitizeFtsQueryStrict('über')).toBe('über');
    expect(sanitizeFtsQueryStrict('日本語')).toBe('日本語');
  });

  it('passes through multi-word barewords unchanged', () => {
    expect(sanitizeFtsQueryStrict('sqlite migration strategy')).toBe('sqlite migration strategy');
  });

  it('quotes dotted terms', () => {
    expect(sanitizeFtsQueryStrict('sql.js')).toBe('"sql.js"');
  });

  it('quotes hyphenated terms', () => {
    expect(sanitizeFtsQueryStrict('better-sqlite3')).toBe('"better-sqlite3"');
  });

  it('quotes slashes', () => {
    expect(sanitizeFtsQueryStrict('/api/users')).toBe('"/api/users"');
  });

  it('quotes at-signs', () => {
    expect(sanitizeFtsQueryStrict('@hono/validator')).toBe('"@hono/validator"');
  });

  it('quotes colons', () => {
    expect(sanitizeFtsQueryStrict('file:src/db.ts')).toBe('"file:src/db.ts"');
  });

  it('preserves operators (case-sensitive)', () => {
    expect(sanitizeFtsQueryStrict('foo AND bar')).toBe('foo AND bar');
    expect(sanitizeFtsQueryStrict('foo OR bar')).toBe('foo OR bar');
    expect(sanitizeFtsQueryStrict('NOT foo')).toBe('NOT foo');
  });

  it('treats lowercase operator words as regular barewords', () => {
    expect(sanitizeFtsQueryStrict('and')).toBe('and');
    expect(sanitizeFtsQueryStrict('or')).toBe('or');
  });

  it('preserves bareword prefix queries', () => {
    expect(sanitizeFtsQueryStrict('auth*')).toBe('auth*');
  });

  it('quotes non-bareword prefix queries with star appended', () => {
    expect(sanitizeFtsQueryStrict('hello-world*')).toBe('"hello-world"*');
  });

  it('passes through user-quoted phrases', () => {
    expect(sanitizeFtsQueryStrict('"exact phrase"')).toBe('"exact phrase"');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeFtsQueryStrict('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(sanitizeFtsQueryStrict('   ')).toBe('');
    expect(sanitizeFtsQueryStrict('\t\n')).toBe('');
  });

  it('handles mixed tokens correctly', () => {
    expect(sanitizeFtsQueryStrict('sql.js OR "exact phrase" auth*')).toBe(
      '"sql.js" OR "exact phrase" auth*',
    );
  });

  it('escapes internal double quotes', () => {
    expect(sanitizeFtsQueryStrict('it"s')).toBe('"it""s"');
  });

  it('quotes terms with multiple special characters', () => {
    expect(sanitizeFtsQueryStrict('@scope/pkg-name')).toBe('"@scope/pkg-name"');
  });

  it('handles NEAR operator', () => {
    expect(sanitizeFtsQueryStrict('foo NEAR bar')).toBe('foo NEAR bar');
  });
});
