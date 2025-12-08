# Testing the LangGraph Text Classifier

This guide explains how to test and debug the classifier using Ollama, LangGraph UI, and Langfuse.

## Prerequisites

You have:

- **Ollama**: Running on `http://localhost:11434` (configurable via `OLLAMA_BASE_URL`)
- **Langfuse**: Docker compose setup available (`docker-compose.langfuse.yml`)
- **LangGraph UI**: Available in `.langgraph_api/` for graph visualization

## Quick Start: Run Tests

### Option 1: Unit Tests (Mocked LLM)

Run the test suite with mocked LLM responses (no Ollama needed):

```bash
# Type check the package
pnpm --filter @repo/langgraph-orchestrator check-types

# Run tests
pnpm --filter @repo/langgraph-orchestrator test

# Watch mode for development
pnpm --filter @repo/langgraph-orchestrator test:watch

# With coverage
pnpm --filter @repo/langgraph-orchestrator test:coverage
```

**Files tested:**

- `src/api-classify.test.ts` – classification API tests
- Mocks `llm-adapter` to avoid real Ollama calls

### Option 2: Integration Test (Real Ollama)

Run the classifier against a real LLM:

```bash
# First, ensure Ollama is running
# http://localhost:11434

# Run the test script
cd packages/langgraph-orchestrator
npx tsx test-classifier.ts
```

**This will:**

1. Connect to your local Ollama instance
2. Classify three example texts
3. Print label, confidence, and reasoning for each
4. Show execution times

## Understanding Test Output

### Unit Test Example

```
✓ classifyText (langgraph_orchestrator_spec.md §7) (3 tests) 123ms
  ✓ should return ClassifyTextResult with classification
  ✓ should handle fallback when classification is null
```

### Integration Test Example

```
🚀 Testing LangGraph Classifier...

📝 Input: "I absolutely love this product! Best purchase ever!"
📊 Categories: positive, negative, neutral
⏳ Running classifier...

✅ Result:
   Label: positive
   Confidence: 95.0%
   Reasoning: Contains positive sentiment indicators

---
```

## How the Classifier Works

### Architecture

```
Input (text + categories)
        ↓
classifyText() API (api.ts)
        ↓
buildClassifyGraph() (graphs/classify-text.ts)
        ↓
classifierNode() (nodes/classifier-node.ts)
        ↓
LLM (ChatOllama) with system prompt
        ↓
JSON parsing + fallback
        ↓
ClassifyTextResult
```

### State Flow (LangGraph)

```
START
  ↓
classifier (single LLM call)
  ↓
END
```

**Key difference from answer-question:** No loops, no tools, single LLM invocation.

## Debugging with LangGraph UI

The `.langgraph_api/` folder contains LangGraph configuration. To visualize your graph:

1. **Start LangGraph Studio** (if available):

   ```bash
   langgraph up --host 0.0.0.0 --port 8000
   ```

2. **Navigate to** `http://localhost:8000`

3. **Select `classify-text` graph** and run test inputs

4. **Inspect:**
   - State values at each node
   - Messages history
   - Classification result
   - Execution timeline

## Integrating with Langfuse

To send classifier runs to Langfuse for observability:

### Step 1: Start Langfuse

```bash
docker compose -f docker-compose.langfuse.yml up -d
```

Services:

- **Web UI**: http://localhost:3333
- **API**: http://localhost:3030
- **PostgreSQL**: localhost:5432
- **ClickHouse**: localhost:8123
- **MinIO**: http://localhost:9090

### Step 2: Update Classifier to Log to Langfuse

Modify `src/nodes/classifier-node.ts` to send traces:

```typescript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'http://localhost:3030',
});

export async function classifierNode(state: ClassifyStateType) {
  // ... existing code ...

  const trace = langfuse.trace({
    name: 'classify-text',
    input: { messages: state.messages },
  });

  const generation = trace.generation({
    name: 'llm-call',
    model: 'llama3.2:3b',
    input: [systemPrompt, ...state.messages],
  });

  const response = await modelWithTools.invoke([systemPrompt, ...state.messages]);

  generation.end({
    output: response.content,
  });

  trace.end();

  // ... rest of code ...
}
```

### Step 3: Set Environment Variables

```bash
export LANGFUSE_PUBLIC_KEY=your-public-key
export LANGFUSE_SECRET_KEY=your-secret-key
export LANGFUSE_BASE_URL=http://localhost:3030
```

### Step 4: Run Classifier

```bash
npx tsx test-classifier.ts
```

All runs will appear in Langfuse at http://localhost:3333

## Environment Variables

Configure via `.env` (copy from `.env.example`):

```env
# Ollama (LLM)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b-instruct-q5_K_S

# Langfuse (optional, for observability)
LANGFUSE_PUBLIC_KEY=pk_xxxx
LANGFUSE_SECRET_KEY=sk_xxxx
LANGFUSE_BASE_URL=http://localhost:3030
```

## Troubleshooting

### "Cannot connect to Ollama"

- Ensure Ollama is running: `curl http://localhost:11434/api/version`
- Check `OLLAMA_BASE_URL` env var
- Try `docker-compose.ollama.yml` if you have it

### "Module not found: classifier-node"

- Run `pnpm install` in the package
- Check `src/nodes/classifier-node.ts` exists
- Verify imports use `.js` extensions

### "Classification is null"

- Check the test-classifier.ts output for error messages
- Verify system prompt format matches LLM expectations
- Try simpler test case: `"good"` vs `["positive", "negative"]`

### LangGraph UI not starting

- Ensure `.langgraph_api/` exists
- Run `langgraph build` if needed
- Check port 8000 is not in use

## Next Steps

1. **Add more workflows** following the same pattern:
   - Routing: add conditional edges
   - Tools: bind tools to LLM and handle tool_calls
   - Loops: conditional edges back to agent node

2. **Improve LLM responses**:
   - Tune system prompt for your use case
   - Add few-shot examples
   - Adjust temperature/top_p

3. **Scale observability**:
   - Integrate all workflows with Langfuse
   - Track metrics (latency, token usage, confidence)
   - Set up alerts for failures

4. **Test with different models**:
   - Try different Ollama models (llama2, mistral, etc.)
   - Compare performance and accuracy
   - Store results in Langfuse for analysis
