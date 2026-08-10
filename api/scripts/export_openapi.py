"""Export the versioned Platform OpenAPI document without requiring local secrets."""

import os
import sys
import json
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

os.environ.setdefault("SESSION_KEY", "openapi-session-key-that-is-long-enough")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./openapi.db")
os.environ.setdefault("ADMIN_NAME", "OpenAPI Administrator")
os.environ.setdefault("ADMIN_EMAIL", "openapi@example.com")
os.environ.setdefault("ADMIN_PASSWORD", "openapi-password")
os.environ.setdefault("ENCRYPTION_KEY", "openapi-encryption-key-that-is-long-enough")

from main import app

output_path = API_ROOT / "openapi" / "v1.json"
output_path.parent.mkdir(exist_ok=True)
output_path.write_text(json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n", encoding="utf-8")
