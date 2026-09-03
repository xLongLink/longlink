import pytest
from pathlib import Path
from pydantic import Field
from longlink.utils.environments import Environments


class EnvironmentSettings(Environments):
    """Declare settings used to verify environment source precedence."""

    api_key: str = Field(default="", validation_alias="API_KEY")


def test_environments_prioritizes_process_variables_over_dotenv_files(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
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


def test_environments_prioritizes_dotenv_over_sample_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Load dotenv values from the Solution file instead of its sample."""

    # Arrange
    tmp_path.joinpath(".env.sample").write_text("API_KEY=sample\n", encoding="utf-8")
    tmp_path.joinpath(".env").write_text("API_KEY=file\n", encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("API_KEY", raising=False)

    # Act
    environments = EnvironmentSettings()

    # Assert
    assert environments.api_key == "file"


def test_environments_loads_sample_file_without_solution_dotenv(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Load declared defaults from the sample dotenv file."""

    # Arrange
    tmp_path.joinpath(".env.sample").write_text("API_KEY=sample\n", encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("API_KEY", raising=False)

    # Act
    environments = EnvironmentSettings()

    # Assert
    assert environments.api_key == "sample"
