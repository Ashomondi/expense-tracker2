# Spendly

Spendly is a personal expense tracker with a React and TypeScript web app and a Go HTTP API. Signed-in users can record expenses, set category budgets, and paste M-Pesa SMS messages to parse and track transactions.

## What is implemented

- Landing page and email/password sign-up and sign-in.
- Expense list with manual entry, quick entry, currency selection, and deletion.
- Category budgets stored per user.
- M-Pesa SMS import, parsing preview, import history and status counts, duplicate detection, and conversion of an import into an expense.
- Dashboard showing expense totals, category spending, recent expenses, and budget presentation.

The M-Pesa feature processes SMS text pasted by the user; there is no direct connection to a phone or Safaricom account. The dashboard includes a presentation chart and sample budget figures. The Budgets page reads and writes saved budgets. Currency conversion uses fixed rates in the frontend, not a live exchange-rate feed.

## Project structure

```text
backend/
  cmd/server/       Server entry point and active API route setup
  handlers/         HTTP request handlers
  services/         Expense and M-Pesa business logic and SMS parser
  repository/       Database access used by services
  models/           User, expense, budget, and M-Pesa import records
  middleware/       CORS, logging, and JWT middleware helpers
  utils/            Authentication, validation, response, and helper functions
  tests/            Go tests
  docs/api.md       API notes (some sections describe an older API shape)
frontend/
  src/App.tsx       Session check and authenticated navigation
  src/pages/        Landing, auth, dashboard, expenses, budgets, and M-Pesa screens
  src/styles/       Page-specific styles
docker-compose.yml  Frontend and backend container setup
```

## Requirements

- Go 1.25 or later
- Node.js and npm
- Docker Compose (optional)

## Run locally

### Start the backend

```sh
cd backend
JWT_SECRET="replace-this-with-a-long-random-secret" go run ./cmd/server
```

The API listens on `http://localhost:8080` by default. With no `DATABASE_URL`, it creates a SQLite database named `spendly.db` in the backend working directory. Set `DATABASE_URL` to a PostgreSQL connection string to use PostgreSQL instead. The server automatically creates or updates its tables on startup.

Configuration:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | API listening port |
| `DATABASE_URL` | unset | PostgreSQL connection string; unset uses SQLite |
| `JWT_SECRET` | Development fallback in code | Secret used to sign session tokens; set a strong value outside local development |
| `FRONTEND_URL` | `http://localhost:5173` | Browser origin allowed by CORS |

### Start the frontend

In a second terminal:

```sh
cd frontend
npm install
VITE_API_URL=http://localhost:8080 npm run dev
```

Open `http://localhost:5173`. Setting `VITE_API_URL` directs API calls to the local backend. If omitted, the Vite `/api` development proxy currently targets the hosted Spendly API.

### Run with Docker Compose

From the project root:

```sh
JWT_SECRET="replace-this-with-a-long-random-secret" docker compose up --build
```

Compose exposes the frontend on port `5173` and backend on port `8080`. The backend uses SQLite because Compose leaves `DATABASE_URL` empty; its data is kept in the `backend_data` volume.

## API

The active server is `backend/cmd/server/main.go` and uses Go's standard `net/http` router. Requests that need a user session authenticate through the HTTP-only `spendly_token` cookie. The frontend sends requests with credentials enabled. Login tokens expire after 24 hours.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check used by Docker Compose |
| `POST` | `/api/signup` | Create an account (`full_name`, `email`, `password`) |
| `POST` | `/api/login` | Sign in (`email`, `password`) and set session cookie |
| `GET` | `/api/me` | Return the current session user |
| `POST` | `/api/logout` | Clear the session cookie |
| `GET` | `/api/expenses` | List the signed-in user's expenses |
| `POST` | `/api/expenses` | Create an expense |
| `DELETE` | `/api/expenses` | Delete an expense using `{ "id": 1 }` in the request body |
| `GET` | `/api/budgets` | List the signed-in user's category budgets |
| `POST`, `PUT` | `/api/budgets` | Create or update a budget (`category`, `amount`) |
| `POST` | `/api/integrations/mpesa/preview` | Parse and preview an SMS transaction |
| `POST` | `/api/integrations/mpesa/import` | Import a `transactions` array of SMS messages |
| `GET` | `/api/integrations/mpesa/imports` | List import records; optional `limit` query parameter |
| `GET` | `/api/integrations/mpesa/status` | Return import counts and recent records |
| `POST` | `/api/integrations/mpesa/expense` | Create an expense from `{ "import_id": 1 }` |
| `DELETE` | `/api/integrations/mpesa/import` | Delete an import record using `{ "import_id": 1 }` |

An expense request uses this shape:

```json
{
  "title": "Groceries",
  "amount": 1250,
  "category": "Food & Drink",
  "currency": "KES",
  "date": "2026-11-06"
}
```

For SMS import, send one raw message per transaction:

```json
{
  "transactions": [
    { "raw_message": "Paste an M-Pesa SMS here" }
  ]
}
```

Import results distinguish imported, skipped, duplicate, and failed messages. Supported transaction patterns and parsing accuracy depend on the SMS wording.

There is also a `backend/routes` package with a separate router, but `cmd/server/main.go` uses its own route setup.

## Data and security

GORM auto-migrates the user, expense, budget, and M-Pesa import tables at startup. Passwords are stored as bcrypt hashes. Expense and budget data are fetched for the authenticated user. The server includes a development JWT secret fallback; configure `JWT_SECRET` to a strong, private value when running outside local development.

## Checks

Run backend tests:

```sh
cd backend
go test ./...
```

Build the frontend:

```sh
cd frontend
npm run build
```
