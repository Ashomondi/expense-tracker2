# Spendly – Expense Tracker

## MVP 2: Financial Intelligence and Enhanced Money Management

**Release:** MVP 2  
**Status:** Planned / In Development  
**Date:** November 2026

### 1. Overview

MVP 2 focuses on improving Spendly with advanced financial management features, automation, and AI-powered insights. The goal is to help users understand their spending habits, manage their money better, and make informed financial decisions.

### 2. Features and Responsibilities

#### Evans – Live Currency Conversion
- Integrate the ExchangeRate.dev API.
- Retrieve the latest exchange rates.
- Support KES, USD, EUR, and GBP.
- Automatically convert dashboard values when users change their preferred currency.
- Implement rate caching to reduce unnecessary API requests.
- Display the last currency-rate update time.
- Preserve original transaction amounts and currencies.

#### Brown – Bank SMS Import and Financial Transaction Detection
- Identify supported bank transaction messages.
- Detect deposits, withdrawals, credits, and debits.
- Extract transaction amounts, dates, and references.
- Filter out promotional messages and OTPs.
- Support different bank SMS formats.
- Prevent duplicate transactions.
- Match bank-to-M-Pesa transfers to avoid double-counting.

#### Ashley – Spending Analytics
- Provide summaries of income and expenses.
- Show spending by category.
- Compare spending across different months.
- Display income-versus-expense reports.
- Identify spending trends and unusually high expenses.
- Provide insights into how users allocate their money.

#### Ashley – Savings and Emergency Fund Management
- Allow users to set savings goals.
- Set and manage emergency fund targets.
- Track savings progress and balances.
- Show available money after expenses and allocations.
- Provide a clear overview of financial goals.

#### Ashley – Enhanced Transaction Management
- Allow users to edit and delete transactions.
- Search and filter transactions by date, category, and transaction type.
- Improve transaction history organization.
- Support both manually entered and imported transactions.

#### Ashley – Notifications and Reminders
- Notify users when they approach or exceed category budget limits.
- Send reminders for upcoming bills and recurring expenses.
- Provide savings goal progress notifications.
- Remind users to review and update their budgets.
- Notify users about important financial activity.

#### Ashley – AI-Powered Financial Insights
- Analyze users' income, expenses, budgets, and savings patterns.
- Generate personalized spending insights and recommendations.
- Identify unusual spending patterns and possible overspending.
- Suggest areas where users can reduce expenses.
- Provide recommendations for improving savings habits.
- Generate monthly financial summaries in simple language.

### 3. Expected Outcome

By the end of MVP 2, Spendly should provide users with a more complete financial management experience. Users should be able to track transactions, understand spending patterns, manage savings, receive timely reminders, and get AI-powered recommendations to improve their financial decisions.

### 4. MVP 2 Milestone

**Financial Intelligence and Enhanced Money Management**

The release will move Spendly beyond basic expense tracking by introducing automation, personalized financial insights, notifications, and improved financial planning tools.