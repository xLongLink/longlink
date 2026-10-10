"""Check generated manifest layers with real Docker, without pulling runtime images.

Run from sdk/: LONGLINK_DOCKER_TESTS=1 uv run pytest -m integration tests/cli/test_docker.py
"""

import os
import json
import uuid
import pytest
import shutil
import tarfile
import subprocess
from pathlib import Path
from longlink.cli import build


def run_docker(docker: str, *arguments: str, check: bool = True, timeout: int = 60) -> subprocess.CompletedProcess[str]:
    """Run bounded Docker commands and report actionable failures when opted in."""

    # Include Docker diagnostics in test failures rather than silently skipping prerequisites.
    try:
        result = subprocess.run([docker, *arguments], capture_output=True, text=True, check=False, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as error:
        pytest.fail(f"Docker command {arguments!r} could not complete: {error}")
    if check and result.returncode:
        pytest.fail(f"Docker command {arguments!r} failed ({result.returncode}):\n{result.stdout}\n{result.stderr}")
    return result


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("LONGLINK_DOCKER_TESTS") != "1", reason="Set LONGLINK_DOCKER_TESTS=1 to use real Docker")
def test_generated_manifest_layer_preserves_literal_workspace_paths(tmp_path: Path) -> None:
    """Build raw generated COPY and WORKDIR instructions and inspect the stopped image."""

    # Require a functioning Docker installation only after explicit opt-in.
    docker = shutil.which("docker")
    if docker is None:
        pytest.fail("LONGLINK_DOCKER_TESTS=1 requires the Docker CLI and a functioning daemon")
    run_docker(docker, "info")

    # Create glob-free workspace paths containing each supported quoting hazard.
    workspace = tmp_path / "workspace"
    solution_name = "solution spaces 'single' \"double\" $HOME \\backslash"
    solution = workspace / solution_name
    shared = workspace / "shared"
    unrelated = workspace / "unrelated"
    for project in (solution, shared, unrelated):
        project.mkdir(parents=True)
    workspace.joinpath("pyproject.toml").write_text(
        f"[tool.uv.workspace]\nmembers = {json.dumps([solution_name, 'shared', 'unrelated'])}\n", encoding="utf-8"
    )
    workspace.joinpath("uv.lock").write_text("authoritative workspace lock\n", encoding="utf-8")
    solution.joinpath("uv.lock").write_text("non-authoritative Solution lock\n", encoding="utf-8")
    solution.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\ndependencies = ["shared"]\n'
        '[tool.longlink]\nenvironments = "envs:Env"\n'
        "[tool.uv.sources]\nshared = { workspace = true }\n",
        encoding="utf-8",
    )
    solution.joinpath("envs.py").write_text("from pydantic import BaseModel\n\nclass Env(BaseModel):\n    pass\n", encoding="utf-8")
    for project in (shared, unrelated):
        project.joinpath("pyproject.toml").write_text(f'[project]\nname = "{project.name}"\nversion = "0.1.0"\n', encoding="utf-8")
    shared.joinpath("source.py").write_text("VALUE = 1\n", encoding="utf-8")
    unrelated.joinpath("private.txt").write_text("private unrelated source\n", encoding="utf-8")

    # Generate the actual context and retain manifest instructions verbatim, not reconstructed arguments.
    context = tmp_path / "context"
    metadata = build.read_pyproject(solution)
    _, _, description = build.read_project_metadata(metadata)
    build.build_solution(solution, context, pyproject_data=metadata, project_description=description)
    assert not context.joinpath("unrelated", "private.txt").exists()
    assert context.joinpath("shared", "source.py").is_file()
    generated_lines = context.joinpath("Dockerfile").read_text(encoding="utf-8").splitlines()
    manifest_instructions: list[str] = []
    for line in generated_lines:
        if line.startswith(("COPY [", "WORKDIR ")):
            manifest_instructions.append(line)
        if line.startswith("WORKDIR "):
            break
    assert sum(line.startswith("COPY [") for line in manifest_instructions) == 4
    assert manifest_instructions[-1].startswith("WORKDIR ")
    context.joinpath("Dockerfile").write_text("FROM scratch\n" + "\n".join(manifest_instructions) + "\n", encoding="utf-8")

    # Give every resource a unique known name so even failed build/create attempts can be cleaned up.
    resource_id = uuid.uuid4().hex
    image_tag = f"longlink-docker-test:{resource_id}"
    container_name = f"longlink-docker-test-{resource_id}"
    archive_path = tmp_path / "image.tar"
    try:
        run_docker(docker, "build", "--network=none", "--tag", image_tag, str(context), timeout=120)
        inspection = run_docker(docker, "image", "inspect", "--format", "{{json .Config.WorkingDir}}", image_tag)
        assert json.loads(inspection.stdout) == f"/workspace/{solution_name}"

        # Export a never-started container: scratch has no shell or executable to run.
        run_docker(docker, "create", "--name", container_name, image_tag, "/never-run")
        run_docker(docker, "export", "--output", str(archive_path), container_name)
        with tarfile.open(archive_path) as archive:
            exported_files: dict[str, bytes] = {}
            for member in archive.getmembers():
                if not member.isfile() or not member.name.startswith("workspace/"):
                    continue
                contents = archive.extractfile(member)
                assert contents is not None
                with contents:
                    exported_files[member.name] = contents.read()

        # Compare actual filesystem paths and bytes, without repeating production quoting logic.
        assert exported_files == {
            "workspace/pyproject.toml": workspace.joinpath("pyproject.toml").read_bytes(),
            "workspace/uv.lock": b"authoritative workspace lock\n",
            f"workspace/{solution_name}/pyproject.toml": solution.joinpath("pyproject.toml").read_bytes(),
            "workspace/shared/pyproject.toml": shared.joinpath("pyproject.toml").read_bytes(),
            "workspace/unrelated/pyproject.toml": unrelated.joinpath("pyproject.toml").read_bytes(),
        }
    finally:
        # Remove only this test's resources, including names allocated by unsuccessful Docker commands.
        try:
            run_docker(docker, "container", "rm", "--force", container_name, check=False)
        finally:
            run_docker(docker, "image", "rm", "--force", image_tag, check=False)
