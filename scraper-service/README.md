# Google Trends Scraper API

## 1. What is this project?

The Google Trends Scraper API is a robust, containerized backend service designed to ingest, process, and analyze Google Trends data. It tracks search interest over time, identifies top and rising related queries, and manages automated alerts for specific longtail search phrases. This service provides a structured, developer-friendly API to extract data-driven insights from search trends.

---

## 2. Project Directory Structure

Below is an overview of the core project structure and the purpose of the most important files:

```text
.
├── docker-compose.yml       # Orchestrates the multi-container setup (App, PostgreSQL, pgAdmin).
├── Dockerfile               # Production-ready instructions for building the Node.js application image.
├── .env.example             # A template file showing all required environment variables.
└── scraper-service/         # The main application workspace.
    ├── public/              # Holds static assets, notably `openapi.json` for Scalar API docs.
    ├── src/                 # Application source code.
    │   ├── controllers/     # Handles incoming HTTP requests and formatting responses.
    │   ├── services/        # Core business logic and database operations (Prisma).
    │   ├── routes/          # Express route definitions (e.g., `/api/v1/trends`).
    │   └── app.ts           # The main Express application setup and entry point.
    ├── prisma/              # Database schema definition (`schema.prisma`) and migration history.
    └── package.json         # Project dependencies, metadata, and executable scripts.

```

---

## 3. Prerequisites

To run and develop this project, you will need the following installed on your machine:

* **Docker & Docker Compose**: Essential for running the containerized database, pgAdmin, and application.
* **Node.js (v18+) & npm**: Required if you plan to run or debug the application locally outside of Docker.
* An API testing tool (optional but recommended): Postman, Insomnia, or simply `curl` installed in your terminal.

---

## 4. Environment Variables Configuration

We manage sensitive credentials and configurations using environment variables. You must set these up before running the project.

1. In the root directory of the project, copy the template file to create your actual environment file:
```bash
cp .env.example .env
```

2. Open the newly created `.env` file and configure your variables:
```env
# Database Credentials
POSTGRES_USER=my_secure_user
POSTGRES_PASSWORD=my_secure_password
POSTGRES_DB=trends_db

# pgAdmin Credentials
PGADMIN_DEFAULT_EMAIL=admin@admin.com
PGADMIN_DEFAULT_PASSWORD=root

# Prisma Database Connection (Must match PostgreSQL credentials above)
# Note: Uses 'db' as the host to resolve within the Docker network
DATABASE_URL=postgresql://my_secure_user:my_secure_password@db:5432/trends_db?schema=public

```

---

## 5. Setup and Configuration

Before the application can be used, the database schema needs to be initialized via Prisma migrations.

1. Start the database container (so Prisma has something to connect to):
```bash
docker-compose up --build -d
```

2. Run the migration command to construct the tables based on `schema.prisma`:
```bash
docker-compose exec app npx prisma migrate dev --name init
```

>*(Note: If the `app` container isn't running yet, wait to execute step 2 until you start the full stack in Section 6).*

---

## 6. How to Run Localy

>If you use docker from previous section you can skip this section

### Running Locally (Development Mode)

If you prefer to run the Node.js app directly on your host machine for faster debugging:

1. Ensure the PostgreSQL container is running (`docker-compose up -d db`).
2. Update your `.env` file's `DATABASE_URL` to use `localhost` instead of `db`.
3. Navigate into the service folder and install dependencies:
```bash
cd scraper-service
npm install
```

4. Start the development server:
```bash
npm run dev
```

---

## 7. Available Scripts

Inside the `scraper-service` folder, you can utilize the following `npm` scripts:

* `npm run dev`: Starts the application using `ts-node-dev` or `nodemon` for hot-reloading.
* `npm run build`: Compiles the TypeScript source code into standard JavaScript in the `dist/` folder.
* `npm start`: Runs the compiled production code (`node dist/app.js`).
* `npx prisma migrate dev`: Creates and applies new database migrations when you alter `schema.prisma`.
* `npx prisma generate`: Updates the Prisma Client in `node_modules` to reflect your current schema.

---

## 8. How to View API Documentation (Scalar)

We use **Scalar** to render a beautiful, interactive documentation page based on our `openapi.json`.

Because Scalar is integrated directly into the Express app as middleware, **you don't need to run a separate script to view it.** As long as your Node.js application is running (either locally or via Docker), the docs are automatically served.

---

## 9. Where to Access the Services

Once your Docker containers are up, access the tools via your browser:

* **API Base URL**: `http://localhost:3000/api/v1`
* **Scalar API Documentation**: `http://localhost:3000/api/docs`
* **pgAdmin (Database GUI)**: `http://localhost:8080`
* *Login*: Use the email and password defined in your `.env`.
* *Connect to DB*: Add a new server in pgAdmin. Use `db` as the Hostname/Address, and the user/password from your `.env`.

---

## 10. Step-by-Step: Inserting & Verifying Data

To test the flow (e.g., simulating the Harry Potter trend ingestion):

**Step 1: Ingest Data using cURL or Postman**
Send a `POST` request to the ingestion endpoint. Here is an example using `curl` in your terminal:

```bash
curl -X POST http://localhost:3000/api/v1/trends/ingest/interest \
-H "Content-Type: application/json" \
-d '{
  "phrase": "Harry Potter",
  "timeframe": "LAST_24_HOURS",
  "geo": "PL",
  "queryType": "INTEREST_OVER_TIME",
  "extractedAt": "2026-03-12T12:00:00.000Z",
  "data": [
    { "time": "2026-03-12T10:00:00Z", "value": "45" },
    { "time": "2026-03-12T11:00:00Z", "value": "50" }
  ]
}'
```

*You should receive a `201 Created` response.*

**Step 2: Verify the Data in pgAdmin**

1. Open pgAdmin (`http://localhost:8080`) and connect to `trends_db`.
2. Navigate to **Schemas > public > Tables**.
3. Open the **Query Tool** (lightning bolt icon).
4. Run the following SQL to verify the phrase was created:
```sql
SELECT * FROM "LongtailPhrase" WHERE phrase = 'Harry Potter';
```

5. You should see the Harry Potter record with its assigned ID and normalization data!

---

## 11. FAQ & Common Issues

**Q: I ran `docker-compose down -v` and now my database is empty! What happened?**
**A:** The `-v` flag stands for "volumes." Running this completely deletes the persistent volume where PostgreSQL stores your data. To avoid data loss in the future, just use `docker-compose down`. To fix your current state, you must recreate the tables by running `docker-compose exec app npx prisma migrate dev --name init` and re-ingest your data.

**Q: I'm getting a `relation "LongtailPhrase" does not exist` error.**
**A:** This means your database is empty and your schema hasn't been applied. Run the Prisma migration command to generate the tables.

**Q: The Express app crashes on startup with a "Connection refused" to port 5432.**
**A:** The Node app tried to connect to PostgreSQL before it finished initializing. Docker's `depends_on` helps, but sometimes Postgres takes a few extra seconds. Simply wait 5-10 seconds and restart the app container: `docker-compose restart app`.

**Q: My pgAdmin can't connect to the database.**
**A:** Make sure you are using `db` as the host inside pgAdmin's connection window, not `localhost`. `localhost` refers to pgAdmin's own container, whereas `db` points to the PostgreSQL container on the shared Docker network.