from __future__ import annotations

from typing import Any, Dict, List, Protocol


class RepoAdapter(Protocol):
    def repo_info(self) -> Dict[str, Any]: ...
    def capabilities(self) -> Dict[str, bool]: ...

    def list_files(
            self, glob: str | None = None, rev: str | None = None
    ) -> List[str]: ...
    def read_file(self, path: str, rev: str | None = None) -> bytes: ...


class LocalRepoAdapter:
    """Minimal local working-tree adapter stub for early development."""

    def __init__(self, root: str = ".") -> None:
        self.root = root

    def repo_info(self) -> Dict[str, Any]:
        return {
            "host": "local",
            "owner": None,
            "name": self.root,
            "default_branch": "main",
            "cache_path": self.root,
        }

    def capabilities(self) -> Dict[str, bool]:
        return {
            "pr": False,
            "branch": True,
            "rate_limits": False,
            "sparse_checkout": False,
            "apply_patch_worktree": False,
        }

    def list_files(self, glob: str | None = None, rev: str | None = None) -> List[str]:
        # Minimal implementation: list relative files under root (non-recursive if glob is None)
        import os

        results: List[str] = []
        for dirpath, _dirs, files in os.walk(self.root):
            for f in files:
                rel = os.path.relpath(os.path.join(dirpath, f), self.root)
                results.append(rel)
        return results

    def read_file(self, path: str, rev: str | None = None) -> bytes:
        import os

        full = os.path.join(self.root, path)
        with open(full, "rb") as f:
            return f.read()
