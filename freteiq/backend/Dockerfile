FROM python:3.11-slim

WORKDIR /app

COPY freteiq/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY freteiq/backend/ .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
