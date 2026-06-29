import json
from pathlib import Path

from pytest import MonkeyPatch
from fastapi.testclient import TestClient

from longlink.app import LongLink


def test_translation_catalog_is_served(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Expose the bundled translation catalog from the SDK application."""

    catalog_path = tmp_path / "src" / "i18n" / "en.json"
    catalog_path.parent.mkdir(parents=True, exist_ok=True)
    catalog_path.write_text(
        json.dumps(
            {
                "examples": {
                    "text": {
                        "title": "Localized text elements",
                    }
                }
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)

    client = TestClient(LongLink())

    response = client.get("/i18n/en.json")

    assert response.status_code == 200
    assert response.json()["examples"]["text"]["title"] == "Localized text elements"
