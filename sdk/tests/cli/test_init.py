from shutil import copytree as real_copytree
from pathlib import Path
from click.testing import CliRunner
from longlink.cli.init import setup, init_command
from longlink.constants import ROOT


def test_setup_creates_full_scaffold(monkeypatch, tmp_path):
    """Ensure setup creates a full scaffold from scratch."""
    copied = {}

    def fake_copytree(src: Path, dst: Path, dirs_exist_ok: bool):
        """Capture the template path and copy it for verification."""

        copied["src"] = src
        copied["dst"] = dst
        copied["dirs_exist_ok"] = dirs_exist_ok
        return real_copytree(src, dst, dirs_exist_ok=dirs_exist_ok)

    monkeypatch.setattr('longlink.cli.init.copytree', fake_copytree)

    target = tmp_path / 'my-app'
    setup(target)

    assert target.exists()
    assert copied['src'] == ROOT / '.static' / 'project'
    assert copied['dst'] == target
    assert copied['dirs_exist_ok'] is True
    assert (target / 'pyproject.toml').exists()
    assert (target / 'README.md').exists()
    assert (target / 'Dockerfile').exists()
    assert (target / 'AGENTS.md').exists()
    assert (target / '.env.sample').exists()
    assert (target / 'main.py').exists()
    assert (target / 'src/api/__init__.py').exists()
    assert (target / 'src/envs.py').exists()
    assert not (target / 'src/pages').exists()
    assert not (target / 'tests').exists()

    pyproject = (target / 'pyproject.toml').read_text()
    assert 'name = "longlink-app"' in pyproject
    assert 'packages = ["src"]' in pyproject
    assert (target / 'README.md').read_text().startswith('# LongLink app')


def test_init_command_calls_setup(monkeypatch):
    """Ensure init CLI command delegates project creation to setup."""
    runner = CliRunner()
    called = {}

    def fake_setup(folder_path: Path):
        """Record folder value passed from CLI for assertions."""
        called['folder'] = folder_path

    monkeypatch.setattr('longlink.cli.init.setup', fake_setup)

    result = runner.invoke(init_command, ['--folder', 'demo-app'])

    assert result.exit_code == 0
    assert called['folder'] == Path('demo-app')
