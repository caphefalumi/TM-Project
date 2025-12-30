# LGTM Stack Deployment & Observability

This project is now instrumented with the **LGTM Stack** (Loki, Grafana, Tempo, Mimir) using OpenTelemetry. This setup provides comprehensive Full-Stack Observability, including distributed tracing, metrics collection, and log aggregation.

## Components
- **Grafana**: Visualization dashboard (Port 3010)
- **Loki**: Log aggregation
- **Tempo**: Distributed tracing
- **Mimir/Prometheus**: Metrics collection
- **OpenTelemetry SDK**: Automatic instrumentation for Express, Mongoose, and HTTP.

## How to Deploy
1. Ensure you have Docker and Docker Compose installed.
2. Run the stack:
   ```bash
   docker-compose up --build
   ```
3. Access Grafana at [http://localhost:3010](http://localhost:3010) (Login: admin/admin).
4. Data Sources are pre-configured:
   - **Tempo**: Search for traces by Service Name (`tm-backend`).
   - **Loki**: View logs from the `backend` container.
   - **Prometheus**: View metrics like request count, latency, etc.

## CV Description (Copy-Paste)

**Full-Stack Observability Implementation (LGTM Stack)**
*   Implemented a comprehensive observability suite using the **LGTM stack** (Loki, Grafana, Tempo, Mimir) and **OpenTelemetry** for a Node.js/Vue.js microservices architecture.
*   Configured **automatic instrumentation** for Express.js and Mongoose to capture distributed traces, reducing debugging time for complex API interactions.
*   Designed **Grafana dashboards** to monitor key performance indicators (KPIs) like request latency (p99), error rates, and system resource utilization.
*   Streamlined log management by integrating **Grafana Loki**, enabling seamless correlation between logs and traces for faster root cause analysis.
*   Containerized the entire observability pipeline using **Docker Compose**, ensuring a consistent and reproducible monitoring environment across development and production.
