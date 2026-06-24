from pathlib import Path
from longlink import Router


router = Router()


@router.page("/dashboard.xml")
async def dashboard() -> str:
    """Render the minimal showcase dashboard page."""

    # Load the XML page content from disk so the source stays editable.
    return (Path(__file__).resolve().parents[1] / "pages" / "dashboard.xml").read_text(encoding="utf-8")
