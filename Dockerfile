FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml requirements-lock.txt ./
RUN pip install --no-cache-dir -r requirements-lock.txt

COPY src src/
COPY langgraph.json .

# LangGraph API server exposes orchestration core at port 2024
# Observability (Langfuse) runs separately: see docker-compose.langfuse.yml
EXPOSE 2024

# Run LangGraph API server (not the UI)
# This exposes the graph via HTTP API without the LangGraph Studio UI
# Full observability is provided by Langfuse when LANGFUSE_PUBLIC_KEY is set
CMD ["langgraph", "api", "--host", "0.0.0.0", "--port", "2024"]
