import type Database from 'better-sqlite3';

import { createDatabase } from './db.js';
import {
  createEdge as createEdgeImpl,
  deleteEdge as deleteEdgeImpl,
  getEdgesForNode as getEdgesForNodeImpl,
  type CreateEdgeInput,
  type EdgeDirection,
} from './edges.js';
import {
  getNode as getNodeImpl,
  invalidateNode as invalidateNodeImpl,
  storeNode as storeNodeImpl,
  type GetNodeOptions,
  type NodeWithEdges,
  type StoreNodeInput,
} from './nodes.js';
import { search as searchImpl } from './search.js';
import {
  about as aboutImpl,
  stats as statsImpl,
  traverse as traverseImpl,
  type AboutOptions,
  type Stats,
  type TraverseResult,
} from './traverse.js';
import {
  EdgeType,
  NodeType,
  type Edge,
  type Node,
  type NodeTag,
  type SearchOptions,
  type TraverseOptions,
} from './types.js';

/**
 * TextereDB - Main database class for the Texere graph library
 *
 * Provides a high-level API for managing nodes, edges, search, and traversal operations.
 */
export class TextereDB {
  private db: Database.Database;

  /**
   * Creates a new TextereDB instance
   * @param dbPath - Path to the database file (use ':memory:' for in-memory database)
   */
  constructor(dbPath: string) {
    this.db = createDatabase(dbPath);
  }

  /**
   * Store a new node in the database
   * @param input - Node data to store
   * @returns The created node
   */
  storeNode(input: StoreNodeInput): Node {
    return storeNodeImpl(this.db, input);
  }

  /**
   * Retrieve a node by ID
   * @param id - Node ID
   * @param options - Optional retrieval options
   * @returns The node if found, null otherwise
   */
  getNode(id: string, options?: GetNodeOptions): Node | NodeWithEdges | null {
    return getNodeImpl(this.db, id, options);
  }

  /**
   * Mark a node as invalidated
   * @param id - Node ID to invalidate
   * @throws Error if node not found
   */
  invalidateNode(id: string): void {
    invalidateNodeImpl(this.db, id);
  }

  /**
   * Create an edge between two nodes
   * @param input - Edge data
   * @returns The created edge
   */
  createEdge(input: CreateEdgeInput): Edge {
    return createEdgeImpl(this.db, input);
  }

  /**
   * Delete an edge by ID
   * @param id - Edge ID to delete
   * @returns true if edge was deleted, false if not found
   */
  deleteEdge(id: string): boolean {
    return deleteEdgeImpl(this.db, id);
  }

  /**
   * Get all edges for a node
   * @param nodeId - Node ID
   * @param direction - Edge direction ('outgoing', 'incoming', or 'both')
   * @returns Array of edges
   */
  getEdgesForNode(nodeId: string, direction: EdgeDirection): Edge[] {
    return getEdgesForNodeImpl(this.db, nodeId, direction);
  }

  /**
   * Search for nodes using full-text search
   * @param options - Search options
   * @returns Array of matching nodes
   */
  search(options: SearchOptions): Node[] {
    return searchImpl(this.db, options);
  }

  /**
   * Traverse the graph from a starting node
   * @param options - Traversal options
   * @returns Array of traverse results with depth information
   */
  traverse(options: TraverseOptions): TraverseResult[] {
    return traverseImpl(this.db, options);
  }

  /**
   * Search and traverse - find nodes matching search criteria and their neighbors
   * @param options - Combined search and traversal options
   * @returns Array of traverse results with depth information
   */
  about(options: AboutOptions): TraverseResult[] {
    return aboutImpl(this.db, options);
  }

  /**
   * Get database statistics
   * @returns Statistics about nodes and edges
   */
  stats(): Stats {
    return statsImpl(this.db);
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}

// Re-export all public types
export type {
  // Node types
  Node,
  NodeWithEdges,
  StoreNodeInput,
  GetNodeOptions,
  // Edge types
  Edge,
  CreateEdgeInput,
  EdgeDirection,
  // Search types
  SearchOptions,
  // Traverse types
  TraverseOptions,
  TraverseResult,
  AboutOptions,
  Stats,
  // Tag types
  NodeTag,
};

// Re-export enums
export { NodeType, EdgeType };
