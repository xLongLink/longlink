FROM ghcr.io/voidzero-dev/vite-plus:1.5.0@sha256:cce163cdf4cf3fff928925e03a815910be14d34c355fe40b4e79e766fe368f63 AS web-builder

WORKDIR /repo/web
COPY --chown=vp:vp web/package.json web/bun.lock ./
RUN vp install --frozen-lockfile
COPY --chown=vp:vp web/ ./
COPY --chown=vp:vp sdk/ /repo/sdk/
ARG VERSION=v0.0.0
ENV VERSION=${VERSION}
ARG VITE_SITE_URL=https://www.longlink.dev
ENV VITE_SITE_URL=${VITE_SITE_URL}
RUN vp run build:api

FROM python:3.14.10-slim@sha256:9aaa474097d094040649f2162a627c0049b408f52138d980916788d80f04802f

ARG VERSION=v0.0.0

LABEL org.opencontainers.image.title="longlink-api"
LABEL org.opencontainers.image.description="LongLink backend API"
LABEL org.opencontainers.image.source="https://github.com/xLongLink/longlink"

WORKDIR /app
ENV PATH="/app/.venv/bin:${PATH}"
ENV HOME="/tmp"
ENV PYTHONDONTWRITEBYTECODE="1"

# Refresh certificate trust and remove unused pip, system utilities, and their unused libraries.
RUN /usr/local/bin/python -m pip uninstall --yes pip \
    && apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && apt-get remove --yes --no-auto-remove --allow-remove-essential \
        libblkid1 liblastlog2-2 libmount1 libsmartcols1 mount ncurses-bin util-linux \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.13.4@sha256:9f130421e930bfbdc563c00740466603f8723158e90297d07957c2294640262b /uv /usr/local/bin/uv

COPY api/pyproject.toml api/uv.lock /app/
COPY sdk/pyproject.toml sdk/README.md sdk/LICENSE /sdk/
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-editable --no-install-local --no-install-project \
    && groupadd --system --gid 10001 longlink \
    && useradd --system --uid 10001 --gid 10001 --home-dir /tmp --shell /usr/sbin/nologin longlink
COPY sdk/ /sdk/
RUN --mount=type=cache,target=/root/.cache/uv SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK=${VERSION} uv sync --frozen --no-dev --no-editable --no-install-project
COPY api/ /app/
COPY --chown=10001:10001 --from=web-builder /repo/api/src/.static/web /app/src/.static/web

# Embedded Compute chart packaged by the release workflows.
ARG COMPUTE_ARCHIVE
COPY ${COMPUTE_ARCHIVE} /app/compute/

EXPOSE 8000

USER 10001:10001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
