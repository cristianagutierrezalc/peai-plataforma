FROM python:3.12-slim

# Necesario para compilar dependencias con wheels nativos (psycopg2, cryptography)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# La app no arranca si ENVIRONMENT=production y faltan secretos.
ENVIRONMENT=production
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]