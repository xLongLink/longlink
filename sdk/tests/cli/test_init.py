import runpy
import pytest
import shutil
import sqlite3
import subprocess
from pathlib import Path
from contextlib import chdir, closing
from longlink.cli import init
from unittest.mock import Mock
from longlink.cli.main import main
from longlink.database import migrations as database_migrations


@pytest.mark.parametrize(("folder", "project_name"), [(".", "sample"), ("sample-solution", "a"), ("numeric", "7")])
def test_init_copies_github_project_scaffold_with_custom_name(tmp_path: Path, folder: str, project_name: str) -> None:
    """Copy the project scaffold with requested GitHub workflows and package name."""

    with chdir(tmp_path):
        # Act
        main(["init", "--folder", folder, "--ci", "github", "--name", project_name])

        # Assert
        target = Path.cwd() / folder
        for path in [
            "src/models",
            "src/views",
            "src/routes",
            "src/schemas",
            "tests/test_app.py",
            ".github/workflows/release.yml",
            ".github/workflows/tests.yml",
        ]:
            assert (target / path).exists()
        main_source = (target / "main.py").read_text(encoding="utf-8")
        assert "app = LongLink()" in main_source
        pyproject = (target / "pyproject.toml").read_text(encoding="utf-8")

        # Generated project metadata is ready for the documented CLI workflow.
        assert f'name = "{project_name}"' in pyproject
        assert "[tool.longlink]" in pyproject
        assert 'environments = "src.envs:Env"' in pyproject
        assert not (target / "uv.lock").exists()
        assert "*.db\n" in (target / ".gitignore").read_text(encoding="utf-8")
        branch = subprocess.run(["git", "symbolic-ref", "--short", "HEAD"], cwd=target, capture_output=True, text=True, check=True)
        assert branch.stdout.strip() == "main"


@pytest.mark.parametrize("folder", [".", "sample-solution", "nested/sample-solution"])
def test_init_preserves_existing_repository(tmp_path: Path, folder: str) -> None:
    """Reuse an existing repository without changing its branch or creating a nested repository."""

    # Arrange
    subprocess.run(["git", "init", "--initial-branch=existing"], cwd=tmp_path, capture_output=True, check=True)
    target = tmp_path / folder

    # Act
    main(["init", "--folder", str(target), "--ci", "github"])

    # Assert
    repository = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=target, capture_output=True, text=True, check=True)
    branch = subprocess.run(["git", "symbolic-ref", "--short", "HEAD"], cwd=target, capture_output=True, text=True, check=True)
    assert Path(repository.stdout.strip()) == tmp_path
    assert branch.stdout.strip() == "existing"
    if folder != ".":
        assert not (target / ".git").exists()


def test_init_preserves_existing_worktree(tmp_path: Path) -> None:
    """Reuse a worktree without replacing its Git metadata or branch."""

    # Arrange
    repository = tmp_path / "repository"
    repository.mkdir()
    subprocess.run(["git", "init", "--initial-branch=main"], cwd=repository, capture_output=True, check=True)
    subprocess.run(
        ["git", "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "-m", "initial"],
        cwd=repository,
        capture_output=True,
        check=True,
    )
    target = tmp_path / "worktree"
    subprocess.run(["git", "worktree", "add", "-b", "existing", str(target)], cwd=repository, capture_output=True, check=True)
    metadata = (target / ".git").read_text()

    # Act
    main(["init", "--folder", str(target), "--ci", "github"])

    # Assert
    assert (target / ".git").read_text() == metadata
    branch = subprocess.run(["git", "symbolic-ref", "--short", "HEAD"], cwd=target, capture_output=True, text=True, check=True)
    assert branch.stdout.strip() == "existing"


def test_init_reports_missing_git(monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    """Render a missing Git executable as a CLI error."""

    # Arrange
    monkeypatch.setenv("PATH", str(tmp_path))
    target = tmp_path / "nested" / "sample-solution"

    # Act
    with pytest.raises(SystemExit) as failure:
        main(["init", "--folder", str(target), "--ci", "github"])

    # Assert
    assert failure.value.code == 1
    assert "Unable to initialize Git repository" in capsys.readouterr().err
    assert not target.parent.exists()


@pytest.mark.parametrize("folder", [".", "nested/sample-solution"])
def test_init_preserves_invalid_git_metadata(tmp_path: Path, capsys: pytest.CaptureFixture[str], folder: str) -> None:
    """Report discovery errors without initializing over an invalid repository."""

    # Arrange
    metadata = tmp_path / ".git"
    metadata.write_text("invalid repository metadata")
    target = tmp_path / folder

    # Act
    with pytest.raises(SystemExit) as failure:
        main(["init", "--folder", str(target), "--ci", "github"])

    # Assert
    assert failure.value.code == 1
    assert "Unable to initialize Git repository" in capsys.readouterr().err
    assert metadata.read_text() == "invalid repository metadata"
    assert set(tmp_path.iterdir()) == {metadata}


def test_init_reports_git_initialization_failure(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    """Render a failed Git initialization as a CLI error."""

    # Arrange
    initialize = Mock(
        side_effect=[
            subprocess.CompletedProcess(
                ["git", "rev-parse", "--git-dir"], 128, stderr="fatal: not a git repository (or any of the parent directories): .git"
            ),
            subprocess.CalledProcessError(128, ["git", "init"], stderr="permission denied"),
        ]
    )
    monkeypatch.setattr(subprocess, "run", initialize)
    target = tmp_path / "nested" / "sample-solution"

    # Act
    with pytest.raises(SystemExit) as failure:
        main(["init", "--folder", str(target), "--ci", "github"])

    # Assert
    assert failure.value.code == 1
    error = capsys.readouterr().err
    assert "Unable to initialize Git repository" in error
    assert "permission denied" in error
    assert not tuple(target.iterdir())
    assert initialize.call_args_list[0].kwargs["cwd"] == tmp_path
    assert initialize.call_args_list[1].kwargs["cwd"] == target


@pytest.mark.parametrize("conflict", ["pyproject.toml", ".github/workflows/tests.yml", "src"])
def test_init_refuses_conflicting_folder(tmp_path: Path, capsys: pytest.CaptureFixture[str], conflict: str) -> None:
    """Avoid replacing existing scaffold files in a project folder."""

    # Arrange
    target = tmp_path / "sample-solution"
    target.mkdir()
    destination = target / conflict
    destination.parent.mkdir(parents=True, exist_ok=True)
    if conflict == "src":
        destination.symlink_to(tmp_path / "outside", target_is_directory=True)
    else:
        destination.write_text("existing project", encoding="utf-8")

    # Act
    with pytest.raises(SystemExit) as failure:
        main(["init", "--folder", str(target), "--ci", "github"])

    # Assert
    assert failure.value.code == 1
    assert "Target already exists" in capsys.readouterr().err
    if conflict == "src":
        assert destination.is_symlink()
        assert not (tmp_path / "outside").exists()
    else:
        assert destination.read_text(encoding="utf-8") == "existing project"
    assert not (target / "main.py").exists()
    assert not (target / ".git").exists()


def test_init_ignores_excluded_scaffold_collisions(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Skip excluded scaffold directories without traversing or replacing their destinations."""

    # Arrange
    root = tmp_path / "sdk"
    scaffold = root / ".static" / "new"
    shutil.copytree(
        init.ROOT / ".static" / "new", scaffold, ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache", ".ruff_cache", ".venv")
    )
    target = tmp_path / "sample-solution"
    target.mkdir()
    for name in ("__pycache__", ".pytest_cache", ".ruff_cache", ".venv"):
        source = scaffold / "src" / name
        source.mkdir(parents=True)
        (source / "cached").write_text("scaffold cache")
        destination = target / "src" / name
        destination.mkdir(parents=True)
        (destination / "cached").write_text("existing cache")
    monkeypatch.setattr(init, "ROOT", root)
    monkeypatch.setenv("PATH", "")

    # Act
    main(["init", "--folder", str(target)])

    # Assert
    assert (target / "main.py").is_file()
    assert not (target / ".git").exists()
    for name in ("__pycache__", ".pytest_cache", ".ruff_cache", ".venv"):
        assert (target / "src" / name / "cached").read_text() == "existing cache"


@pytest.mark.parametrize("project_name", ["../invalid", "sample-", "sample.", "sample_", "-sample", ".", "_"])
def test_init_rejects_invalid_project_name_without_creating_folder(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], project_name: str
) -> None:
    """Reject invalid project metadata before creating the requested scaffold."""

    # Arrange
    target = tmp_path / "sample-solution"

    # Act
    with pytest.raises(SystemExit) as failure:
        main(["init", "--folder", str(target), f"--name={project_name}"])

    # Assert
    assert failure.value.code == 1
    assert f"Invalid project name: {project_name}" in capsys.readouterr().err
    assert not target.exists()


def test_initialized_project_applies_bundled_migration_through_deployment_entrypoint(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Apply a generated project's initial migration through the deployment entrypoint."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", "development")

    with chdir(tmp_path):
        main(["init", "--folder", "sample-solution"])
        target = Path.cwd() / "sample-solution"

        # Default initialization uses the folder name and omits provider-specific automation.
        assert 'name = "sample-solution"' in (target / "pyproject.toml").read_text(encoding="utf-8")
        assert not (target / ".github").exists()
        assert not (target / ".git").exists()

        # Act
        with chdir(target):
            runpy.run_path(str(database_migrations.CURRENT_FILE), run_name="__main__")

        # Assert
        with closing(sqlite3.connect(target / "dev.db")) as connection:
            tables = connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('alembic_version', 'project', 'task', 'users') ORDER BY name"
            ).fetchall()
            revision = connection.execute("SELECT version_num FROM alembic_version").fetchone()
        assert tables == [("alembic_version",), ("task",), ("users",)]
        assert revision == ("20260713_0001",)
