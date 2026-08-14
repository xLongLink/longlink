"""Export the versioned Platform OpenAPI document without requiring local secrets."""

import json
from main import app
from pathlib import Path

(Path(__file__).resolve().parents[1] / "openapi" / "v1.json").write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
