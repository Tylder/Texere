# LangGraph Classifier Setup Checklist

## Step 1: Environment Variables ✓

- [ ] Copy variables from `ENV_SETUP.md` to `.env` file
- [ ] Set `OLLAMA_BASE_URL=http://localhost:11434`
- [ ] Set `OLLAMA_MODEL=llama3.2:3b-instruct-q5_K_S` (or your model)
- [ ] Langfuse keys optional (leave empty if not using)

## Step 2: Verify Services Running

- [ ] **Ollama**: `curl http://localhost:11434/api/version` returns model info
- [ ] **Langfuse** (optional): `curl http://localhost:3030/api/health` returns 200 (if using docker
      compose)

## Step 3: Install Dependencies

```bash
pnpm install
```

## Step 4: Type Check

```bash
pnpm --filter @repo/langgraph-orchestrator check-types
```

Should see: `Found 0 errors`

## Step 5: Run Unit Tests (Mocked - No Ollama Needed)

```bash
pnpm --filter @repo/langgraph-orchestrator test
```

Expected output:

```
✓ classifyText (langgraph_orchestrator_spec.md §7)
  ✓ should return ClassifyTextResult with classification
  ✓ should handle fallback when classification is null
```

## Step 6: Run Integration Test (Real Ollama)

```bash
cd packages/langgraph-orchestrator
npx tsx test-classifier.ts
```

Expected output:

```
🚀 Testing LangGraph Classifier...

📝 Input: "I absolutely love this product! Best purchase ever!"
📊 Categories: positive, negative, neutral
⏳ Running classifier...

✅ Result:
   Label: positive
   Confidence: 95.0%
   Reasoning: ...
```

## Step 7: Optional - Run with Langfuse

Start Langfuse (if not already running):

```bash
docker compose -f docker-compose.langfuse.yml up -d
```

Then run tests and check http://localhost:3333 for traces.

## Troubleshooting

| Issue                                            | Solution                                               |
| ------------------------------------------------ | ------------------------------------------------------ |
| "Cannot connect to Ollama"                       | Verify `curl http://localhost:11434/api/version` works |
| "Module not found"                               | Run `pnpm install` in langgraph-orchestrator package   |
| Tests timeout                                    | Check Ollama model is loaded: `ollama list`            |
| "ENOENT: no such file or directory, open '.env'" | Create `.env` with variables from `ENV_SETUP.md`       |

## Files Created

All classifier code is in:

- `src/state/classifier-types.ts` – Types & schemas
- `src/nodes/classifier-node.ts` – LLM node
- `src/graphs/classify-text.ts` – Graph definition
- `src/api-classify.test.ts` – Unit tests
- `test-classifier.ts` – Integration test script
- `CLASSIFIER_TESTING_GUIDE.md` – Full testing guide
