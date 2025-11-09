# Agent Interaction Guidelines

## Purpose
These rules guide how agents (LLMs, Large Language Models) ask for clarification and present options to reduce misunderstandings.

## Question & Answer Format
- Always ask clarifying questions when requirements or context are ambiguous.
- Use numbered questions with lettered multiple-choice answers.
- Make answer "A" your recommended option for each question.
- For every question: explain why you are asking it.
- For every answer choice: explain what selecting it implies.
- After listing choices, clearly restate your recommendation and explain why it is preferred.

Example structure:
1) What scope should we scaffold first? (Explain why this matters for risk and effort.)
   - A) Core library only — recommended (Explain tradeoffs and why best.)
   - B) Core + CLI (Explain implications.)
   - C) Full stack with services (Explain implications.)
   Recommendation: A. Rationale: …

## Abbreviations
- When using any abbreviation, include its full expansion at least once per answer in this exact format: `XXX, Xxx Xxx Xxx`.
- Example: Use "LLM, Large Language Model" and "HITL, Human In The Loop" the first time each appears in an answer.

## Tone & Constraints
- Be concise, specific, and action-oriented; avoid filler.
- Prefer repository-specific details and files when referencing context.
- If blocked by missing information, ask a numbered, multiple-choice question following the format above before proceeding.

