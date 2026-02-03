# AGENTS.md

This folder contains the ViaVai Python SDK, the folder contains:

- `tests` - Unit tests for the SDK
- `viavai` - Core SDK code

The module is installed locally in editable mode:

```bash
pip install -e .
```

You can check this by running:

```bash
pip show viavai
```

## Tests

To run the unit tests, use the following command:

```bash
python -m unittest discover -s tests
```

## Sample project Structure

Created with the `viavai create <module_name>` command, the structure of the module is as follows:

```txt
main.py     # App entrypoint
migrations  # DB migrations
src/
├── cron    # Cron jobs
├── models  # Pydantic models
├── pages   # Web app pages
├── routes  # HTTP layer only
├── types   # Pydantic models
└── app.py  # App logic and validation
tests/      # Unit tests
```
