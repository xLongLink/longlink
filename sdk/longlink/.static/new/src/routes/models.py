import csv
import json
from io import StringIO
from typing import Annotated
from fastapi import Query, Response
from pathlib import Path
from longlink import APIRouter

router = APIRouter(prefix="/api/models")


@router.get("/export", response_model=None)
async def models_export_endpoint(
    ids: Annotated[str, Query(max_length=10000)] = "",
) -> Response:
    """Export catalog records in the filtered order selected by the directory."""

    # Resolve IDs only against the bundled sample catalog.
    path = Path(__file__).resolve().parents[1] / "assets" / "models.json"
    models = {model["id"]: model for model in json.loads(path.read_text())}
    selected = [
        models[model_id]
        for model_id in dict.fromkeys(ids.split(","))
        if model_id in models
    ]

    # Let the CSV writer escape delimiters and preserve numeric prices.
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "ID",
            "Model",
            "Provider",
            "Rating",
            "Reviews",
            "Context",
            "Input",
            "Output",
            "Modalities",
            "Tags",
        ]
    )
    for model in selected:
        writer.writerow(
            [
                model["id"],
                model["name"],
                model["provider"],
                model["rating"],
                model["reviews"],
                model["context"],
                f"{model['input']:.2f}",
                f"{model['output']:.2f}",
                ", ".join(model["modalities"]),
                ", ".join(model["tags"]),
            ]
        )

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="models.csv"'},
    )
