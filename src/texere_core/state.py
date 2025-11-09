from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class Step(BaseModel):
    id: str
    tool: str
    args: Dict[str, Any] = Field(default_factory=dict)
    out: Optional[str] = None
    retry: Dict[str, Any] = Field(default_factory=lambda: {"max": 1, "backoff_ms": 500})


class Plan(BaseModel):
    id: str
    steps: List[Step] = Field(default_factory=list)


class Budget(BaseModel):
    seconds: int = 1200
    tokens: int = 200_000
    usd: float = 5.0


class Caps(BaseModel):
    max_files_changed: int = 10
    max_loc_delta: int = 500


class State(BaseModel):
    run_id: str
    status: Literal["PENDING", "RUNNING", "INTERRUPTED", "DONE", "FAILED"] = "PENDING"
    plan: Plan
    plan_idx: int = 0
    artifacts: Dict[str, Any] = Field(default_factory=dict)
    budget: Budget = Field(default_factory=Budget)
    caps: Caps = Field(default_factory=Caps)
    env: Dict[str, Any] = Field(default_factory=dict)
    telemetry: Dict[str, Any] = Field(default_factory=dict)


class Decision(BaseModel):
    action: Literal["ALLOW", "REQUIRE_HITL", "DENY"]
    reason: str
    risk: int = 0

