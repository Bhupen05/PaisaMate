# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Copy and install requirements
COPY server/requirements.txt .
RUN pip install --no-cache-dir --prefer-binary \
    --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --prefer-binary -r requirements.txt

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy app code
COPY server .

# Expose port (Render will map this)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs')" || exit 1

# Run app - explicitly bind to 0.0.0.0
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--no-reload"]
