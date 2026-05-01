import click


@click.command(name="init")
@click.option("--folder", prompt="Enter folder name", help="Folder to initialize")
def init_command(folder: str):
    """Initialize a new longlink project."""
    raise NotImplementedError("longlink init is not implemented yet")
