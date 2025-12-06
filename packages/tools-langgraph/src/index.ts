// Tools LangGraph adapter - converts CoreTool to LangChain StructuredTool
// See docs/specs/feature/texere-tool-spec.md §5 for specification

// TODO: Implement toLangGraphTool adapter per spec §5.1:
// - Wrap CoreTool handler with LangChain tool()
// - Translate ToolEffect (state updates, UI events) to Command/state updates
// - Support state injection via config.state
// - Support makeCommand helper for state mutations
// - Preserve Zod schema and tool metadata
// - Handle error propagation (throw or encode into Commands)

export {};
