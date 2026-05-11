# ExamCloudX

Online examination platform with browser-based proctoring, multi-admin workspaces, and professional PDF reports.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Database**: Neon PostgreSQL (serverless)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State**: Zustand
- **Auth**: bcryptjs + JWT (jsonwebtoken)
- **Animations**: Framer Motion
- **Proctoring**: MediaPipe Face Mesh (client-side)

## Prerequisites

- Node.js 18+ or Bun
- A Neon PostgreSQL database

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/cloudxplorer/ExamCloudX
cd ExamCloudX
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string (use pooler URL) |
| `JWT_SECRET` | Secret key for JWT token signing |

### 3. Initialize Database

Run the SQL schema against your Neon database:

```bash
npm run db:setup
```

Or manually execute `sqltable.sql` in the Neon SQL editor.

### 4. Start Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Signup, login, session
│   │   ├── exams/         # Exam CRUD
│   │   ├── results/       # Results CRUD
│   │   ├── proctor-logs/  # Proctor event logging
│   │   ├── live-frame/    # Live camera frame relay
│   │   ├── proctor/       # Info endpoint
│   │   └── shorten/       # URL shortening
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── exam/
│   │   ├── LandingPage.tsx
│   │   ├── AuthPage.tsx
│   │   ├── ExamBuilder.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── StudentExam.tsx
│   │   └── ResultPage.tsx
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── db.ts              # Database connection
│   ├── auth.ts            # Password hashing & JWT
│   ├── store.ts           # Zustand state
│   ├── head-pose.ts       # Head pose estimation
│   ├── mediapipe-loader.ts # MediaPipe Face Mesh loader
│   └── utils.ts           # Utility functions
└── sqltable.sql           # Database schema
```

## Features

- Admin signup/login with bcrypt password hashing
- Exam creation with MCQ questions and JSON import
- Shareable exam links with optional URL shortening
- Timed exams with fullscreen enforcement
- Browser-based face monitoring via MediaPipe Face Mesh
- Head turn detection and tab switch warnings
- Auto-submit on 3 proctoring warnings
- Instant grading with detailed feedback
- PDF report generation
- Admin dashboard with live proctor monitoring

## Build for Production

```bash
npm run build
npm run start
```

## Vercel Deployment

1. Push to GitHub
2. Import in Vercel
3. Set environment variables (`DATABASE_URL`, `JWT_SECRET`)
4. Deploy

## Database Schema

See `sqltable.sql` for the complete schema with tables:

- `admins` — Admin accounts
- `exams` — Exam configurations
- `questions` — MCQ questions per exam
- `results` — Student submissions and scores
- `proctor_logs` — Proctoring event records
