from pydantic import Field
from longlink.utils.environments import Environments


class EnvironmentSettings(Environments):
    """Declare settings used to verify environment source precedence."""

    api_key: str = Field(default="", validation_alias="API_KEY")


def test_environments_prioritizes_process_variables_over_dotenv_files(monkeypatch, tmp_path) -> None:
    """Load the declared setting from the highest-priority configured source."""

    # Arrange
    tmp_path.joinpath(".env.sample").write_text("API_KEY=sample\n", encoding="utf-8")
    tmp_path.joinpath(".env").write_text("API_KEY=file\n", encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("API_KEY", "process")

    # Act
    environments = EnvironmentSettings()

    # Assert
    assert environments.api_key == "process"
