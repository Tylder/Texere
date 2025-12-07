// Tools Mastra adapter - converts CoreTool to Mastra createTool
// See docs/specs/feature/texere-tool-spec.md §4 for specification

// GetRepoInfo Tool - Mastra adapter for skeleton v0.1
export { getRepoInfoTool } from './tools/get-repo-info';

// TODO: Implement toMastraTool adapter per spec §4.1:
// - Map CoreTool handler to Mastra execute signature
// - Translate ToolEffect (state updates, UI events) to writer.custom()
// - Preserve runtimeContext, tracingContext, abortSignal
// - Handle error propagation
// - Support full Mastra observability
