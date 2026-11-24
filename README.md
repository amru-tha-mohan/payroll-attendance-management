# PayFlow — Payroll & Attendance Management Platform

Full-stack MERN application: **MongoDB (Mongoose) + Express + React (Vite) + Node.js**.

## Features

- **Auth & Roles** — JWT authentication with `ADMIN`, `HR`, `EMPLOYEE` roles; role-based UI and API guards.
- **Employee Management** — HR/Admin CRUD for employees (linked user accounts, departments, allowances, status).
- **Attendance** — Employee self check-in/check-out with live clock; HR/Admin manual marking, filters, monthly summaries.
- **Leave Management** — Apply for Casual/Sick/Earned/Unpaid leave; HR/Admin approve/reject workflow.
- **Payroll** — One-click monthly payroll generation per employee (PF 12%, professional tax, unpaid-leave deduction, allowances), mark-as-paid, draft regeneration.
- **Payslips** — Detailed payslip view with printable layout (`window.print`).
- **Dashboard** — Role-aware stats: headcount, present-today, pending leaves, payroll totals, department breakdown.
- **Reports** — Attendance, leave, payroll and headcount reports with month/year filters.

## Project structure

```
├── backend/
│   ├── src/
│   │   ├── index.js          # Express app entry
│   │   ├── config/db.js      # Mongoose connection
│   │   ├── models/           # User, Employee, Attendance, Leave, Payroll
│   │   ├── middleware/       # auth (JWT, roles), error handler
│   │   ├── routes/           # auth, employees, attendance, leaves, payroll, dashboard, reports
│   │   └── seed.js           # demo data seeder
│   └── scripts/
│       ├── smoke-test.mjs    # API integration test (in-memory MongoDB)
│       └── dev-memory.mjs    # dev server with in-memory MongoDB
└── frontend/
    └── src/
        ├── api/axios.js      # API client with JWT interceptor
        ├── context/          # AuthContext
        ├── components/       # Layout/sidebar shell
        └── pages/            # Login, Dashboard, Employees, Attendance, Leaves, Payroll, Reports
```

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then edit .env
```

Set `MONGO_URI` in `backend/.env` to your **MongoDB Atlas** connection string:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/payroll-attendance
```

Also set a strong `JWT_SECRET`.

### 2. Frontend

```bash
cd frontend
npm install
```

The Vite dev server proxies `/api` to `http://localhost:5000`.

## Run

```bash
# Terminal 1 — backend (requires valid MONGO_URI in backend/.env)
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open http://localhost:5173

### Without MongoDB Atlas (demo mode)

The backend can run against a temporary in-memory MongoDB — no account needed:

```bash
cd backend && npm run dev:memory   # data resets on restart
```

### Seed demo data

```bash
cd backend && npm run seed
```

Creates:
- Admin: `admin@payroll.com` / `admin123`
- HR: `hr@payroll.com` / `hr1234`
- Employees: `rahul@payroll.com`, `sneha@payroll.com`, `amit@payroll.com`, `kavita@payroll.com`, `vikram@payroll.com` — all / `employee123`

## Test

```bash
cd backend && npm test   # runs scripts/smoke-test.mjs (23 API assertions)
```

## API overview

| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register` `/login` · GET `/me` | public / auth |
| CRUD | `/api/employees` | ADMIN, HR |
| POST | `/api/attendance/check-in` `/check-out` `/mark` · GET `/`, `/mine`, `/today`, `/summary` | role-based |
| POST/GET | `/api/leaves`, `/mine` · PATCH `/:id/approve` `/reject` | role-based |
| POST | `/api/payroll/generate` · PATCH `/:id/pay` · GET `/`, `/mine`, `/:id` | role-based |
| GET | `/api/dashboard/stats` `/users` | auth |
| GET | `/api/reports/attendance` `/leave` `/payroll` `/headcount` | ADMIN, HR |
