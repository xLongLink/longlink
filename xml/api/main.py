from pathlib import Path

import xmltodict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

XML_FILE = Path(__file__).parent / "ui.xml"


@app.get("/")
def get_ui():
    xml_text = XML_FILE.read_text(encoding="utf-8")
    data = xmltodict.parse(xml_text)
    return JSONResponse(content=data)
