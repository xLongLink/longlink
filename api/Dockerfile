FROM ghcr.io/voidzero-dev/vite-plus:0.3.2@sha256:ad19b283b2a5a551493f87c150bd1f20e13440cbf83579ac88bd284293bbd6d6 AS web-builder

WORKDIR /repo/web
COPY --chown=vp:vp web/package.json web/bun.lock ./
RUN vp install --frozen-lockfile
COPY --chown=vp:vp web/ ./
COPY --chown=vp:vp sdk/ /repo/sdk/
ARG VERSION=v0.0.0
ENV VERSION=${VERSION}
ARG VITE_SITE_URL=https://longlink.dev
ENV VITE_SITE_URL=${VITE_SITE_URL}
RUN vp run build:api:container

FROM python:3.14.7-slim@sha256:caaf356f40667c496d405780745b9ac25771c189a51dfcc42430d531ea09f8a2

ARG VERSION=v0.0.0

LABEL org.opencontainers.image.title="longlink-api"
LABEL org.opencontainers.image.description="LongLink backend API"
LABEL org.opencontainers.image.source="https://github.com/xLongLink/longlink"

WORKDIR /app
ENV PATH="/app/.venv/bin:${PATH}"
ENV HOME="/tmp"
ENV PYTHONDONTWRITEBYTECODE="1"

COPY --from=ghcr.io/astral-sh/uv:0.11.32@sha256:df4cae8f3a96d175e2e5f992e597550000edbe78fdc2594d5cd8de1a217f504c /uv /usr/local/bin/uv

COPY api/pyproject.toml api/uv.lock /app/
COPY sdk/pyproject.toml sdk/README.md sdk/LICENSE /sdk/
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-editable --no-install-local --no-install-project \
    && groupadd --system --gid 10001 longlink \
    && useradd --system --uid 10001 --gid 10001 --home-dir /tmp --shell /usr/sbin/nologin longlink
COPY sdk/ /sdk/
RUN --mount=type=cache,target=/root/.cache/uv SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK=${VERSION} uv sync --frozen --no-dev --no-editable --no-install-project
ENV VERSION=${VERSION}
COPY api/ /app/
COPY --chown=10001:10001 --from=web-builder /repo/api/src/.static/web /app/src/.static/web

# Embedded Compute chart packaged by the release workflows.
ARG COMPUTE_ARCHIVE
COPY ${COMPUTE_ARCHIVE} /app/compute/

EXPOSE 8000

USER 10001:10001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
