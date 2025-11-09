from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .events import EventLogger


@dataclass
class Services:
    repo: Any | None = None
    retr: Any | None = None
    llm: Any | None = None
    exec: Any | None = None
    policy: Any | None = None
    events: EventLogger = EventLogger()
