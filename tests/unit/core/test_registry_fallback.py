from types import SimpleNamespace

from texere_core import registry as reg


class DummyEP(SimpleNamespace):
    pass


def test_registry_includes_repo_local_even_when_not_discovered(monkeypatch):
    # Simulate only other repo driver discovered
    class DummySelection:
        def select(self, group: str):  # type: ignore[no-redef]
            if group == "texere.repo_drivers":
                return [DummyEP(name="other")]
            return []

    monkeypatch.setattr(reg.metadata, "entry_points", lambda: DummySelection())
    adapters = reg.list_adapters()
    names = {a.name for a in adapters}
    assert "repo.local" in names  # ensured baseline
    tools = reg.list_tools()
    tool_map = {t.name: t.adapter for t in tools}
    # Owner should be repo.local preferred
    assert tool_map["repo.list_files"] == "repo.local"
