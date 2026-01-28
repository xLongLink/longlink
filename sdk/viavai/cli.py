import os
import click


@click.group()
def main():
    """viavai command line interface"""
    pass


@main.command()
@click.option('--folder', prompt='Enter folder name', help='Folder to initialize')
def init(folder):
    """Initialize a new viavai project"""
    # TODO: Each project shall have a pre-defined structure
    
    os.makedirs(folder, exist_ok=True)
    os.makedirs(os.path.join(folder, 'migrations'), exist_ok=True)
    os.makedirs(os.path.join(folder, 'src'), exist_ok=True)
    os.makedirs(os.path.join(folder, 'tests'), exist_ok=True)
    
    click.echo(f"Project initialized in {folder}")