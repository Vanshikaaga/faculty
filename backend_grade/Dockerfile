# Use Python base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything
COPY . .

# Expose port (Railway will map it automatically)
EXPOSE 5000

# Run app
CMD ["python", "app.py"]
