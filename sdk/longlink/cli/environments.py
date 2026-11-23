import sys
import json
import runpy
import importlib
from pathlib import Path
from pydantic import BaseModel
from pydantic_settings import BaseSettings


def read_model(root: Path, environment_import: str) -> list[dict[str, object]]:
    """Inspect a configured environment model within this disposable process."""

    # Resolve Solution imports ahead of installed modules without changing the parent process.
    module_name, _, class_name = environment_import.strip().partition(":")
    sys.path.insert(0, str(root))
    try:
        module = importlib.import_module(module_name)
    except Exception as error:
        # Missing dependencies are import failures, not missing configured modules.
        if (
            isinstance(error, ModuleNotFoundError)
            and error.name
            and (module_name == error.name or module_name.startswith(f"{error.name}."))
        ):
            raise ValueError(f"Environment model not found: {module_name}") from error
        raise ValueError(f"Unable to import environment model {environment_import}: {error}") from error

    # Require a Pydantic model before reading its validated field metadata.
    environment_model = getattr(module, class_name, None)
    if environment_model is None:
        raise ValueError(f"Environment model must define {class_name}: {module_name}")
    if not isinstance(environment_model, type) or not issubclass(environment_model, BaseModel):
        raise ValueError(f"Environment model must be a Pydantic model: {environment_import}")

    # Load the SDK schema without reserving the Solution's possible longlink package name.
    metadata = runpy.run_path(str(Path(__file__).parents[1] / "metadata.py"))
    environment_metadata = metadata["EnvironmentMetadata"]

    # Emit only runtime requirements, string aliases, and authored descriptions, never defaults.
    prefix = environment_model.model_config.get("env_prefix", "") if issubclass(environment_model, BaseSettings) else ""
    environments: list[dict[str, object]] = []
    for field_name, field in environment_model.model_fields.items():
        env_entry = environment_metadata(
            name=field.validation_alias if isinstance(field.validation_alias, str) and field.validation_alias else f"{prefix}{field_name}",
            required=field.is_required(),
            description=field.description,
        )
        environments.append(env_entry.model_dump(exclude_none=True))
    return environments


if __name__ == "__main__":
    # Return metadata or an expected validation error through a file, leaving output streams intact.
    root = Path(sys.argv[1])
    result_path = Path(sys.argv[3])
    try:
        result: list[dict[str, object]] | str = read_model(root, sys.argv[2])
    except ValueError as error:
        # Expected model errors share the file transport with successful metadata.
        result = str(error)
    result_path.write_text(json.dumps(result), encoding="utf-8")
