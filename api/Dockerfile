FROM ghcr.io/voidzero-dev/vite-plus:0.2.6@sha256:de284eb61eb6ee5fe1da3824032ed6fb37827eecd597d0d796cacd4434f806ea AS web-builder

WORKDIR /repo/web
COPY --chown=vp:vp web/package.json web/bun.lock ./
RUN vp install --frozen-lockfile
COPY --chown=vp:vp web/ ./
COPY --chown=vp:vp api/ /repo/api/
ARG VERSION=v0.0.0
ENV VERSION=${VERSION}
RUN vp run build:api

FROM python:3.12.13-slim@sha256:57cd7c3a7a273101a6485ba99423ee568157882804b1124b4dd04266317710de

ARG VERSION=v0.0.0
ENV VERSION=${VERSION}

LABEL org.opencontainers.image.title="longlink-api"
LABEL org.opencontainers.image.description="LongLink backend API"
LABEL org.opencontainers.image.source="https://github.com/xLongLink/longlink"

WORKDIR /app
ENV PATH="/app/.venv/bin:${PATH}"

COPY --from=ghcr.io/astral-sh/uv:0.11.32@sha256:df4cae8f3a96d175e2e5f992e597550000edbe78fdc2594d5cd8de1a217f504c /uv /uvx /usr/local/bin/

COPY sdk/ /sdk/
COPY api/ /app/
RUN apt-get update \
    && apt-get install --no-install-recommends --yes git \
    && SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK=${VERSION} SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK_API=${VERSION} uv sync --frozen --no-dev --no-editable --no-cache \
    && apt-get purge --auto-remove --yes git \
    && rm -rf /var/lib/apt/lists/*
COPY --from=web-builder /repo/api/src/.static/web /app/src/.static/web

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
