import { aboutTool } from './about.js';
import { createEdgeTool, createEdgesTool } from './create-edge.js';
import { deleteEdgeTool } from './delete-edge.js';
import { getNodeTool } from './get-node.js';
import { invalidateNodeTool } from './invalidate-node.js';
import { replaceNodeTool } from './replace-node.js';
import { searchTool } from './search.js';
import { statsTool } from './stats.js';
import { storeNodeTool, storeNodesTool } from './store-node.js';
import { traverseTool } from './traverse.js';

export { executeToolDefinition } from './helpers.js';
export type { ToolCallResult, ToolContext, ToolDefinition } from './types.js';

export const TOOL_DEFINITIONS = [
  storeNodeTool,
  storeNodesTool,
  getNodeTool,
  invalidateNodeTool,
  replaceNodeTool,
  createEdgeTool,
  createEdgesTool,
  deleteEdgeTool,
  searchTool,
  traverseTool,
  aboutTool,
  statsTool,
] as const;

export const TOOL_NAMES = TOOL_DEFINITIONS.map((tool) => tool.name) as ReadonlyArray<string>;
