# Use the official Python 3.9.12-slim image as the base (match with UV)
FROM python:3.9.12-slim

# Set the working directory inside the container
WORKDIR /app

# Install necessary tools for Go installation
RUN apt-get update && apt-get install -y \
    wget tar && \
    rm -rf /var/lib/apt/lists/*

# Install Go 1.21.1
RUN wget https://go.dev/dl/go1.21.1.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.21.1.linux-amd64.tar.gz && \
    rm go1.21.1.linux-amd64.tar.gz

# Set GOROOT and update PATH to use Go 1.21.1
ENV GOROOT=/usr/local/go
ENV GOPATH=/go
ENV PATH=$GOROOT/bin:$GOPATH/bin:$PATH

# Copy the requirements file first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies without caching (includes UV)
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir uv

# Copy the remaining contents of the current directory into the container
COPY . .

# Ensure Python scripts are executable
RUN chmod +x *.py
