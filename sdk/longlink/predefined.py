from longlink.constants import PATH
from longlink.router import xml_page


def issues_page(path: str = "/issues", name: str | None = None, icon: str | None = None) -> None:
    xml_page(path, name=name, icon=icon, schema_path=PATH / "pages" / "issues.xml")
