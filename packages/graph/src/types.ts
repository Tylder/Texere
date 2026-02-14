// Core node types (6 values)
export enum NodeType {
  Knowledge = 'knowledge',
  Issue = 'issue',
  Action = 'action',
  Artifact = 'artifact',
  Context = 'context',
  Meta = 'meta',
}

// Node roles (20 values) - constrained by type
export enum NodeRole {
  // Knowledge roles (6)
  Decision = 'decision',
  Requirement = 'requirement',
  Constraint = 'constraint',
  Principle = 'principle',
  Finding = 'finding',
  Research = 'research',

  // Issue roles (2)
  Problem = 'problem',
  Error = 'error',

  // Action roles (5)
  Task = 'task',
  Solution = 'solution',
  Fix = 'fix',
  Workflow = 'workflow',
  Command = 'command',

  // Artifact roles (5)
  Example = 'example',
  CodePattern = 'code_pattern',
  Technology = 'technology',
  Project = 'project',
  FileContext = 'file_context',

  // Context roles (1)
  Conversation = 'conversation',

  // Meta roles (1)
  System = 'system',
}

// Facet enums
export enum NodeSource {
  Internal = 'internal',
  External = 'external',
}

export enum NodeStatus {
  Proposed = 'proposed',
  Active = 'active',
  Deprecated = 'deprecated',
  Invalidated = 'invalidated',
}

export enum NodeScope {
  Project = 'project',
  Module = 'module',
  File = 'file',
  Session = 'session',
}

// Edge types (12 values)
export enum EdgeType {
  Resolves = 'RESOLVES',
  Causes = 'CAUSES',
  DependsOn = 'DEPENDS_ON',
  Extends = 'EXTENDS',
  Constrains = 'CONSTRAINS',
  Contradicts = 'CONTRADICTS',
  Replaces = 'REPLACES',
  AnchoredTo = 'ANCHORED_TO',
  AlternativeTo = 'ALTERNATIVE_TO',
  ExampleOf = 'EXAMPLE_OF',
  Supports = 'SUPPORTS',
  PartOf = 'PART_OF',
}

// Type-role constraint matrix
export const VALID_ROLES_BY_TYPE: Record<NodeType, NodeRole[]> = {
  [NodeType.Knowledge]: [
    NodeRole.Decision,
    NodeRole.Requirement,
    NodeRole.Constraint,
    NodeRole.Principle,
    NodeRole.Finding,
    NodeRole.Research,
  ],
  [NodeType.Issue]: [NodeRole.Problem, NodeRole.Error],
  [NodeType.Action]: [
    NodeRole.Task,
    NodeRole.Solution,
    NodeRole.Fix,
    NodeRole.Workflow,
    NodeRole.Command,
  ],
  [NodeType.Artifact]: [
    NodeRole.Example,
    NodeRole.CodePattern,
    NodeRole.Technology,
    NodeRole.Project,
    NodeRole.FileContext,
  ],
  [NodeType.Context]: [NodeRole.Conversation],
  [NodeType.Meta]: [NodeRole.System],
};

// Validation function
export function isValidTypeRole(type: NodeType, role: NodeRole): boolean {
  const validRoles = VALID_ROLES_BY_TYPE[type];
  return validRoles ? validRoles.includes(role) : false;
}

export interface Node {
  id: string;
  type: NodeType;
  role: NodeRole;
  title: string;
  content: string;
  tags_json: string;
  importance: number;
  confidence: number;
  source?: NodeSource;
  status?: NodeStatus;
  scope?: NodeScope;
  created_at: number;
  invalidated_at: number | null;
  embedding: Uint8Array | Buffer | null;
}

export interface Edge {
  id: string;
  source_id: string;
  target_id: string;
  type: EdgeType;
  strength: number;
  confidence: number;
  created_at: number;
}

export interface NodeTag {
  node_id: string;
  tag: string;
}

export interface SearchResult extends Node {
  rank: number;
  match_quality: number;
  match_fields: string[];
  relationships: {
    incoming: Edge[];
    outgoing: Edge[];
  };
}

export interface SearchOptions {
  query: string;
  type?: NodeType | NodeType[];
  role?: NodeRole;
  tags?: string[];
  tagMode?: 'all' | 'any';
  minImportance?: number;
  limit?: number;
}

export interface TraverseOptions {
  startId: string;
  direction?: 'outgoing' | 'incoming' | 'both';
  maxDepth?: number;
  edgeType?: EdgeType;
}
