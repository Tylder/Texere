# Local LLM + Langfuse Walkthrough

Goal: run a local GPU-hosted model (OpenAI-compatible) and use it in Texere with Langfuse
playground/tracing. Tested on RTX 2080 8 GB.

## 1) Start a local model endpoint

### Option A (multi-model, easy switching): Ollama with OpenAI API

```bash
ollama pull qwen2.5:7b-instruct-q4_0
ollama pull llama3.2:3b-instruct
OLLAMA_ORIGINS=* OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

Base URL: `http://localhost:11434/v1` (or `http://host.docker.internal:11434/v1` from Docker).

### Option B (single-model, higher perf): vLLM

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

#### Docker Compose (vLLM single-model)

Create `docker-compose.vllm.yml`:

```yaml
services:
  vllm:
    image: vllm/vllm-openai:latest
    gpus: all
    ports:
      - '8000:8000'
    environment:
      VLLM_API_KEY: local-key
    command: >
      --model Qwen2.5-7B-Instruct --quantization gptq --host 0.0.0.0 --port 8000
      --gpu-memory-utilization 0.85
```

Run: `docker compose -f docker-compose.vllm.yml up -d`

#### Docker Compose (Ollama multi-model)

Use provided `docker-compose.ollama.yml`:

```bash
docker compose -f docker-compose.ollama.yml up -d
docker compose -f docker-compose.ollama.yml exec ollama ollama pull qwen2.5:7b-instruct-q4_0
docker compose -f docker-compose.ollama.yml exec ollama ollama pull llama3.2:3b-instruct
```

Base URL: `http://localhost:11434/v1`

## 2) Configure Texere env

Set in `.env` (or a `.env.local`):

```
MODEL_ENDPOINT=http://localhost:8000/v1
MODEL_KEY=local-key
MODEL_NAME=Qwen2.5-7B-Instruct
MODEL_PROVIDER=local-vllm
```

If using Ollama, set `MODEL_ENDPOINT=http://localhost:11434/v1` and `MODEL_NAME` to the Ollama model
id (e.g., `qwen2.5:7b-instruct-q4_0`). Restart Texere so it picks up the envs.

## 3) Expose model to Langfuse

In Langfuse UI → Project Settings → LLM Connections → Add:

- Adapter: OpenAI
- Base URL:
  - vLLM: `http://host.docker.internal:8000/v1` (or `http://localhost:8000/v1` on Linux)
  - Ollama: `http://host.docker.internal:11434/v1`
- API Key: `local-key` (or whatever your endpoint expects)
- Allowed models: list all models you want to switch between (Ollama/router) or the single vLLM
  model. Save.

## 4) Use in Prompt Playground

- Go to Playground, select the new connection/model.
- Craft prompts; outputs are traced automatically if you use the Langfuse OpenAI SDK in Texere (or
  enable tracing in UI).

## 5) Run a Texere workflow with the local model

Ensure your graph uses `config_schema={"configurable": {"llm": str}}` and that the LLM factory
reads:

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
