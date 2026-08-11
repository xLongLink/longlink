"""Export the versioned Platform OpenAPI document without requiring local secrets."""

import json
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]

from main import app

(API_ROOT / "openapi" / "v1.json").write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
