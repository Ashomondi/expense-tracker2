# API Documentation

## Auth

### POST /signup
Create a new account.

**Request body**
```json
{
  "name": "Ashley",
  "email": "ashley@example.com",
  "password": "password123"
}
```

**Response `201 Created`**
```json
{
  "user": {
    "id": "uuid",
    "name": "Ashley",
    "email": "ashley@example.com",
    "created_at": "...",
    "updated_at": "..."
  },
  "token": "eyJ..."
}
```

**Errors**
- `400` — validation failure (missing fields, invalid email, weak password)
- `409` — email already registered

---

### POST /login
Authenticate and receive a JWT.

**Request body**
```json
{
  "email": "ashley@example.com",
  "password": "password123"
}
```

**Response `200 OK`**
```json
{
  "user": { "...": "..." },
  "token": "eyJ..."
}
```

**Errors**
- `400` — validation failure
- `401` — invalid email or password (same error for both, to avoid leaking which emails are registered)

---

## Authentication

Protected routes require:
```
Authorization: Bearer <token>
```

Tokens expire 24 hours after issue.

---

## Expenses

All expense endpoints are protected and scoped to the authenticated user —
one user can never read, update, or delete another user's expenses.

### GET /expenses
List all expenses for the authenticated user.

**Query params**
- `category` (optional) — filter by category, e.g. `/expenses?category=Food`

**Response `200 OK`**
```json
{ "expenses": [ { "id": "uuid", "title": "Transport", "amount": 500, "category": "Travel", "created_at": "...", "updated_at": "..." } ] }
```

### POST /expenses
Create a new expense.

**Request body**
```json
{ "title": "Transport", "amount": 500, "category": "Travel" }
```

**Response `201 Created`** — the created expense object.

**Errors**
- `400` — missing title/category, or amount not greater than 0

### PUT /expenses/:id
Update an existing expense. Same body shape as create.

**Response `200 OK`** — the updated expense object.

**Errors**
- `400` — invalid id or invalid input
- `404` — expense doesn't exist or doesn't belong to the caller

### DELETE /expenses/:id
Delete an expense.

**Response `200 OK`**
```json
{ "message": "expense deleted" }
```

**Errors**
- `404` — expense doesn't exist or doesn't belong to the caller