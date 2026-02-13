export enum NodeType {
  Task = 'task',
  CodePattern = 'code_pattern',
  Problem = 'problem',
  Solution = 'solution',
  Project = 'project',
  Technology = 'technology',
  Error = 'error',
  Fix = 'fix',
  Command = 'command',
  FileContext = 'file_context',
  Workflow = 'workflow',
  General = 'general',
  Conversation = 'conversation',
  Decision = 'decision',
  Requirement = 'requirement',
  Constraint = 'constraint',
  Research = 'research',
}

export enum EdgeType {
  RelatedTo = 'RELATED_TO',
  Causes = 'CAUSES',
  Solves = 'SOLVES',
  Requires = 'REQUIRES',
  Contradicts = 'CONTRADICTS',
  BuildsOn = 'BUILDS_ON',
  DeprecatedBy = 'DEPRECATED_BY',
  Prevents = 'PREVENTS',
  Validates = 'VALIDATES',
  AlternativeTo = 'ALTERNATIVE_TO',
  MotivatedBy = 'MOTIVATED_BY',
  Implements = 'IMPLEMENTS',
  Constrains = 'CONSTRAINS',
  AnchoredTo = 'ANCHORED_TO',
}

export interface Node {
  id: string;
  type: NodeType;
  title: string;
  content: string;
  tags_json: string;
  importance: number;
  confidence: number;
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

export interface SearchOptions {
  query: string;
  type?: NodeType;
  tags?: string[];
  minImportance?: number;
  limit?: number;
}

export interface TraverseOptions {
  startId: string;
  direction?: 'outgoing' | 'incoming' | 'both';
  maxDepth?: number;
  edgeType?: EdgeType;
}
