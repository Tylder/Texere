import type Database from 'better-sqlite3';

import { SCHEMA_DDL } from './schema.js';

interface OldNode {
  id: string;
  type: string;
  title: string;
  content: string;
  tags_json: string;
  importance: number;
  confidence: number;
  created_at: number;
  invalidated_at: number | null;
  embedding: Buffer | null;
}

interface OldEdge {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  strength: number;
  confidence: number;
  created_at: number;
}

interface MigratedNode extends OldNode {
  role: string;
  source: string;
  status: string;
  scope: string;
}

interface MigratedEdge extends OldEdge {
  type: string;
}

function mapNodeTypeToTypeRole(oldType: string): { type: string; role: string } {
  const mapping: Record<string, { type: string; role: string }> = {
    decision: { type: 'knowledge', role: 'decision' },
    requirement: { type: 'knowledge', role: 'requirement' },
    constraint: { type: 'knowledge', role: 'constraint' },
    research: { type: 'knowledge', role: 'research' },
    problem: { type: 'issue', role: 'problem' },
    error: { type: 'issue', role: 'error' },
    task: { type: 'action', role: 'task' },
    solution: { type: 'action', role: 'solution' },
    fix: { type: 'action', role: 'fix' },
    workflow: { type: 'action', role: 'workflow' },
    command: { type: 'action', role: 'command' },
    code_pattern: { type: 'artifact', role: 'code_pattern' },
    technology: { type: 'artifact', role: 'technology' },
    project: { type: 'artifact', role: 'project' },
    file_context: { type: 'artifact', role: 'file_context' },
    conversation: { type: 'context', role: 'conversation' },
    general: { type: 'knowledge', role: 'finding' },
  };

  return mapping[oldType] || { type: 'knowledge', role: 'finding' };
}

function mapEdgeType(oldType: string): string | null {
  const mapping: Record<string, string | null> = {
    SOLVES: 'RESOLVES',
    REQUIRES: 'DEPENDS_ON',
    DEPRECATED_BY: 'REPLACES',
    BUILDS_ON: 'EXTENDS',
    IMPLEMENTS: 'EXTENDS',
    PREVENTS: 'CONSTRAINS',
    VALIDATES: 'RESOLVES',
    ALTERNATIVE_TO: 'ALTERNATIVE_TO',
    CONTRADICTS: 'CONTRADICTS',
    CAUSES: 'CAUSES',
    ANCHORED_TO: 'ANCHORED_TO',
    CONSTRAINS: 'CONSTRAINS',
    RELATED_TO: null,
    MOTIVATED_BY: null,
  };

  return mapping[oldType] ?? oldType;
}

function needsMigration(db: Database.Database): boolean {
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='nodes'")
    .get();
  if (!tableExists) {
    return false;
  }

  try {
    db.prepare('SELECT role FROM nodes LIMIT 1').get();
    return false;
  } catch {
    return true;
  }
}

export function migrateDatabase(db: Database.Database): void {
  if (!needsMigration(db)) {
    console.log('Database schema is up to date, no migration needed');
    return;
  }

  console.log('Starting database migration...');

  db.transaction(() => {
    console.log('Backing up existing nodes and edges...');
    const oldNodes = db.prepare('SELECT * FROM nodes').all() as OldNode[];
    const oldEdges = db.prepare('SELECT * FROM edges').all() as OldEdge[];

    console.log(`Found ${oldNodes.length} nodes and ${oldEdges.length} edges to migrate`);

    console.log('Dropping old schema...');
    db.exec('DROP TRIGGER IF EXISTS nodes_fts_ai');
    db.exec('DROP TRIGGER IF EXISTS nodes_fts_ad');
    db.exec('DROP TRIGGER IF EXISTS node_tags_ai');
    db.exec('DROP TABLE IF EXISTS nodes_fts');
    db.exec('DROP TABLE IF EXISTS node_tags');
    db.exec('DROP TABLE IF EXISTS edges');
    db.exec('DROP TABLE IF EXISTS nodes');

    console.log('Creating new schema...');
    db.exec(SCHEMA_DDL);

    console.log('Migrating nodes...');
    const insertNode = db.prepare(`
      INSERT INTO nodes (
        id, type, role, title, content, tags_json, importance, confidence,
        source, status, scope, created_at, invalidated_at, embedding
      ) VALUES (
        @id, @type, @role, @title, @content, @tags_json, @importance, @confidence,
        @source, @status, @scope, @created_at, @invalidated_at, @embedding
      )
    `);

    const migratedNodes: MigratedNode[] = oldNodes.map((node) => {
      const { type, role } = mapNodeTypeToTypeRole(node.type);
      return {
        ...node,
        type,
        role,
        source: 'internal',
        status: node.invalidated_at ? 'invalidated' : 'active',
        scope: 'project',
      };
    });

    for (const node of migratedNodes) {
      insertNode.run(node);
    }

    console.log(`Migrated ${migratedNodes.length} nodes`);

    console.log('Migrating edges...');
    const insertEdge = db.prepare(`
      INSERT INTO edges (
        id, source_id, target_id, type, strength, confidence, created_at
      ) VALUES (
        @id, @source_id, @target_id, @type, @strength, @confidence, @created_at
      )
    `);

    const migratedEdges: MigratedEdge[] = oldEdges
      .map((edge) => {
        const newType = mapEdgeType(edge.type);
        if (newType === null) {
          return null;
        }
        return {
          ...edge,
          type: newType,
        };
      })
      .filter((edge): edge is MigratedEdge => edge !== null);

    for (const edge of migratedEdges) {
      insertEdge.run(edge);
    }

    const deletedEdgeCount = oldEdges.length - migratedEdges.length;
    console.log(`Migrated ${migratedEdges.length} edges, deleted ${deletedEdgeCount} edges`);

    console.log('Migration complete!');
  })();
}
