from __future__ import annotations

from dataclasses import dataclass
from typing import List, Iterable
from importlib import metadata

"""Minimal adapter/tool registry with room to grow.

For now we keep this intentionally small and deterministic while we wire the CLI
and router to use it. Entry‑point discovery can be added later without changing
the public functions.
"""


@dataclass(frozen=True)
class Adapter:
    name: str  # e.g., "repo.local", "llm.fake", "exec.local"
    kind: str  # e.g., "repo", "llm", "exec"


@dataclass(frozen=True)
class Tool:
    name: str  # e.g., "repo.read_file"
    adapter: str  # adapter name


def _discover_repo_adapters() -> List[Adapter]:
    """Discover repo drivers via entry points `texere.repo_drivers`.

    Each entry point provides a Python object (typically a class) for a driver. We
    only need the name for registry display at this stage.
    """
    adapters: list[Adapter] = []
    try:
        eps: Iterable[metadata.EntryPoint]
        # Python 3.10+ returns a Selection object with .select
        eps = metadata.entry_points().select(group="texere.repo_drivers")  # type: ignore[attr-defined]
    except Exception:
        # Fallback for older behaviors or environments without entry points
        eps = []

    for ep in eps:
        # Adapter naming convention: repo.<entrypoint_name>
        adapters.append(Adapter(name=f"repo.{ep.name}", kind="repo"))
    return adapters


def list_adapters() -> List[Adapter]:
    """Return known adapters.

    Later this will consult entry points and capabilities. For now, return
    the built‑in demo adapters to keep behavior stable and testable.
    """
    repo = _discover_repo_adapters()
    # Always include local as a baseline; de-dupe by name
    names = {a.name for a in repo}
    if "repo.local" not in names:
        repo.insert(0, Adapter("repo.local", "repo"))
    # Add the known demo adapters for now
    return [*repo, Adapter("llm.fake", "llm"), Adapter("exec.local", "exec")]


def list_tools() -> List[Tool]:
    """Return known tool names with their owning adapter."""
    adapters = list_adapters()
    # Prefer repo.local if present, else first discovered repo adapter
    repo_owner = next(
        (a.name for a in adapters if a.kind == "repo" and a.name == "repo.local"), None
    )
    if not repo_owner:
        repo_owner = next((a.name for a in adapters if a.kind == "repo"), "repo.local")
    return [
        Tool("repo.list_files", repo_owner),
        Tool("repo.read_file", repo_owner),
        Tool("repo.apply_patch", repo_owner),
        Tool("llm.generate", "llm.fake"),
        Tool("exec.run", "exec.local"),
    ]
