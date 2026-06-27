from pathlib import Path

from longlink import Router


router = Router()
PAGES_DIRECTORY = Path(__file__).resolve().parents[1] / "pages"


@router.page("/text.xml")
async def text() -> str:
    """Render the localized text example page."""

    # Load the XML page content from disk so the source stays editable.
    return (PAGES_DIRECTORY / "text.xml").read_text(encoding="utf-8")


@router.page("/form.xml")
async def form() -> str:
    """Render the account form example page."""

    # Load the XML page content from disk so the source stays editable.
    return (PAGES_DIRECTORY / "form.xml").read_text(encoding="utf-8")


@router.page("/quote.xml")
async def quote() -> str:
    """Render the quote workflow example page."""

    # Load the XML page content from disk so the source stays editable.
    return (PAGES_DIRECTORY / "quote.xml").read_text(encoding="utf-8")


@router.page("/menu.xml")
async def menu() -> str:
    """Render the menu navigation example page."""

    # Load the XML page content from disk so the source stays editable.
    return (PAGES_DIRECTORY / "menu.xml").read_text(encoding="utf-8")


@router.page("/cart.xml")
async def cart() -> str:
    """Render the fruit cart example page."""

    # Load the XML page content from disk so the source stays editable.
    return (PAGES_DIRECTORY / "cart.xml").read_text(encoding="utf-8")
