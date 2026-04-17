from pathlib import Path


def load_pages() -> list[Path]:
    """Load all XML page definitions shipped with sample application."""

    current_dir = Path(__file__).resolve().parent

    # Collect page files deterministically so page registration order is stable.
    return sorted(current_dir.glob("*.xml"))


pages = load_pages()
