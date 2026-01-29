# Init command, shall create a new viavai project structure
import os
import click
from pathlib import Path
from viavai.constants import PATH


def setup(folder: Path):
    """Initialize a new viavai project"""

    os.makedirs(folder, exist_ok=True)
    os.makedirs(folder / 'migrations', exist_ok=True)

    os.makedirs(folder / 'src', exist_ok=True)
    os.makedirs(folder / 'src' / 'models', exist_ok=True)
    os.makedirs(folder / 'src' / 'routes', exist_ok=True)
    os.makedirs(folder / 'tests', exist_ok=True)
    
    # Create main.py from template  
    with open(PATH / 'sample' / 'main.py', 'r') as src:
        template_content = src.read()
        with open(folder / 'main.py', 'w') as dst:
            dst.write(template_content)

    # Create test.py from template
    with open(PATH / 'sample' / 'test.py', 'r') as src:
        test_content = src.read()
        with open(folder / 'tests' / 'test.py', 'w') as dst:
            dst.write(test_content)
            
    click.echo(f"Project initialized in {folder}")

