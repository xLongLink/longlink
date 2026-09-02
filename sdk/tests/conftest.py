import pytest
from pytest import MonkeyPatch
from pathlib import Path


@pytest.fixture
def solution_source(monkeypatch: MonkeyPatch, tmp_path: Path) -> Path:
    """Create the minimum generated Solution source layout."""

    # Create the source directories required by the runtime.
    source_directory = tmp_path / "src"
    (source_directory / "views").mkdir(parents=True)
    monkeypatch.chdir(tmp_path)

    return source_directory
