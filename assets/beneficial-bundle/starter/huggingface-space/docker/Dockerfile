
FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN python -m http.server --help > /dev/null
EXPOSE 7860
CMD ["python", "-m", "http.server", "7860"]
