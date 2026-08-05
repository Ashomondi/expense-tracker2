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

Protected routes (once implemented) require:
```
Authorization: Bearer <token>
```

Tokens expire 24 hours after issue.