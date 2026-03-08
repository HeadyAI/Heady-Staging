FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port for FastMCP/Uvicorn (usually 8000 or defined in compose)
# We will use 8083 for Hugging Face Gateway
EXPOSE 8083

CMD ["python", "server.py"]
