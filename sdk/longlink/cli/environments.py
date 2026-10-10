import sys
import json
import importlib
from pathlib import Path
from pydantic import BaseModel


def read_model(root: Path, environment_import: str) -> list[dict[str, object]]:
    """Inspect a configured environment model within this disposable process."""

    # Resolve Solution imports ahead of installed modules without changing the parent process.
    module_name, _, class_name = environment_import.strip().partition(":")
    sys.path.insert(0, str(root))
    try:
        module = importlib.import_module(module_name)
    except Exception as error:
        raise ValueError(f"Unable to import environment model {environment_import}: {error}") from error

    # Require a Pydantic model before reading its validated field metadata.
    environment_model = getattr(module, class_name, None)
    if environment_model is None:
        envs_path = root.joinpath(*module_name.split(".")).with_suffix(".py")
        raise ValueError(f"Environment model must define {class_name}: {envs_path}")
    if not isinstance(environment_model, type) or not issubclass(environment_model, BaseModel):
        raise ValueError(f"Environment model must be a Pydantic model: {environment_import}")

    # Emit only runtime requirements, string aliases, and authored descriptions, never defaults.
    environments: list[dict[str, object]] = []
    for field_name, field in environment_model.model_fields.items():
        env_entry: dict[str, object] = {
            "name": field.validation_alias if isinstance(field.validation_alias, str) and field.validation_alias else field_name,
            "required": field.is_required(),
        }
        if field.description is not None:
            env_entry["description"] = field.description
        environments.append(env_entry)
    return environments


if __name__ == "__main__":
    # Return metadata or an expected validation error through a file, leaving output streams intact.
    root = Path(sys.argv[1])
    result_path = Path(sys.argv[3])
    try:
        result: list[dict[str, object]] | str = read_model(root, sys.argv[2])
    except ValueError as error:
        result = str(error)
    result_path.write_text(json.dumps(result), encoding="utf-8")
