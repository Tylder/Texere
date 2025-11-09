from __future__ import annotations

import time
from typing import Generator, Iterable


def stream_generate(prompt: str) -> Generator[str, None, None]:
    """Fake LLM, Large Language Model, token stream for demos.

    Yields small chunks with slight delay to simulate streaming.
    """
    text = f"You said: {prompt}\nThis is a simulated streamed response."
    for token in text.split(" "):
        yield token + " "
        time.sleep(0.03)

