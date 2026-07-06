import random
from typing import Literal
from fastapi import APIRouter, Response

router = APIRouter()

ACCENT_COLORS = (
    "#64748b",
    "#6b7280",
    "#71717a",
    "#737373",
    "#78716c",
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
)

THEME_STYLES = {
    "light": ".logo-theme { fill: #171717; }",
    "dark": ".logo-theme { fill: #fafafa; }",
    "system": (
        ".logo-theme { fill: #171717; }\n"
        "        @media (prefers-color-scheme: dark) { .logo-theme { fill: #fafafa; } }"
    ),
}


@router.get("/logo.svg", include_in_schema=False)
async def get_logo(theme: Literal["dark", "light", "system"] = "system") -> Response:
    """Return a randomized LongLink logo SVG."""

    # The accent side varies by request, while the LINK side follows the viewer theme.
    accent_color = random.choice(ACCENT_COLORS)
    theme_style = THEME_STYLES[theme]
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="384" height="96" viewBox="0 0 384 96" role="img" aria-labelledby="logo-title logo-description">
    <title id="logo-title">LongLink</title>
    <desc id="logo-description">LongLink logo with a randomized theme accent.</desc>
    <style>
        {theme_style}
    </style>
    <text x="24" y="64" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="54" font-weight="700" letter-spacing="-3.4">
        <tspan fill="{accent_color}">LONG</tspan><tspan class="logo-theme">LINK</tspan>
    </text>
</svg>
"""

    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"cache-control": "no-store"},
    )
