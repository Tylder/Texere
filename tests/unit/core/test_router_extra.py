from texere_core.router import select_adapter


def test_select_adapter_exec_and_unknown():
    sel_exec = select_adapter("exec.run")
    assert sel_exec.adapter == "exec.local"

    sel_unknown = select_adapter("foo.bar")
    assert sel_unknown.adapter == "unknown"
