from shutil import copytree as real_copytree
from pathlib import Path
from click.testing import CliRunner
from longlink.cli.init import setup, init_command
from longlink.constants import ROOT


def test_setup_creates_full_scaffold(monkeypatch, tmp_path):
    """Ensure setup creates the minimal showcase scaffold from scratch."""
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
    assert copied['src'] == ROOT / '.static' / 'new'
    assert copied['dst'] == target
    assert copied['dirs_exist_ok'] is True
    assert (target / 'pyproject.toml').exists()
    assert (target / 'README.md').exists()
    assert (target / 'AGENTS.md').exists()
    assert (target / '.env.sample').exists()
    assert (target / 'main.py').exists()
    assert (target / 'src/routes/__init__.py').exists()
    assert (target / 'src/routes/sample.py').exists()
    assert (target / 'src/routes/pages.py').exists()
    assert (target / 'src/services').exists()
    assert (target / 'src/services/__init__.py').exists()
    assert (target / 'src/services/sample.py').exists()
    assert (target / 'src/models/__init__.py').exists()
    assert (target / 'src/models/project.py').exists()
    assert (target / 'src/types/__init__.py').exists()
    assert (target / 'src/types/user.py').exists()
    assert (target / 'src/envs.py').exists()
    assert (target / 'src/pages').exists()
    assert (target / 'src/pages/dashboard.xml').exists()
    assert (target / 'tests/conftest.py').exists()
    assert (target / 'tests/routes').exists()
    assert (target / 'tests/routes/test_sample_routes.py').exists()
    assert not (target / 'uv.lock').exists()

    pyproject = (target / 'pyproject.toml').read_text()
    assert 'name = "longlink-app"' in pyproject
    assert 'dependencies = [\n  "longlink",\n]' in pyproject
    assert '[dependency-groups]' in pyproject
    assert 'dev = [' in pyproject
    assert (target / 'README.md').read_text().startswith('# Minimal LongLink showcase app')

    main_py = (target / 'main.py').read_text()
    assert 'for router in routers:' in main_py

    pages_py = (target / 'src/routes/pages.py').read_text()
    assert '@router.page("/dashboard.xml")' in pages_py
    assert 'read_text(encoding="utf-8")' in pages_py

    service_py = (target / 'src/services/sample.py').read_text()
    assert 'class SampleService:' in service_py
    assert 'async def create_project(self, session_maker) -> UserModel:' in service_py

    models_init = (target / 'src/models/__init__.py').read_text()
    assert 'from src.models.project import Project' in models_init

    types_init = (target / 'src/types/__init__.py').read_text()
    assert 'from src.types.user import UserModel' in types_init


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
