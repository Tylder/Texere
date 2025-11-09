from __future__ import annotations

"""Simple adapter selection stubs for demo routing."""


class AdapterSelection:
    def __init__(self, tool: str, adapter: str, reason: str) -> None:
        self.tool = tool
        self.adapter = adapter
        self.reason = reason


def select_adapter(tool: str) -> AdapterSelection:
    """Deterministic stub: route repo.* to local, llm.* to fake, exec.* to local.

    In future, consult registry, capabilities, policy, and budget.
    """
    if tool.startswith("repo."):
        return AdapterSelection(tool, "repo.local", "local is fastest for READ")
    if tool.startswith("llm."):
        return AdapterSelection(tool, "llm.fake", "demo stream")
    if tool.startswith("exec."):
        return AdapterSelection(tool, "exec.local", "demo")
    return AdapterSelection(tool, "unknown", "no match")
