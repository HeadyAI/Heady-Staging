FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY services/ai_router/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY services/ai_router /app/services/ai_router
COPY services/jules_mcp /app/services/jules_mcp
COPY services/perplexity_mcp /app/services/perplexity_mcp
COPY services/google_mcp /app/services/google_mcp
COPY services/secret_gateway /app/services/secret_gateway
COPY services/prompt_manager /app/services/prompt_manager

# Set Python path
ENV PYTHONPATH=/app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8085/health || exit 1

EXPOSE 8085

CMD ["python", "-m", "services.ai_router.server"]
