# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install dependencies into an isolated prefix so we can copy them cleanly
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# App Runner injects environment variables at runtime – never bake secrets into
# the image. The .env file (if present locally) is excluded via .dockerignore.

# App Runner expects the container to listen on the port defined by the
# PORT environment variable. Default 8000 matches our config.py.
EXPOSE 8000

# Use exec form so signals reach uvicorn directly
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
