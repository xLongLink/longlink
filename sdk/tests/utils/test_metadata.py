from pathlib import Path
from longlink.utils.metadata import load_metadata


def test_metadata_loading_reads_longlink_and_pep_621_pyproject_sections(tmp_path: Path) -> None:
    """Load app metadata from LongLink and PEP 621 pyproject sections."""

    pyproject_path = tmp_path / "pyproject.toml"
    pyproject_path.write_text(
        "\n".join(
            [
                "[project]",
                'name = "pep-app"',
                'version = "1.2.3"',
                'description = "PEP app description"',
                "",
                "[tool.longlink]",
                'name = "longlink-app"',
                'title = "Operations Console"',
                'summary = "Ops summary"',
            ]
        ),
        encoding="utf-8",
    )

    metadata = load_metadata(pyproject_path)

    assert metadata.name == "longlink-app"
    assert metadata.title == "Operations Console"
    assert metadata.summary == "Ops summary"
    assert metadata.description == "PEP app description"
    assert metadata.version == "1.2.3"
