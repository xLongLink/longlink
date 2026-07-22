FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS web-builder

WORKDIR /repo
COPY web/package.json web/bun.lock web/ ./web/
COPY api/ ./api/
WORKDIR /repo/web
ARG VERSION=v0.0.0
ENV VERSION=${VERSION}
RUN bun install --frozen-lockfile
RUN bun run build:api

FROM python:3.12.13-slim@sha256:57cd7c3a7a273101a6485ba99423ee568157882804b1124b4dd04266317710de

ARG VERSION=v0.0.0
ENV VERSION=${VERSION}

LABEL org.opencontainers.image.title="longlink-api"
LABEL org.opencontainers.image.description="LongLink backend API"
LABEL org.opencontainers.image.source="https://github.com/xLongLink/longlink"

WORKDIR /app
ENV PATH="/app/.venv/bin:${PATH}"

COPY --from=ghcr.io/astral-sh/uv:0.11.30@sha256:93b61e21202b1dab861092748e46bbd6e0e41dd84f59b9174efd2353186e1b47 /uv /uvx /usr/local/bin/

COPY sdk/ /sdk/
COPY api/ /app/
RUN apt-get update \
    && apt-get install --no-install-recommends --yes git \
    && SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK=${VERSION} uv sync --frozen --no-dev --no-editable --no-cache \
    && apt-get purge --auto-remove --yes git \
    && rm -rf /var/lib/apt/lists/*
COPY --from=web-builder /repo/api/src/.static/web /app/src/.static/web

EXPOSE 8000

# Apply pending schema changes before starting the API server.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn main:app --host 0.0.0.0 --port 8000"]
