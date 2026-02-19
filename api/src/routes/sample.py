from src.router import router

from fastapi import FastAPI, Query
from typing import List, Optional
from pydantic import BaseModel


class User(BaseModel):
    id: int
    name: str
    email: str
    role: str


# Sample in-memory dataset
DATABASE: List[User] = [
    User(id=1, name="Leonardo Saurwein", email="leo@example.com", role="Admin"),
    User(id=2, name="Anna Keller", email="anna@example.com", role="User"),
    User(id=3, name="Marco Rossi", email="marco@example.com", role="User"),
    User(id=4, name="John Smith", email="john@example.com", role="Manager"),
    User(id=5, name="Sara Connor", email="sara@example.com", role="User"),
    User(id=1, name="Leonardo Saurwein", email="leo@example.com", role="Admin"),
    User(id=2, name="Anna Keller", email="anna@example.com", role="User"),
    User(id=3, name="Marco Rossi", email="marco@example.com", role="User"),
    User(id=4, name="John Smith", email="john@example.com", role="Manager"),
    User(id=5, name="Sara Connor", email="sara@example.com", role="User"),
    User(id=1, name="Leonardo Saurwein", email="leo@example.com", role="Admin"),
    User(id=2, name="Anna Keller", email="anna@example.com", role="User"),
    User(id=3, name="Marco Rossi", email="marco@example.com", role="User"),
    User(id=4, name="John Smith", email="john@example.com", role="Manager"),
    User(id=5, name="Sara Connor", email="sara@example.com", role="User"),
    User(id=1, name="Leonardo Saurwein", email="leo@example.com", role="Admin"),
    User(id=2, name="Anna Keller", email="anna@example.com", role="User"),
    User(id=3, name="Marco Rossi", email="marco@example.com", role="User"),
    User(id=4, name="John Smith", email="john@example.com", role="Manager"),
    User(id=5, name="Sara Connor", email="sara@example.com", role="User"),
    User(id=1, name="Leonardo Saurwein", email="leo@example.com", role="Admin"),
    User(id=2, name="Anna Keller", email="anna@example.com", role="User"),
    User(id=3, name="Marco Rossi", email="marco@example.com", role="User"),
    User(id=4, name="John Smith", email="john@example.com", role="Manager"),
    User(id=5, name="Sara Connor", email="sara@example.com", role="User"),
    User(id=1, name="Leonardo Saurwein", email="leo@example.com", role="Admin"),
    User(id=2, name="Anna Keller", email="anna@example.com", role="User"),
    User(id=3, name="Marco Rossi", email="marco@example.com", role="User"),
    User(id=4, name="John Smith", email="john@example.com", role="Manager"),
    User(id=5, name="Sara Connor", email="sara@example.com", role="User"),
    User(id=1, name="Leonardo Saurwein", email="leo@example.com", role="Admin"),
    User(id=2, name="Anna Keller", email="anna@example.com", role="User"),
    User(id=3, name="Marco Rossi", email="marco@example.com", role="User"),
    User(id=4, name="John Smith", email="john@example.com", role="Manager"),
    User(id=5, name="Sara Connor", email="sara@example.com", role="User"),
    User(id=1, name="Leonardo Saurwein", email="leo@example.com", role="Admin"),
    User(id=2, name="Anna Keller", email="anna@example.com", role="User"),
    User(id=3, name="Marco Rossi", email="marco@example.com", role="User"),
    User(id=4, name="John Smith", email="john@example.com", role="Manager"),
    User(id=5, name="Sara Connor", email="sara@example.com", role="User"),
    User(id=1, name="Leonardo Saurwein", email="leo@example.com", role="Admin"),
    User(id=2, name="Anna Keller", email="anna@example.com", role="User"),
    User(id=3, name="Marco Rossi", email="marco@example.com", role="User"),
    User(id=4, name="John Smith", email="john@example.com", role="Manager"),
    User(id=5, name="Sara Connor", email="sara@example.com", role="User"),
    User(id=1, name="Leonardo Saurwein", email="leo@example.com", role="Admin"),
    User(id=2, name="Anna Keller", email="anna@example.com", role="User"),
    User(id=3, name="Marco Rossi", email="marco@example.com", role="User"),
    User(id=4, name="John Smith", email="john@example.com", role="Manager"),
    User(id=5, name="Sara Connor", email="sara@example.com", role="User"),
]


# -----------------------
# /sample Endpoint
# -----------------------

@router.get("/sample")
def get_sample(
    page: int = Query(1, ge=1),
    value: int = Query(10, ge=1),
    sort: Optional[str] = Query(None),
    order: Optional[str] = Query("asc"),
):
    data = DATABASE.copy()

    # ---- Sorting ----
    if sort:
        reverse = order == "desc"

        try:
            data.sort(
                key=lambda item: getattr(item, sort, None),
                reverse=reverse,
            )
        except Exception:
            pass  # ignore invalid sort field safely

    total = len(data)

    # ---- Pagination ----
    start = (page - 1) * value
    end = start + value
    paginated_data = data[start:end]

    return {
        "data": paginated_data,
        "total": total,
    }
