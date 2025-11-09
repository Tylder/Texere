# Texere LLM Adapter Selection (v0)

## Purpose
Signals and policy for selecting among many LLM adapters in a LangGraph run.

## Descriptor Extensions (LLM)
```json
{"LLMAttrs": {
  "context_window": 128000,
  "tool_call_fidelity": 0.95,
  "json_mode_reliability": 0.9,
  "supports_streaming": true,
  "supports_tool_calls": true,
  "max_output_tokens": 4096,
  "input_cost_usd_per_1k": 0.002,
  "output_cost_usd_per_1k": 0.006
}}
```

## Selection Signals
- Fit: `context_window >= prompt + expected_output`.
- Fidelity: prefer higher `tool_call_fidelity` for tool-heavy plans.
- JSON correctness: prefer higher `json_mode_reliability` for strict JSON outputs.
- Latency/cost: minimize `latency_ms_p50` and estimated cost under budget.
- Streaming: require when UX or downstream needs incremental tokens.
- Stickiness: keep the same LLM within a run to maintain style/consistency unless policy/budget forces a switch.

## Policy Interactions
- Enforce budget caps on token usage and USD cost.
- Deny NET if provider requires outbound to non-allowlisted domains.
- Apply HITL only when LLM action triggers WRITE/EXEC/NET via tools.

## Examples
1) Tool-heavy plan with strict JSON outputs → pick LLM with high `tool_call_fidelity` and `json_mode_reliability` even if slightly slower.
2) Long-context summarization → prioritize `context_window` and cost; allow slower model with better price/token.
3) Interactive UX → require `supports_streaming`; pin for run continuity.

