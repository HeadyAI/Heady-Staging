FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY core ./core
COPY services ./services
# COPY config ./config  <-- Config is mounted via volume in compose, but copying ensures existence for build
ENV PYTHONPATH=/app
CMD ["python", "core/main.py"]
