from texere_core.router import select_adapter


def test_select_adapter_repo_and_llm():
    sel_repo = select_adapter("repo.read_file")
    assert sel_repo.adapter == "repo.local"

    sel_llm = select_adapter("llm.generate")
    assert sel_llm.adapter == "llm.fake"
