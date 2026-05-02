from pathlib import Path
from click.testing import CliRunner
from longlink.cli.init import setup, init_command


def test_setup_creates_folder_and_copies_sample(monkeypatch, tmp_path):
    """Ensure setup creates target folder and copies sample files into it."""
    copied = {}

    def fake_copytree(src: Path, dst: Path, dirs_exist_ok: bool):
        """Capture copytree call parameters for assertions."""
        copied['src'] = src
        copied['dst'] = dst
        copied['dirs_exist_ok'] = dirs_exist_ok

    monkeypatch.setattr('shutil.copytree', fake_copytree)

    target = tmp_path / 'my-app'
    setup(target)

    assert target.exists()
    assert copied['dst'] == target
    assert copied['dirs_exist_ok'] is True


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
