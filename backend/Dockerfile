# Nala Credit Ti Machann - Backend API Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build environment
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy csproj and restore dependencies (cached layer)
COPY NalaCreditAPI/*.csproj ./
RUN dotnet restore

# Copy source code and build
COPY NalaCreditAPI/ ./
RUN dotnet publish -c Release -o /app/publish \
    --no-restore \
    --self-contained false \
    /p:PublishTrimmed=false \
    /p:PublishSingleFile=false

# Stage 2: Runtime environment
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

# Install additional dependencies if needed
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Set working directory
WORKDIR /app

# Copy published application
COPY --from=build /app/publish .

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /app/logs \
    && chown -R appuser:appgroup /app \
    && chmod 755 /app/uploads

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:5000

# Entry point
ENTRYPOINT ["dotnet", "NalaCreditAPI.dll"]