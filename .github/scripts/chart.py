import json
import pathlib
import re
import shutil
import subprocess
import tempfile


def main() -> None:
    # Select the latest stable chart from the official Helm repository.
    subprocess.run(
        [
            "helm",
            "repo",
            "add",
            "cnpg",
            "https://cloudnative-pg.github.io/charts",
            "--force-update",
        ],
        check=True,
    )
    subprocess.run(["helm", "repo", "update", "cnpg"], check=True)
    result = subprocess.run(
        ["helm", "search", "repo", "cnpg/cloudnative-pg", "--output", "json"],
        check=True,
        capture_output=True,
        text=True,
    )
    release = next(
        chart
        for chart in json.loads(result.stdout)
        if chart["name"] == "cnpg/cloudnative-pg"
    )
    version = release["version"]
    app_version = release["app_version"]
    if not all(
        re.fullmatch(r"\d+\.\d+\.\d+", value) for value in (version, app_version)
    ):
        raise ValueError("Expected stable chart and operator versions")

    # Keep the parent version and local dependency repository intact.
    chart = pathlib.Path("k8s/chart")
    metadata = (chart / "Chart.yaml").read_text()
    dependency = re.compile(
        r"(- name: cloudnative-pg\n[ \t]+version: )([0-9.]+)"
        r"(\n[ \t]+repository: file://charts/cloudnative-pg)"
    )
    current = dependency.search(metadata)
    if current is None:
        raise ValueError("Expected a local CloudNativePG dependency")
    values = (chart / "values.yaml").read_text()
    image = re.compile(
        r"\A(cloudnative-pg:\n[ \t]+image:\n[ \t]+tag: )"
        r"\d+\.\d+\.\d+@sha256:[0-9a-f]{64}(?=\n|$)"
    )
    if image.search(values) is None:
        raise ValueError("Expected an immutable CloudNativePG image override")
    if tuple(map(int, version.split("."))) <= tuple(map(int, current[2].split("."))):
        print(f"CloudNativePG chart {current[2]} is already current")
        return

    # Resolve the matching operator's multi-platform digest before changing files.
    repository = "ghcr.io/cloudnative-pg/cloudnative-pg"
    result = subprocess.run(
        [
            "docker",
            "buildx",
            "imagetools",
            "inspect",
            f"{repository}:{app_version}",
            "--format",
            "{{json .Manifest}}",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    digest = json.loads(result.stdout)["digest"]
    if not re.fullmatch(r"sha256:[0-9a-f]{64}", digest):
        raise ValueError("Expected a SHA-256 image digest")
    tag = f"{app_version}@{digest}"
    values = image.sub(lambda match: match[1] + tag, values)

    # Stage the complete upstream chart and validate the self-contained package.
    with tempfile.TemporaryDirectory() as directory:
        staging = pathlib.Path(directory)
        candidate = staging / "chart"
        shutil.copytree(chart, candidate)
        subprocess.run(
            [
                "helm",
                "pull",
                "cnpg/cloudnative-pg",
                "--version",
                version,
                "--untar",
                "--untardir",
                str(staging / "upstream"),
            ],
            check=True,
        )
        upstream = staging / "upstream/cloudnative-pg"
        upstream_metadata = (upstream / "Chart.yaml").read_text()
        for field, expected in (("version", version), ("appVersion", app_version)):
            if not re.search(
                rf"^{field}: ['\"]?{re.escape(expected)}['\"]?$",
                upstream_metadata,
                re.MULTILINE,
            ):
                raise ValueError(f"Downloaded chart has unexpected {field}")
        shutil.rmtree(candidate / "charts/cloudnative-pg")
        shutil.copytree(upstream, candidate / "charts/cloudnative-pg")
        (candidate / "Chart.yaml").write_text(
            dependency.sub(lambda match: match[1] + version + match[3], metadata)
        )
        (candidate / "values.yaml").write_text(values)
        subprocess.run(
            ["helm", "lint", str(candidate), "--values", "dev/values.yaml"], check=True
        )
        result = subprocess.run(
            [
                "helm",
                "template",
                "longlink-compute",
                str(candidate),
                "--values",
                "dev/values.yaml",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        if not re.search(
            rf"image: ['\"]?{re.escape(repository + ':' + tag)}['\"]?\s*$",
            result.stdout,
            re.MULTILINE,
        ):
            raise ValueError(
                "Rendered operator does not use the matching immutable image"
            )
        subprocess.run(
            ["helm", "package", str(candidate), "--destination", str(staging)],
            check=True,
        )

        # Apply only the validated vendor, dependency version, and image override.
        shutil.rmtree(chart / "charts/cloudnative-pg")
        shutil.copytree(upstream, chart / "charts/cloudnative-pg")
        for filename in ("Chart.yaml", "values.yaml"):
            shutil.copyfile(candidate / filename, chart / filename)
        print(f"Updated CloudNativePG chart to {version}, operator to {tag}")


if __name__ == "__main__":
    main()
