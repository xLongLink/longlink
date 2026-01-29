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

    os.makedirs(folder, exist_ok=True)
    os.makedirs(os.path.join(folder, 'migrations'), exist_ok=True)

    os.makedirs(os.path.join(folder, 'src'), exist_ok=True)
    os.makedirs(os.path.join(folder, 'src', 'models'), exist_ok=True)
    os.makedirs(os.path.join(folder, 'src', 'routes'), exist_ok=True)

    os.makedirs(os.path.join(folder, 'tests'), exist_ok=True)
    
    main_py_path = os.path.join(folder, 'main.py')
    if not os.path.exists(main_py_path):
        with open(main_py_path, 'w') as f:
            f.write('# ViaVai Project Entry Point\n')

    click.echo(f"Project initialized in {folder}")




# alembic revision --autogenerate
# alembic upgrade head
