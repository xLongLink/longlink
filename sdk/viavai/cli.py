import os
import click


@click.group()
def main():
    """viavai command line interface"""
    pass


# viavai init --folder sample
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
    
    # Read template from viavai library root
    template_path = os.path.join(os.path.dirname(__file__), '..', '..', 'sample', 'main.py')
    main_py_path = os.path.join(folder, 'main.py')
    
    if os.path.exists(template_path):
        with open(template_path, 'r') as src:
            template_content = src.read()
        with open(main_py_path, 'w') as dst:
            dst.write(template_content)
    else:
        with open(main_py_path, 'w') as f:
            f.write('# ViaVai Project Entry Point\n')

    click.echo(f"Project initialized in {folder}")



# TODO: Add commands for database migration using Alembic
# alembic revision --autogenerate
# alembic upgrade head
