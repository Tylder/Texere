import { describe, expect, it } from 'vitest';

import {
  buildPaginatedResults,
  buildScope,
  clampPageLimit,
  decodeCursor,
  encodeCursor,
  isAfterCursor,
  isBeforeCursor,
  parseCreatedCursor,
  parseGraphCursor,
  parseHybridCursor,
  parseKeywordCursor,
  parseSemanticCursor,
} from './pagination.js';

describe('pagination helpers', () => {
  describe('clampPageLimit', () => {
    it('returns the default when limit is undefined', () => {
      expect(clampPageLimit(undefined)).toBe(100);
    });

    it('clamps values to the supported range and truncates floats', () => {
      expect(clampPageLimit(0)).toBe(1);
      expect(clampPageLimit(-3)).toBe(1);
      expect(clampPageLimit(7.9)).toBe(7);
      expect(clampPageLimit(999)).toBe(500);
      expect(clampPageLimit(Number.NaN)).toBeNaN();
      expect(clampPageLimit(Number.POSITIVE_INFINITY)).toBe(500);
    });
  });

  describe('cursor encoding', () => {
    it('round-trips cursor payloads', () => {
      const cursor = encodeCursor({
        scope: 'search-scope',
        last: { rank: 12, id: 'node-1' },
      });

      expect(decodeCursor<{ rank: number; id: string }>(cursor)).toEqual({
        scope: 'search-scope',
        last: { rank: 12, id: 'node-1' },
      });
    });

    it('rejects malformed cursor payloads', () => {
      expect(() => decodeCursor('not-base64')).toThrow('Invalid cursor');
      expect(() =>
        decodeCursor(Buffer.from(JSON.stringify('bad'), 'utf8').toString('base64url')),
      ).toThrow('Invalid cursor');
      expect(() =>
        decodeCursor(
          Buffer.from(JSON.stringify({ scope: 'scope', last: 'bad' }), 'utf8').toString(
            'base64url',
          ),
        ),
      ).toThrow('Invalid cursor');
    });
  });

  describe('cursor comparison helpers', () => {
    it('compares tuple values lexicographically', () => {
      expect(isAfterCursor([2, 'b'], [1, 'z'])).toBe(true);
      expect(isAfterCursor([1, 'b'], [1, 'c'])).toBe(false);
      expect(isAfterCursor([1, 'b'], [1, 'b'])).toBe(false);

      expect(isBeforeCursor([1, 'b'], [2, 'a'])).toBe(true);
      expect(isBeforeCursor([1, 'd'], [1, 'c'])).toBe(false);
      expect(isBeforeCursor([1, 'b'], [1, 'b'])).toBe(false);
    });
  });

  describe('buildPaginatedResults', () => {
    it('returns page metadata and next cursor when more rows exist', () => {
      const rows = [
        { id: 'a', score: 3 },
        { id: 'b', score: 2 },
        { id: 'c', score: 1 },
      ];

      const page = buildPaginatedResults(
        rows,
        2,
        'score DESC, id ASC',
        (row) => row.id,
        (row) => ({ score: row.score, id: row.id }),
        'scope-1',
        'hybrid',
      );

      expect(page.results).toEqual(['a', 'b']);
      expect(page.page.hasMore).toBe(true);
      expect(page.page.returned).toBe(2);
      expect(page.page.mode).toBe('hybrid');
      expect(page.page.nextCursor).not.toBeNull();
      if (page.page.nextCursor === null) {
        throw new Error('expected nextCursor to be present');
      }
      expect(parseHybridCursor(page.page.nextCursor, 'scope-1')).toEqual({ score: 2, id: 'b' });
    });

    it('omits the next cursor when the current page exhausts rows', () => {
      const page = buildPaginatedResults(
        [{ id: 'a' }],
        2,
        'id ASC',
        (row) => row,
        (row) => row,
        'scope-2',
      );

      expect(page.page.hasMore).toBe(false);
      expect(page.page.nextCursor).toBeNull();
      expect(page.page.mode).toBeUndefined();
    });
  });

  describe('buildScope', () => {
    it('normalizes arrays and drops undefined values', () => {
      expect(
        buildScope({
          endpoint: 'search',
          tags: ['zeta', 'alpha'],
          type: ['issue', 'action'],
          role: undefined,
          empty: [],
        }),
      ).toBe('{"endpoint":"search","tags":["alpha","zeta"],"type":["action","issue"]}');
    });
  });

  describe('cursor parsers', () => {
    it('returns null when no cursor is provided', () => {
      expect(parseKeywordCursor(undefined, 'scope')).toBeNull();
      expect(parseSemanticCursor(undefined, 'scope')).toBeNull();
      expect(parseCreatedCursor(undefined, 'scope')).toBeNull();
      expect(parseHybridCursor(undefined, 'scope')).toBeNull();
      expect(parseGraphCursor(undefined, 'scope')).toBeNull();
    });

    it('parses each cursor shape and rejects scope or shape mismatches', () => {
      const keyword = encodeCursor({ scope: 'keyword-scope', last: { rank: 1, id: 'node-1' } });
      const semantic = encodeCursor({
        scope: 'semantic-scope',
        last: { distance: 0.2, id: 'node-2' },
      });
      const created = encodeCursor({
        scope: 'created-scope',
        last: { created_at: 42, id: 'node-3' },
      });
      const hybrid = encodeCursor({ scope: 'hybrid-scope', last: { score: 0.9, id: 'node-4' } });
      const graph = encodeCursor({
        scope: 'graph-scope',
        last: { depth: 2, created_at: 99, id: 'node-5' },
      });

      expect(parseKeywordCursor(keyword, 'keyword-scope')).toEqual({ rank: 1, id: 'node-1' });
      expect(parseSemanticCursor(semantic, 'semantic-scope')).toEqual({
        distance: 0.2,
        id: 'node-2',
      });
      expect(parseCreatedCursor(created, 'created-scope')).toEqual({
        created_at: 42,
        id: 'node-3',
      });
      expect(parseHybridCursor(hybrid, 'hybrid-scope')).toEqual({ score: 0.9, id: 'node-4' });
      expect(parseGraphCursor(graph, 'graph-scope')).toEqual({
        depth: 2,
        created_at: 99,
        id: 'node-5',
      });

      expect(() => parseKeywordCursor(keyword, 'other-scope')).toThrow(
        'Cursor does not match the current request',
      );

      const badKeyword = encodeCursor({
        scope: 'keyword-scope',
        last: { rank: 'bad', id: 'node-1' },
      });
      const badGraph = encodeCursor({ scope: 'graph-scope', last: { depth: 2, id: 'node-5' } });

      expect(() => parseKeywordCursor(badKeyword, 'keyword-scope')).toThrow('Invalid cursor');
      expect(() => parseGraphCursor(badGraph, 'graph-scope')).toThrow('Invalid cursor');
    });
  });
});
