# Stage 1: build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend .
RUN npm run build

# Stage 2: python + brave + chromedriver (Linux 146)
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system deps + Chromium and chromedriver (use distro packages for compatibility)
RUN apt-get update && apt-get install -y \
    wget unzip ca-certificates curl gnupg2 fonts-liberation libnss3 libatk1.0-0 \
    libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
    chromium chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# Ensure chromedriver is available in /usr/local/bin (symlink if distro placed it elsewhere)
RUN if [ -x "$(command -v chromedriver)" ]; then ln -sf "$(command -v chromedriver)" /usr/local/bin/chromedriver; fi

# Python deps
COPY requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend + frontend
COPY backend /app/backend
COPY sync_scheduler.py /app/backend/
COPY --from=frontend-build /app/frontend/dist /app/backend/static

# Environment
ENV CHROMEDRIVER_PATH=/usr/local/bin/chromedriver
ENV BROWSER_PATH=/usr/bin/chromium
ENV PORT=5000

EXPOSE 5000
WORKDIR /app/backend
# Run Gunicorn in production (use WSGI entrypoint `backend/wsgi.py`)
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "wsgi:app"]
