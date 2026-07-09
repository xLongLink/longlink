import random
from typing import Literal
from fastapi import APIRouter, Response
from src.models.users import ACCENT_COLOR_VALUES

router = APIRouter()

THEME_STYLES = {
    "light": ".logo-theme { fill: #171717; }",
    "dark": ".logo-theme { fill: #fafafa; }",
    "system": (
        ".logo-theme { fill: #171717; }\n        @media (prefers-color-scheme: dark) { .logo-theme { fill: #fafafa; } }"
    ),
}


@router.get("/logo.svg", include_in_schema=False)
async def get_logo(theme: Literal["dark", "light", "system"] = "system") -> Response:
    """Return a randomized LongLink logo SVG."""

    # The accent side varies by request, while the LINK side follows the viewer theme.
    accent_color = random.choice(ACCENT_COLOR_VALUES)
    theme_style = THEME_STYLES[theme]
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="384" height="96" viewBox="0 0 384 96" role="img" aria-labelledby="logo-title logo-description">
    <title id="logo-title">LongLink</title>
    <desc id="logo-description">LongLink logo with a randomized theme accent.</desc>
    <style>
        {theme_style}
    </style>
    <text
        x="192"
        y="64"
        text-anchor="middle"
        font-family="Inter, ui-sans-serif, system-ui, sans-serif"
        font-size="54"
        font-weight="700"
        letter-spacing="-3.4"
    ><tspan fill="{accent_color}">LONG</tspan><tspan class="logo-theme">LINK</tspan></text>
</svg>
"""

    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"cache-control": "no-store"},
    )
