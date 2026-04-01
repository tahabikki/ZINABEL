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

# Install system deps
RUN apt-get update && apt-get install -y \
    wget unzip ca-certificates curl gnupg2 fonts-liberation libnss3 libatk1.0-0 \
    libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Brave browser
RUN apt-get update && apt-get install -y curl && \
    curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" | tee /etc/apt/sources.list.d/brave-browser-release.list && \
    apt-get update && apt-get install -y brave-browser && \
    rm -rf /var/lib/apt/lists/*

# Download ChromeDriver 146 for Linux
RUN echo "Downloading ChromeDriver 146..." && \
    wget -q https://edgedl.googleapis.com/chrome-for-testing/146.0.7680.72/linux64/chromedriver-linux64.zip -O /tmp/chromedriver.zip && \
    unzip -q /tmp/chromedriver.zip -d /tmp && \
    mv /tmp/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver && \
    chmod +x /usr/local/bin/chromedriver && \
    rm -rf /tmp/chromedriver* && \
    echo "✅ ChromeDriver 146 installed"

# Python deps
COPY requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend + frontend
COPY backend /app/backend
COPY --from=frontend-build /app/frontend/dist /app/backend/static

# Environment
ENV CHROMEDRIVER_PATH=/usr/local/bin/chromedriver
ENV BRAVE_PATH=/usr/bin/brave
ENV PORT=5000

EXPOSE 5000
WORKDIR /app/backend
CMD ["python", "run_app.py"]
