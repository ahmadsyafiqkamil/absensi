FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System deps for mysqlclient
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        default-libmysqlclient-dev \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy Django project
COPY app/ /app/

EXPOSE 8000

# Default command suitable for production; dev override in compose
CMD ["gunicorn", "core.wsgi:application", "-b", "0.0.0.0:8000", "--workers", "3"]


