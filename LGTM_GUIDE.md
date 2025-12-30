# Complete Guide: Visualizing Your TM-Project with LGTM Stack

This guide will walk you through visualizing your application's traces, logs, and metrics using Grafana and the LGTM stack.

## Step 1: Start the Stack

1. Open your terminal in the project root directory
2. Run the following command:
   ```bash
   docker-compose up --build
   ```
3. Wait until you see logs indicating all services are running (should see Grafana, backend, frontend logs)

## Step 2: Generate Application Traffic

**IMPORTANT**: Without traffic, there's nothing to observe!

1. Open your browser to: **http://localhost:5173**
2. Navigate through your app:
   - Login to your account
   - Click on Teams
   - Create or view a team
   - Create a task
   - View the dashboard
3. The more you interact with the app, the more data you'll see in Grafana

## Step 3: Access Grafana

1. Open: **http://localhost:3010**
2. Login with:
   - **Username**: `admin`
   - **Password**: `admin`
3. (Optional) Skip the password change prompt

## Step 4: Configure Data Sources (One-Time Setup)

### A. Configure Tempo (Traces)

1. Click on **Connections** → **Data sources** in the left sidebar
2. You should see **tempo** already listed. Click on it
3. Set the URL to: `http://localhost:3200`
4. Scroll down and click **Save & test**
5. You should see a green checkmark "Data source is working"

### B. Configure Loki (Logs)

1. Go back to **Data sources**
2. Look for **loki** or click **Add new data source**
3. Select **Loki**
4. Set the URL to: `http://localhost:3100`
5. Click **Save & test**

### C. Configure Prometheus (Metrics)

1. Go back to **Data sources**
2. Look for **prometheus** or click **Add new data source**
3. Select **Prometheus**
4. Set the URL to: `http://localhost:9090`
5. Click **Save & test**

## Step 5: View Distributed Traces

Traces show you the timeline of each API request - how long each database query took, which middleware ran, etc.

### Method 1: Using the Search Interface
1. Click the **Explore** icon (compass) in the left sidebar
2. In the top dropdown, select **Tempo**
3. Click on the **Search** tab
4. Under **Service Name**, select `tm-backend`
5. Click **Run Query**

### Method 2: Using TraceQL (If Search Gives Errors)
If you see "syntax error: unexpected IDENTIFIER":

1. Click the **TraceQL** tab (next to Search)
2. Enter this exact query:
   ```
   { resource.service.name = "tm-backend" }
   ```
3. Click **Run Query**

### What You'll See:
- A list of traces (each representing one API request)
- Click on any trace to see:
  - Total request duration
  - Database query times
  - HTTP request/response details
  - Any errors that occurred

### Reading a Trace:
- Each horizontal bar is a "span" (a unit of work)
- Longer bars = slower operations
- Red bars = errors
- Click on any span to see detailed attributes (SQL queries, HTTP headers, etc.)

## Step 6: View Logs

Logs show you the console output from your backend container.

1. In **Explore**, change the dropdown to **Loki**
2. In the query builder, you can:
   - Click **Label browser**
   - Select `container_name`
   - Choose `tm-project-backend-1`
3. Click **Run Query**
4. You'll see a live stream of your backend logs
5. You can search/filter using the query bar (e.g., `{container_name="tm-project-backend-1"} |= "error"`)

## Step 7: View Metrics

Metrics show you performance graphs over time.

1. In **Explore**, change the dropdown to **Prometheus**
2. Try these queries:
   - **Request count**: `http_server_request_count_total`
   - **Request duration**: `http_server_duration_milliseconds`
   - **Process memory**: `process_resident_memory_bytes`
3. Click **Run Query**
4. Switch to the **Graph** tab to see visual charts

## Step 8: Create Your First Dashboard

1. Click the **+** icon in the top right
2. Select **Create Dashboard**
3. Click **Add visualization**
4. Select **Tempo** as the data source
5. In the query, select Service Name: `tm-backend`
6. Click **Run Query**
7. Change visualization type to **Time series** in the top right
8. Click **Save dashboard**

### Dashboard Ideas for Your CV:
- **API Performance**: Show average request duration over time
- **Error Rate**: Track HTTP 4xx/5xx errors
- **Database Performance**: Show MongoDB query times
- **Request Volume**: Display requests per minute

## Step 9: Link Traces to Logs (Advanced)

This is the "killer feature" that makes your CV stand out!

1. Go to **Connections** → **Data sources** → **tempo**
2. Scroll to **Trace to logs** section
3. Set:
   - **Data source**: Select `loki`
   - **Tags**: Add `job`
4. Click **Save & test**

Now when you view a trace, you'll see a **Logs** button that jumps directly to the logs for that specific request!

## Troubleshooting

### No traces appearing?
- Make sure you've used the app (Step 2)
- Check that the backend container is running: `docker ps`
- Verify the backend logs: `docker logs tm-project-backend-1`
- Try the TraceQL query: `{ resource.service.name = "tm-backend" }`

### "No labels found" in Loki?
This means logs aren't being captured yet. After restarting (see below), wait 30 seconds and try:
1. In Loki query builder, click **Code** mode
2. Enter: `{container_name="tm-project-backend-1"}`
3. Click **Run Query**

If still empty, check: `docker-compose logs backend`

### Data sources not connecting?
- Make sure all containers are running
- Use URLs: `http://localhost:3100` (Loki), `http://localhost:3200` (Tempo), `http://localhost:9090` (Prometheus)
- These are accessed from **your browser**, not from inside Docker

### "syntax error: unexpected IDENTIFIER" in Tempo?
- Use the TraceQL tab instead of Search
- Query format: `{ resource.service.name = "tm-backend" }` (with quotes!)

### Still stuck?
- Restart the stack: `docker-compose down` then `docker-compose up --build`
- Wait 1-2 minutes for all services to start
- Check logs: `docker-compose logs backend`

## For Your CV

Here's what you can now claim:

✅ "Implemented distributed tracing using OpenTelemetry and Tempo"
✅ "Configured observability stack (Loki, Grafana, Tempo, Mimir) for microservices monitoring"
✅ "Built Grafana dashboards to track API performance and error rates"
✅ "Integrated log aggregation with trace correlation for faster debugging"
✅ "Reduced mean time to resolution (MTTR) through comprehensive observability"

## Screenshots to Take

For your portfolio/GitHub:
1. A Grafana trace showing the timeline of an API request
2. A dashboard with multiple panels (request count, latency, errors)
3. The "Logs for this trace" feature in action
