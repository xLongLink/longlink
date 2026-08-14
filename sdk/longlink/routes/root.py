from fastapi import FastAPI
from fastapi.responses import RedirectResponse


def install_redirect(app: FastAPI) -> None:
    """Register a root redirect when the application has a static startup page."""

    # Dynamic pages need parameters and cannot be startup destinations.
    first_page = next((page for page in app.state.longlink.pages if page.route and ":" not in page.route), None)

    # Let the frontend render applications without a static startup page.
    if first_page is None:
        return

    @app.get("/", include_in_schema=False)
    def redirect_to_first_page() -> RedirectResponse:
        """Send root requests to the first registered static page."""

        return RedirectResponse(url=f"/{first_page.route}", status_code=307)
