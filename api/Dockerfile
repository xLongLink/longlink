# --- frontend build ---
FROM node:20 AS web-build
WORKDIR /web
COPY web/ ./
RUN npm install && npm run build

# --- api ---
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim
WORKDIR /app

COPY sdk /sdk
RUN uv pip install --system /sdk

COPY api/ ./

# copy built frontend into API
COPY --from=web-build /web/dist /app/static

RUN uv pip install --system .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
