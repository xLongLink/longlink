import ast
import json
import re
from pathlib import Path

from click.testing import CliRunner

from longlink.cli.build import build_app, build_command


def test_build_app_creates_dockerfile_with_labels(tmp_path, monkeypatch):
    """Ensure build_app writes Dockerfile with the expected metadata labels."""

    monkeypatch.chdir(tmp_path)
    (tmp_path / 'pyproject.toml').write_text('[project]\nname = "demo-app"\nversion = "0.1.0"\n')
    (tmp_path / 'src').mkdir()
    (tmp_path / 'src' / 'envs.py').write_text(
        'from pydantic import Field\n'
        'from pydantic_settings import BaseSettings, SettingsConfigDict\n\n'
        'class Env(BaseSettings):\n'
        '    model_config = SettingsConfigDict(env_prefix="LONGLINK_")\n'
        '    API_KEY: str = Field(description="API key used by Longlink", secret=True)\n'
        '    PORT: int = Field(default=8080, description="HTTP listen port")\n'
    )

    dockerfile_path, version, _, _ = build_app(base_path=tmp_path)

    assert dockerfile_path.exists()
    assert dockerfile_path.name == 'Dockerfile'
    assert re.match(r'^\d{8}_\d{6}$', version)

    dockerfile = dockerfile_path.read_text()
    labels = {}

    for line in dockerfile.splitlines():
        if not line.startswith('LABEL '):
            continue
        key, raw_value = line[len('LABEL '):].split('=', 1)
        labels[key] = ast.literal_eval(raw_value)

    assert labels['longlink.name'] == 'demo-app'
    assert json.loads(labels['longlink.required']) == {
        'name': 'API_KEY',
        'type': 'str',
        'description': 'API key used by Longlink',
    }
    assert json.loads(labels['longlink.optional']) == {
        'name': 'PORT',
        'type': 'int',
        'description': 'HTTP listen port',
    }


def test_build_command_prints_created_artifacts():
    """Ensure build command exits cleanly and prints artifact paths."""

    runner = CliRunner()

    with runner.isolated_filesystem():
        Path('pyproject.toml').write_text('[project]\nname = "demo-app"\nversion = "0.1.0"\n')
        result = runner.invoke(build_command)

        assert result.exit_code == 0
        assert 'Build artifacts created for version' in result.output
        assert '- Dockerfile:' in result.output
        assert Path('Dockerfile').exists()
        assert not Path('manifest.json').exists()
        assert 'longlink.name=' in Path('Dockerfile').read_text()
