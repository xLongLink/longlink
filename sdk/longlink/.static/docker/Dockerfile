FROM ghcr.io/astral-sh/uv:0.13.7@sha256:96f40d3904aad8d0bd010539001d36c8e2188b981e1334471a90c4a1d93bb490 AS uv

FROM buildpack-deps:bookworm@sha256:db73e309a26ddb362c11c0ee35b3d957c3a8fd2ef6a9d6c2cc76438fae2c0988 AS builder

COPY --from=uv /uv /uvx /usr/local/bin/

# Refresh system trust before downloading Python and dependencies.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install the benchmarked Astral build at a path preserved in the runtime image.
ENV UV_PYTHON=3.12.13
ENV UV_PYTHON_INSTALL_DIR=/opt/python
ENV UV_PYTHON_CPYTHON_BUILD=20260807
RUN uv python install 3.12.13
ENV UV_PYTHON_DOWNLOADS=never

COPY ["pyproject.toml", "uv.lock", "/workspace/"]
{local_dependency_manifests}

WORKDIR {workdir}

ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK={sdk_version}

# Install locked remote dependencies before Solution source changes can invalidate this layer.
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev --no-install-local

COPY . /workspace

RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev

FROM debian:bookworm-slim@sha256:99c0b25c46d0214d5a2091092e7908907dcaecd6a962cde0ac700acee222b6f3

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
