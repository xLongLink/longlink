FROM ghcr.io/astral-sh/uv:0.13.10@sha256:a3ea1357342c1a4bf9a0c53a3deb1b55379aefa037338d8113d5771efa01774f AS uv

FROM buildpack-deps:bookworm@sha256:f53cd4c58cdb96a467b98696cd510a949ef4ccd7d23e07b75107de754773007a AS builder

COPY --from=uv /uv /uvx /usr/local/bin/

# Refresh system trust before downloading Python and dependencies.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Match the build-time inspector at a path preserved in the runtime image.
ENV UV_PYTHON={python_version}
ENV UV_PYTHON_INSTALL_DIR=/opt/python
RUN uv python install {python_version}
ENV UV_PYTHON_DOWNLOADS=never

WORKDIR {workdir}

ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK={sdk_version}

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
