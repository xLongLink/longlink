FROM oven/bun:1 AS web-builder

WORKDIR /repo
COPY web/package.json web/bun.lock web/ ./web/
COPY api/ ./api/
WORKDIR /repo/web
ARG VERSION=v0.0.0
ENV VERSION=${VERSION}
RUN bun install --frozen-lockfile
RUN bun run build:api

FROM python:3.14-slim

LABEL org.opencontainers.image.title="longlink-api"
LABEL org.opencontainers.image.description="LongLink backend API"
LABEL org.opencontainers.image.source="https://github.com/xLongLink/longlink"

WORKDIR /app
ENV PATH="/app/.venv/bin:${PATH}"

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

COPY org/ /org/
COPY api/ /app/
RUN uv sync --frozen --no-dev --no-editable --no-cache
COPY --from=web-builder /repo/api/src/.static/web /app/src/.static/web

EXPOSE 8000

# Apply pending schema changes before starting the API server.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn main:app --host 0.0.0.0 --port 8000"]
