from fastapi import APIRouter
from src.schemas.projects import PhaseRead, DocumentRead

router = APIRouter(prefix="/api/phases")

# Describe the same illustrative construction lifecycle as the landing-page demo.
phases = [
    PhaseRead(
        label="Strategic planning",
        description="Define what you want to build, the budget, and your objectives.",
        documents=[
            DocumentRead(name="Client brief", available=True),
            DocumentRead(name="Room schedule", available=True),
            DocumentRead(name="Financial budget", available=False),
            DocumentRead(name="Preliminary schedule", available=False),
        ],
    ),
    PhaseRead(
        label="Preliminary studies",
        description="Check the feasibility and select the project team.",
        documents=[
            DocumentRead(name="Site and zoning assessment", available=True),
            DocumentRead(name="Feasibility study", available=True),
            DocumentRead(name="Preliminary costs", available=False),
            DocumentRead(name="Architect and engineer contracts", available=False),
        ],
    ),
    PhaseRead(
        label="Project design",
        description="Design the house and obtain planning permission.",
        documents=[
            DocumentRead(name="Architectural plans", available=True),
            DocumentRead(name="Engineering concepts", available=True),
            DocumentRead(name="Building description", available=True),
            DocumentRead(name="Detailed cost estimate", available=False),
            DocumentRead(name="Permit application and approvals", available=False),
        ],
    ),
    PhaseRead(
        label="Tendering",
        description="Request quotations, compare contractors, and award contracts.",
        documents=[
            DocumentRead(name="Tender drawings", available=True),
            DocumentRead(name="Bills of quantities", available=True),
            DocumentRead(name="Specifications", available=True),
            DocumentRead(name="Contractor bids", available=False),
            DocumentRead(name="Comparison", available=False),
            DocumentRead(name="Construction contracts", available=False),
        ],
    ),
    PhaseRead(
        label="Realization",
        description="Prepare construction drawings, build, inspect, and hand over the house.",
        documents=[
            DocumentRead(name="Execution drawings", available=True),
            DocumentRead(name="Construction and inspection records", available=True),
            DocumentRead(name="Acceptance protocol", available=False),
            DocumentRead(name="As-built documentation", available=False),
            DocumentRead(name="Commissioning records", available=False),
            DocumentRead(name="Final account", available=False),
        ],
    ),
    PhaseRead(
        label="Operation and maintenance",
        description="Operate, inspect, maintain, and repair the completed property.",
        documents=[
            DocumentRead(name="Building manual", available=True),
            DocumentRead(name="Warranties", available=True),
            DocumentRead(name="Inspection and service plans", available=True),
            DocumentRead(name="Maintenance records", available=False),
            DocumentRead(name="Repair documentation", available=False),
        ],
    ),
]


@router.get("", response_model=list[PhaseRead])
def phases_get_endpoint() -> list[PhaseRead]:
    """Return the read-only example phases and document checklists."""

    # Expose illustrative checklist entries, not claims about uploaded files.
    return phases
