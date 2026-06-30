<div align="center">

# LongLink SDK

Python SDK for building and packaging LongLink applications.

[![PyPI version](https://img.shields.io/pypi/v/longlink)](https://pypi.org/project/longlink/)
[![Python versions](https://img.shields.io/pypi/pyversions/longlink)](https://pypi.org/project/longlink/)
[![License](https://img.shields.io/github/license/xLongLink/longlink)](https://github.com/xLongLink/longlink/blob/main/LICENSE)

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

<br/>

## Quick Start

Requirements: Python 3.14 or newer, `uv`, and Docker if you want to build an image.

```bash
uvx longlink init --folder sample
cd sample
uv sync
uv run longlink dev
```

<br />

## Commands

| Command                                                     | Description                             |
| ----------------------------------------------------------- | --------------------------------------- | --- |
| `longlink init --folder <name>`                             | Create a new app.                       |
| `longlink dev`                                              | Run the app locally.                    | >   |
| `longlink migrate`                                          | Run database migrations.                |
| `longlink docs [component]`                                 | Show XML component docs.                |
| `longlink translations generate`                            | Update translation files from XML keys. |
| `longlink build [--tag <tag>] [--registry <host>] [--push]` | Build the app Docker image.             |
