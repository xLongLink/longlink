import pytest


@pytest.mark.unit
def test_get_organization_returns_current_settings(client, monkeypatch):
    """Organization get route returns organization settings model payload."""
    from src.routes import organization as organization_routes

    async def fake_get_organization():
        """Return organization settings payload from settings service."""
        return {
            "ORG_NAME": "LongLink",
            "ORG_NAME_LEGAL": "LongLink Inc",
            "ORG_TAX_ID": "123",
            "ORG_PHONE": "",
            "ORG_MAIL_CONTACT": "",
            "ORG_MAIL_SUPPORT": "",
            "ORG_WEBSITE": "",
            "ORG_ADDRESS": "",
        }

    monkeypatch.setattr(organization_routes.db.settings, "get_organization", fake_get_organization)

    response = client.get("/organization")

    assert response.status_code == 200
    assert response.json()["ORG_NAME"] == "LongLink"


@pytest.mark.unit
def test_update_organization_persists_and_notifies_apps(client, monkeypatch):
    """Organization put route saves settings then triggers app sync."""
    from src.routes import organization as organization_routes

    state = {"saved": None, "notified": False}

    async def fake_save_organization(payload):
        """Capture payload written to organization settings service."""
        state["saved"] = payload.model_dump()

    async def fake_org():
        """Capture organization notification call to apps."""
        state["notified"] = True

    monkeypatch.setattr(organization_routes.db.settings, "save_organization", fake_save_organization)
    monkeypatch.setattr(organization_routes.src.utils.apps, "org", fake_org)

    payload = {
        "ORG_NAME": "LongLink",
        "ORG_NAME_LEGAL": "LongLink LLC",
        "ORG_TAX_ID": "ABC",
        "ORG_PHONE": "123",
        "ORG_MAIL_CONTACT": "contact@longlink.dev",
        "ORG_MAIL_SUPPORT": "support@longlink.dev",
        "ORG_WEBSITE": "https://longlink.dev",
        "ORG_ADDRESS": "Earth",
    }
    response = client.put("/organization", json=payload)

    assert response.status_code == 200
    assert response.json() == payload
    assert state["saved"] == payload
    assert state["notified"] is True
