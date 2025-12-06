# Local LLM + Langfuse Walkthrough

Goal: run a local GPU-hosted model (OpenAI-compatible) and use it in Texere with Langfuse playground/tracing. Tested on RTX 2080 8 GB.

## 1) Start a local model server (vLLM example)

```bash
MODEL=Qwen2.5-7B-Instruct
KEY=local-key
PORT=8000
vllm serve $MODEL \
  --quantization gptq \
  --host 0.0.0.0 --port $PORT \
  --gpu-memory-utilization 0.85 \
  --api-key $KEY
```
- For Docker: map `8000:8000` and use `--entrypoint`.
- Ensure the server returns the model list:
  `curl http://localhost:8000/v1/models -H "Authorization: Bearer $KEY"`

## 2) Configure Texere env

Set in `.env` (or a `.env.local`):
```
MODEL_ENDPOINT=http://localhost:8000/v1
MODEL_KEY=local-key
MODEL_NAME=Qwen2.5-7B-Instruct
MODEL_PROVIDER=local-vllm
```
Restart Texere so it picks up the envs.

## 3) Expose model to Langfuse

In Langfuse UI → Project Settings → LLM Connections → Add:
- Adapter: OpenAI
- Base URL: http://host.docker.internal:8000/v1   (or `http://localhost:8000/v1` if Langfuse runs on the host)
- API Key: `local-key`
- Allowed models: `Qwen2.5-7B-Instruct`
Save.

## 4) Use in Prompt Playground

- Go to Playground, select the new connection/model.
- Craft prompts; outputs are traced automatically if you use the Langfuse OpenAI SDK in Texere (or enable tracing in UI).

## 5) Run a Texere workflow with the local model

Ensure your graph uses `config_schema={"configurable": {"llm": str}}` and that the LLM factory reads:
- model id from `config["configurable"]["llm"]` (fallback `MODEL_NAME`)
- base_url from `MODEL_ENDPOINT`
- api_key from `MODEL_KEY`

Invoke with an override (optional):
```python
graph = create_workflow_graph()
graph.invoke(state, config={"configurable": {"llm": "Qwen2.5-7B-Instruct"}})
```

## 6) Verify tracing

In Langfuse:
- Check Traces → ensure `llm_model` tag shows `Qwen2.5-7B-Instruct`
- Playground runs also appear if tracing is enabled.

## 7) Switching to a remote cheap GPU

Spin a serverless pod (RunPod/Vast/Salad/Hyperbolic) exposing OpenAI-compatible API; set:
```
MODEL_ENDPOINT=https://<provider-endpoint>/v1
MODEL_KEY=<provider-key>
MODEL_NAME=<model-id>
```
Restart Texere and update Langfuse LLM Connection Base URL/Allowed models. No code changes needed.
