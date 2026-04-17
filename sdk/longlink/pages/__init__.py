from fastapi import APIRouter
from pathlib import Path
from longlink.constants import PATH

router = APIRouter()


def xml_page(path: str, name: str | None = None, icon: str | None = None, schema_path: Path | None = None) -> None:
    """Register XML page route."""
    pass


def issues_page(path: str = "/issues", name: str | None = None, icon: str | None = None) -> None:
    """Register predefined issues XML page route."""
    xml_page(path, name=name, icon=icon, schema_path=PATH / "pages" / "issues.xml")


def sample_page(path: str = "/sample-xml", name: str | None = None, icon: str | None = None) -> None:
    """Register predefined sample XML page route."""
    xml_page(path, name=name, icon=icon, schema_path=PATH / "pages" / "sample.xml")