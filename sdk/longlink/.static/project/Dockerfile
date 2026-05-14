FROM ghcr.io/astral-sh/uv:python3.12-bookworm

COPY . /workspace

WORKDIR /workspace

RUN uv sync

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80", "--log-level", "debug"]
