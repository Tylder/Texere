/**
 * LangGraph dev server: Express API for orchestrator workflows.
 * Spec reference: langgraph_orchestrator_spec.md §10.3
 */
import express from 'express';

import { answerQuestion } from '@repo/langgraph-orchestrator';

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());

/**
 * POST /api/v1/answer-question
 * Request: { repoPath: string, question: string, maxDepth?: number }
 */
app.post('/api/v1/answer-question', (_req, res): void => {
  void (async () => {
    try {
      const result = await answerQuestion(
        (_req.body as { repoPath: string; question: string; maxDepth?: number }) || {},
      );
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  })();
});

app.listen(port, () => {
  console.log(`LangGraph orchestrator listening on :${port}`);
});
