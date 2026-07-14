#!/bin/sh
set -eu

sdk_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
temporary_root=$(mktemp -d)
trap 'rm -rf "$temporary_root"' EXIT HUP INT TERM
project="$temporary_root/app"

cd "$sdk_root"
uv run --locked longlink init --folder "$project"
printf '\n\n[tool.uv.sources]\nlonglink = { path = "%s", editable = true }\n' "$sdk_root" >> "$project/pyproject.toml"

cd "$project"
uv lock
uv run --isolated --locked --group dev pytest tests
