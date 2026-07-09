from pathlib import Path
from click.testing import CliRunner
from longlink.cli.init import init_command
from longlink.constants import ROOT


IGNORED_SCAFFOLD_NAMES = frozenset({".pytest_cache", ".venv", "__pycache__"})


def test_init_copies_bundled_new_project_scaffold() -> None:
    """Copy the bundled new project scaffold into the target folder."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():

        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        target = Path.cwd() / "sample-app"

        assert result.exit_code == 0
        _assert_directory_was_copied(ROOT / ".static" / "new", target, exact=True)


def test_init_adds_github_ci_files_when_requested() -> None:
    """Copy the bundled scaffold and GitHub CI files when requested."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():

        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app", "--ci", "github"])

        # Assert
        target = Path.cwd() / "sample-app"
        ci_source = ROOT / ".static" / "ci" / "github"

        assert result.exit_code == 0
        _assert_directory_was_copied(
            ROOT / ".static" / "new",
            target,
            overwritten_paths=frozenset(_directory_entries(ci_source)),
        )
        _assert_directory_was_copied(ci_source, target)


def test_init_refuses_existing_non_empty_folder() -> None:
    """Avoid silently merging generated scaffold files into an existing project."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        target = Path.cwd() / "sample-app"
        target.mkdir()
        (target / "README.md").write_text("Existing project\n", encoding="utf-8")

        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        assert result.exit_code == 1
        assert "Target folder is not empty" in result.output
        assert (target / "README.md").read_text(encoding="utf-8") == "Existing project\n"


def _assert_directory_was_copied(
    source: Path,
    target: Path,
    *,
    exact: bool = False,
    overwritten_paths: frozenset[Path] = frozenset(),
) -> None:
    """Assert that all source entries were copied to the target directory."""

    source_entries = {
        relative_path: is_directory
        for relative_path, is_directory in _directory_entries(source).items()
        if relative_path not in overwritten_paths
    }
    target_entries = _directory_entries(target)

    if exact:
        assert target_entries == source_entries
    else:
        assert source_entries.items() <= target_entries.items()

    # File bytes prove init copied the scaffold content, not just the directory shape.
    for relative_path, is_directory in source_entries.items():
        if is_directory:
            continue

        assert (target / relative_path).read_bytes() == (source / relative_path).read_bytes()


def _directory_entries(root: Path) -> dict[Path, bool]:
    """Return non-transient directory entries keyed by relative path."""

    entries: dict[Path, bool] = {}
    pending = [root]

    # Match init's ignored development artifacts without depending on scaffold file names.
    while pending:
        current = pending.pop()

        for path in current.iterdir():
            relative_path = path.relative_to(root)

            if any(part in IGNORED_SCAFFOLD_NAMES for part in relative_path.parts):
                continue

            entries[relative_path] = path.is_dir()

            if path.is_dir():
                pending.append(path)

    return entries
