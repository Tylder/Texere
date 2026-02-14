import Database from 'better-sqlite3';
import { describe, it } from 'vitest';

describe('fts5 syntax', () => {
  it('tests which queries cause errors', () => {
    const db = new Database(':memory:');
    db.exec('CREATE VIRTUAL TABLE t USING fts5(title, content)');
    db.exec("INSERT INTO t VALUES ('foo bar', 'test content')");

    const queries = ['foo AND AND bar', 'foo OR OR bar', 'foo (( bar', '"unmatched', 'NOT NOT foo'];
    for (const q of queries) {
      try {
        const r = db.prepare('SELECT * FROM t WHERE t MATCH ?').all(q);
        console.log(`'${q}' => OK, ${r.length} rows`);
      } catch (e: any) {
        console.log(`'${q}' => ERROR: ${e.message}`);
      }
    }
    db.close();
  });
});
