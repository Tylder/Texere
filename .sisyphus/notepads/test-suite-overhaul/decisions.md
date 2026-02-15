# Architectural Decisions

## Test Architecture
- Unit tests call internal module functions directly
- Facade tests (index.test.ts, index.int.test.ts) call Texere class methods
- MCP tests call mcp.callTool() wrappers
