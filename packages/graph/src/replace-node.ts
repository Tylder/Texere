import type Database from 'better-sqlite3';

import { createEdge } from './edges.js';
import { getNode, storeNode, type MinimalNode, type StoreNodeInput } from './nodes.js';
import { EdgeType, type Node } from './types.js';

export interface ReplaceNodeInput extends StoreNodeInput {
  old_id: string;
}

export interface ReplaceNodeOptions {
  minimal?: boolean;
}

// Single input overloads
export function replaceNode(
  db: Database.Database,
  input: ReplaceNodeInput,
  options?: ReplaceNodeOptions & { minimal?: false },
): Node;
export function replaceNode(
  db: Database.Database,
  input: ReplaceNodeInput,
  options: ReplaceNodeOptions & { minimal: true },
): MinimalNode;

// Implementation
export function replaceNode(
  db: Database.Database,
  input: ReplaceNodeInput,
  options?: ReplaceNodeOptions,
): Node | MinimalNode {
  const minimal = options?.minimal ?? false;

  return db
    .transaction(() => {
      // 1. Verify old node exists
      const oldNode = getNode(db, input.old_id);
      if (!oldNode) {
        throw new Error(`Node not found: ${input.old_id}`);
      }

      // 2. Prevent replacing already-invalidated nodes
      if (oldNode.invalidated_at !== null) {
        throw new Error(`Cannot replace invalidated node: ${input.old_id}`);
      }

      // 3. Store new node
      const { old_id, ...storeInput } = input;
      const newNode = minimal
        ? storeNode(db, storeInput, { minimal: true })
        : storeNode(db, storeInput);

      // 4. Create REPLACES edge (old → new)
      // This auto-invalidates old node via EdgeType.Replaces behavior
      createEdge(db, {
        source_id: old_id,
        target_id: newNode.id,
        type: EdgeType.Replaces,
      });

      return newNode;
    })
    .immediate();
}
