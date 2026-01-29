import click
from pathlib import Path
from viavai.cli import setup


@click.group()
def main():
    """viavai command line interface"""
    pass


# viavai dev
@main.command()
def dev():
    import sys
    import os
    import uvicorn

    # add CWD to import path
    sys.path.insert(0, os.getcwd())

    uvicorn.run(
        "src.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )


# viavai init --folder sample
@main.command()
@click.option('--folder', prompt='Enter folder name', help='Folder to initialize')
def init(folder: str):
    """Initialize a new viavai project"""
    folder_path = Path(folder)
    setup(folder_path)



# TODO: Add commands for database migration using Alembic
# alembic revision --autogenerate
# alembic upgrade head
