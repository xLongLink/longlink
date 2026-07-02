import pytest
from pytest import MonkeyPatch
from pathlib import Path
from longlink.app import LongLink
from fastapi.testclient import TestClient


def test_xml_pages_are_registered_from_default_pages_directory(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Expose XML pages from the default SDK pages directory."""

    page_path = tmp_path / "src" / "pages" / "dashboard.xml"
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text(
        '<longlink name="Dashboard" icon="layout-dashboard"><P i18n="Dashboard" /></longlink>',
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)

    client = TestClient(LongLink())

    response = client.get("/pages/dashboard.xml")
    metadata_response = client.get("/metadata.json")

    assert response.status_code == 200
    assert response.text == (
        '<longlink name="Dashboard" icon="layout-dashboard"><P i18n="Dashboard" /></longlink>'
    )
    assert any(
        page["tab"] == "dashboard"
        and page["path"] == "pages/dashboard.xml"
        and page["name"] == "Dashboard"
        and page["icon"] == "layout-dashboard"
        for page in metadata_response.json()["pages"]
    )
    assert all("content" not in page for page in metadata_response.json()["pages"])


def test_nested_xml_pages_are_registered_from_default_pages_directory(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Expose nested XML pages from the default SDK pages directory."""

    page_path = tmp_path / "src" / "pages" / "admin" / "users.xml"
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text("<longlink><P i18n=\"Users\" /></longlink>", encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    client = TestClient(LongLink())

    response = client.get("/pages/admin/users.xml")
    metadata_response = client.get("/metadata.json")

    assert response.status_code == 200
    assert response.text == "<longlink><P i18n=\"Users\" /></longlink>"
    assert {page["path"] for page in metadata_response.json()["pages"]} >= {"pages/admin/users.xml"}
    assert {page["tab"] for page in metadata_response.json()["pages"]} >= {"admin/users"}
    assert all("content" not in page for page in metadata_response.json()["pages"])


def test_invalid_xml_page_fails_during_registration(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Validate SDK XML pages against the bundled schema before registering routes."""

    page_path = tmp_path / "src" / "pages" / "broken.xml"
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text("<unknown />", encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    with pytest.raises(ValueError, match="XML is invalid"):
        LongLink()
