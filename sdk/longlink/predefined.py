from longlink.router import xml_page
from longlink.constants import PATH


def issues_page(path: str = "/issues", name: str | None = None, icon: str | None = None) -> None:
    xml_page(path, name=name, icon=icon, schema_path=PATH / "pages" / "issues.xml")


def sample_page(path: str = "/sample-xml", name: str | None = None, icon: str | None = None) -> None:
    xml_page(path, name=name, icon=icon, schema_path=PATH / "pages" / "sample.xml")
