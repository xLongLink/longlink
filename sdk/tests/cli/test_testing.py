import sys
import pytest
import subprocess

from click.testing import CliRunner

from longlink.cli.testing import test_command as longlink_test_command


def test_test_command_runs_pytest_with_current_interpreter(monkeypatch: pytest.MonkeyPatch) -> None:
    """Forward test arguments to pytest and exit with pytest's return code."""

    calls: list[list[str]] = []

    def run(command: list[str], *, check: bool) -> subprocess.CompletedProcess[str]:
        """Record the subprocess command and return a failing pytest result."""

        calls.append(command)
        assert not check
        return subprocess.CompletedProcess(command, 3)

    monkeypatch.setattr(subprocess, "run", run)

    result = CliRunner().invoke(longlink_test_command, ["tests/unit", "-q"])

    assert result.exit_code == 3
    assert calls == [[sys.executable, "-m", "pytest", "tests/unit", "-q"]]
