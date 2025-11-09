from texere_core.registry import list_adapters, list_tools


def test_registry_lists_include_local_and_demo():
    adapters = list_adapters()
    names = {a.name for a in adapters}
    assert "repo.local" in names
    assert "exec.local" in names
    assert any(n.startswith("llm.") for n in names)


def test_registry_tools_assign_repo_owner():
    tools = list_tools()
    tool_map = {t.name: t.adapter for t in tools}
    assert tool_map["repo.list_files"].startswith("repo.")
    assert tool_map["repo.read_file"].startswith("repo.")
    assert tool_map["llm.generate"].startswith("llm.")
    assert tool_map["exec.run"].startswith("exec.")
