FROM ghcr.io/astral-sh/uv:0.13.7@sha256:96f40d3904aad8d0bd010539001d36c8e2188b981e1334471a90c4a1d93bb490 AS uv

FROM buildpack-deps:bookworm@sha256:f53cd4c58cdb96a467b98696cd510a949ef4ccd7d23e07b75107de754773007a AS builder

COPY --from=uv /uv /uvx /usr/local/bin/

# Refresh system trust before downloading Python and dependencies.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install the benchmarked Astral build at a path preserved in the runtime image.
ENV UV_PYTHON=3.12.13
ENV UV_PYTHON_INSTALL_DIR=/opt/python
ENV UV_PYTHON_CPYTHON_BUILD=20260807
RUN uv python install "$UV_PYTHON"
ENV UV_PYTHON_DOWNLOADS=never

COPY ["pyproject.toml", "uv.lock", "/workspace/"]
{local_dependency_manifests}

WORKDIR {workdir}

ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK={sdk_version}

# Install locked remote dependencies before Solution source changes can invalidate this layer.
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev --no-install-local

COPY . /workspace

RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev

FROM debian:bookworm-slim@sha256:734a72b3d6142a71993b4bc580ca01d8ca687f77a2c422d96a961d3376b179bc

# Refresh certificate trust and retain network defaults and timezone data for Solution code.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates netbase tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR {workdir}

COPY --from=builder /opt/python /opt/python
COPY --from=builder /workspace /workspace

{labels}

ENV PATH="/workspace/.venv/bin:$PATH"
ENV HOME="/tmp"
ENV PYTHONDONTWRITEBYTECODE="1"

# Precompile imports for the non-root, read-only Solution runtime.
RUN python -m compileall -q /opt/python /workspace

RUN groupadd --system --gid 10001 longlink \
    && useradd --system --uid 10001 --gid 10001 --home-dir /tmp --shell /usr/sbin/nologin longlink \
    && chown -R 10001:10001 /workspace

USER 10001:10001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
