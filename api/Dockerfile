# --- frontend build ---
FROM node:20 AS web-build
WORKDIR /web
COPY web/ ./
RUN npm install && npm run build

# --- api ---
FROM python:3.11
WORKDIR /app

COPY sdk /sdk
RUN pip install /sdk

COPY api/ ./

# copy built frontend into API
COPY --from=web-build /web/dist /app/static

RUN pip install -r requirements.txt

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
