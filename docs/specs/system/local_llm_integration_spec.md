# Local LLM Integration Specification

**Document Version:** 0.1  
**Last Updated:** December 2025  
**Status:** Draft

## 1. Scope
- Enable local or self-hosted LLMs to be used interchangeably with cloud models in Texere.
- Maintain observability via Langfuse (traces, costs, model identification).
- Keep runtime model selection configurable (no graph rebuilds).

## 2. Requirements
- OpenAI-compatible HTTP API exposed (chat/completions) by the local model server.
- Endpoint reachable from Langfuse and Texere: `MODEL_ENDPOINT` (e.g., `http://localhost:8000/v1` or `http://host.docker.internal:8000/v1` when inside Docker).
- API key (can be dummy for local) provided as `MODEL_KEY`.
- Model id string registered in both:
  - Texere env/config: `MODEL_NAME`.
  - Langfuse LLM Connection allowed models list.
- GPU fits model: target ≤8 GB VRAM for laptop GPUs (e.g., RTX 2080) → prefer 7B Q4/GPTQ or 3B fp16.

## 3. Configuration (Texere)
- Add envs:
  - `MODEL_ENDPOINT` – OpenAI-compatible base URL.
  - `MODEL_KEY` – API key/token.
  - `MODEL_NAME` – Default model id.
  - Optional: `MODEL_PROVIDER` (label) and `MODEL_FALLBACKS` (comma-separated list).
- Graphs must expose `config_schema={"configurable": {"llm": str}}` so per-run model override is possible.
- LLM factory resolves `llm_model = config["configurable"].get("llm", MODEL_NAME)` and instantiates a chat model with `base_url=MODEL_ENDPOINT`, `api_key=MODEL_KEY`.
- Attach `{"metadata": {"llm_model": llm_model}}` to `RunnableConfig` for Langfuse tagging.

## 4. Langfuse Integration
- Create an LLM Connection (OpenAI adapter):
  - Base URL: `MODEL_ENDPOINT`.
  - API key: `MODEL_KEY`.
  - Allowed models: include `MODEL_NAME` (and any alternates).
- Use `langfuse.openai` wrapper in Texere for automatic tracing; respects `OPENAI_API_BASE` and `OPENAI_API_KEY`.
- Prompt Playground uses the connection to experiment with prompts and switch models without code changes.

## 5. Local Model Server Options
- **vLLM** (recommended): `vllm serve <model> --quantization gptq --host 0.0.0.0 --port 8000 --gpu-memory-utilization 0.85 --api-key <MODEL_KEY>`.
- **Ollama with OpenAI API**: `OLLAMA_HOST=0.0.0.0:11434` and enable OpenAI compatibility; expose via reverse proxy to `/v1`.
- Any provider exposing OpenAI-compatible endpoints (RunPod/Vast/Salad/Hyperbolic) can be swapped by env.

## 6. Testing & Validation
- Smoke test: `curl $MODEL_ENDPOINT/models -H "Authorization: Bearer $MODEL_KEY"` should list `MODEL_NAME`.
- Langfuse trace check: run a minimal Texere workflow; verify trace shows `llm_model` metadata and correct provider.
- Performance: keep context <=4K tokens on 7B Q4 for latency on laptop GPUs.

## 7. Non-Goals
- Fine-tuning pipelines.
- Non-OpenAI protocol adapters (e.g., pure HuggingFace text-generation-inference without compatibility layer).
