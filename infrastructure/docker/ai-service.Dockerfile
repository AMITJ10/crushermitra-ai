FROM python:3.13-slim
WORKDIR /app/apps/ai-service

COPY apps/ai-service/pyproject.toml ./
RUN pip install --no-cache-dir -e .

COPY apps/ai-service ./
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

