Expense Tracker API

A modern expense tracking application built with Go that helps users manage their finances, track spending habits, create budgets, and analyze expenses in real time.

Features
Authentication
User signup
User login
JWT authentication
Password hashing with bcrypt
Expense Management
Add expenses
Update expenses
Delete expenses
View all expenses
Filter by category
Budgeting
Set monthly budgets
Track spending limits
Budget alerts
Analytics
Monthly expense summaries
Category breakdowns
Spending trends
Financial insights
Tech Stack
Technology	Purpose
Go	Backend language
Gin / Fiber	Web framework
PostgreSQL	Database
JWT	Authentication
bcrypt	Password hashing
React (optional)	Frontend
Docker (optional)	Containerization
Project Structure
expense-tracker/
│
├── main.go
├── go.mod
├── handlers/
│   ├── auth.go
│   ├── expenses.go
│   └── budgets.go
│
├── middleware/
│   └── jwt.go
│
├── models/
│   ├── user.go
│   ├── expense.go
│   └── budget.go
│
├── storage/
│   └── database.go
│
├── routes/
│   └── routes.go
│
└── utils/
    └── helpers.go
Installation
Clone the Repository
git clone https://github.com/yourusername/expense-tracker.git
cd expense-tracker
Install Dependencies
go mod tidy
Environment Variables

Create a .env file in the root directory:

PORT=8080
DB_URL=postgres://username:password@localhost:5432/expense_tracker
JWT_SECRET=your_secret_key
Run the Application
go run main.go

Server runs on:

http://localhost:8080
API Endpoints
Authentication
Register User
POST /signup
Request Body
{
  "name": "Ashley",
  "email": "ashley@example.com",
  "password": "password123"
}
Login User
POST /login
Request Body
{
  "email": "ashley@example.com",
  "password": "password123"
}
Expenses
Get All Expenses
GET /expenses
Create Expense
POST /expenses
Request Body
{
  "title": "Transport",
  "amount": 500,
  "category": "Travel"
}
Update Expense
PUT /expenses/:id
Delete Expense
DELETE /expenses/:id
Budgets
Create Budget
POST /budgets
Request Body
{
  "category": "Food",
  "limit": 10000
}
Authentication

Protected routes require a JWT token.

Example:

Authorization: Bearer your_token_here
Database Schema
Users Table
Column	Type
id	UUID
name	VARCHAR
email	VARCHAR
password	TEXT
Expenses Table
Column	Type
id	UUID
user_id	UUID
title	VARCHAR
amount	FLOAT
category	VARCHAR
created_at	TIMESTAMP
Budgets Table
Column	Type
id	UUID
user_id	UUID
category	VARCHAR
limit	FLOAT
Future Improvements
Mpesa integration
Expense charts
AI financial insights
Savings goals
Export reports (PDF/CSV)
Multi-currency support
Mobile app support
Notifications and reminders
Security
Passwords hashed using bcrypt
JWT-based authentication
Protected API routes
Input validation
Example Workflow
User signs up
User logs in
User creates expenses
User sets budgets
Dashboard analyzes spending habits
Contributing

Contributions are welcome.
Fork the repository
Create a feature branch
Commit your changes
Push your branch
Open a Pull Request

Author
Built with Go to help users develop smarter financial habits and better money management.