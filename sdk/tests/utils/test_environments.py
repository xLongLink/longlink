import pytest
from pathlib import Path
from pydantic import Field
from longlink.utils.environments import Environments


class EnvironmentSettings(Environments):
    """Declare settings used to verify environment source precedence."""

    api_key: str = Field(default="", validation_alias="API_KEY")


@pytest.mark.parametrize(
    ("dotenv_value", "process_value", "expected"),
    [
        pytest.param("file", "process", "process", id="process-over-dotenv"),
        pytest.param("file", None, "file", id="dotenv-over-sample"),
        pytest.param(None, None, "sample", id="sample-only"),
    ],
)
def test_environments_prioritizes_configured_sources(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    dotenv_value: str | None,
    process_value: str | None,
    expected: str,
) -> None:
    """Load the declared setting from the highest-priority configured source."""

    # Arrange
    tmp_path.joinpath(".env.sample").write_text("API_KEY=sample\n", encoding="utf-8")
    if dotenv_value is not None:
        tmp_path.joinpath(".env").write_text(f"API_KEY={dotenv_value}\n", encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    if process_value is None:
        monkeypatch.delenv("API_KEY", raising=False)
    else:
        monkeypatch.setenv("API_KEY", process_value)

    # Act
    environments = EnvironmentSettings()

    # Assert
    assert environments.api_key == expected
