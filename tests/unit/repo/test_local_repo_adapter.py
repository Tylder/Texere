from pathlib import Path

from texere_repo_drivers.local import LocalRepoAdapter


def test_local_repo_adapter_list_and_read(tmp_path: Path):
    # Arrange: create a simple file under a temp root
    root = tmp_path
    f = root / "hello.txt"
    f.write_text("hello", encoding="utf-8")

    # Act
    adapter = LocalRepoAdapter(str(root))
    files = adapter.list_files()
    content = adapter.read_file("hello.txt")

    # Assert
    assert "hello.txt" in files
    assert content == b"hello"
