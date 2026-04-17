import re
import json
from click.testing import CliRunner
from longlink.cli.build import build_app, build_command


def test_build_app_creates_dockerfile_and_manifest(tmp_path, monkeypatch):
    """Ensure build_app writes Dockerfile and manifest with expected keys."""
    # Force metadata lookup to happen inside temp project directory.
    monkeypatch.chdir(tmp_path)

    dockerfile_path, manifest_path, version = build_app(base_path=tmp_path)

    assert dockerfile_path.exists()
    assert manifest_path.exists()
    assert dockerfile_path.name == 'Dockerfile'
    assert re.match(r'^\d{8}_\d{6}$', version)

    manifest = json.loads(manifest_path.read_text())
    assert manifest['version'] == version
    assert manifest['dockerfile'] == 'Dockerfile'
    assert 'generated_at' in manifest
    assert manifest['metadata']['name']


def test_build_command_prints_created_artifacts(monkeypatch):
    """Ensure build command exits cleanly and prints artifact paths."""
    runner = CliRunner()

    with runner.isolated_filesystem():
        result = runner.invoke(build_command)

    assert result.exit_code == 0
    assert 'Build artifacts created for version' in result.output
    assert '- Dockerfile:' in result.output
    assert '- Manifest:' in result.output
