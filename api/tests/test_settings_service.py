import os
import pytest

os.environ["DEV"] = "true"
os.environ["ENV_DATABASE_URL"] = "sqlite+aiosqlite:///./dev.db"
os.environ["ENV_OIDC_REDIRECT_URI"] = "http://localhost:8000/auth/oidc"
os.environ["ENV_OIDC_SCOPES"] = "openid profile email"
os.environ["ENV_PROVISION_DATABASE_HOST"] = "localhost"
os.environ["ENV_PROVISION_DATABASE_PORT"] = "5432"
os.environ["ENV_PROVISION_DATABASE_USERNAME"] = "admin"
os.environ["ENV_PROVISION_DATABASE_PASSWORD"] = "admin"
os.environ["ENV_PROVISION_DATABASE_MAINTENANCE_DATABASE"] = "postgres"
os.environ["ENV_PROVISION_STORAGE_ENDPOINT_URL"] = "http://localhost:9000"
os.environ["ENV_PROVISION_STORAGE_ACCESS_KEY_ID"] = "admin"
os.environ["ENV_PROVISION_STORAGE_SECRET_ACCESS_KEY"] = "admin"
os.environ["ENV_PROVISION_COMPUTE_KUBE_API_SERVER"] = "https://localhost:8001"
os.environ["ENV_PROVISION_COMPUTE_KUBE_CONFIG_PATH"] = "/app/kubeconfig"
os.environ["ENV_PROVISION_COMPUTE_NAMESPACE"] = "default"
os.environ["ENV_PROVISION_COMPUTE_VERIFY_SSL"] = "false"
os.environ["URL"] = "http://localhost:5173"
os.environ["KEY"] = "test-secret"


@pytest.mark.unit
class TestOrganizationSettings:
    def test_model_fields(self):
        from src.config import OrganizationSettings

        fields = OrganizationSettings.model_fields.keys()
        assert "ORG_NAME" in fields
        assert "ORG_NAME_LEGAL" in fields
        assert "ORG_TAX_ID" in fields
        assert "ORG_PHONE" in fields
        assert "ORG_MAIL_CONTACT" in fields
        assert "ORG_MAIL_SUPPORT" in fields
        assert "ORG_WEBSITE" in fields
        assert "ORG_ADDRESS" in fields

    def test_defaults(self):
        from src.config import OrganizationSettings

        org = OrganizationSettings()
        assert org.ORG_NAME == ""
        assert org.ORG_NAME_LEGAL == ""
        assert org.ORG_TAX_ID == ""

    def test_with_values(self):
        from src.config import OrganizationSettings

        org = OrganizationSettings(
            ORG_NAME="Acme",
            ORG_NAME_LEGAL="Acme Inc",
            ORG_TAX_ID="123456789",
        )
        assert org.ORG_NAME == "Acme"
        assert org.ORG_NAME_LEGAL == "Acme Inc"
        assert org.ORG_TAX_ID == "123456789"
