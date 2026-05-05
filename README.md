<div align="center">

# 🧵 Songket Service

**Full-stack platform for order management, finance partners, food commodity prices, news monitoring, business dashboards, and role-based access control**

[![Go Version](https://img.shields.io/badge/Go-1.25.5-00ADD8?style=for-the-badge&logo=go)](https://go.dev/)
[![React Version](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0.10-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [API Docs](#-api-documentation) • [Project Structure](#-project-structure)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Operational Notes](#-operational-notes)

---

## 🎯 Overview

Songket Service is a full-stack web application for managing finance and order workflows. The backend is built with Go and Gin, PostgreSQL is used as the primary database, and the frontend is built with React and Vite. The system supports RBAC, dashboards, master data, news scraping, food commodity price scraping, order exports, and object storage.

### Key Highlights

- 🔐 **Secure Authentication** - Login, logout, password reset, JWT/PASETO utilities, token blacklist, and optional Redis-backed sessions.
- 🧩 **Role-Based Access Control** - Roles, permissions, menus, and feature access by resource-action permission.
- 📊 **Business Dashboard** - Order summaries, finance migration reports, commodity prices, and latest news.
- 🏢 **Finance Management** - Dealers, finance companies, metrics, and migration/order-in reports.
- 🛒 **Order Workflow** - Order CRUD, order dashboards, asynchronous exports, and scope-based filtering.
- 🌾 **Commodity Intelligence** - Commodity master data, latest prices, scrape jobs, result review, and committed scrape results.
- 📰 **News Monitoring** - News sources, scrape/import workflow, latest news, dashboard items, and cron settings.
- 🗺️ **Location Reference** - Provinces, cities/regencies, and districts from reference tables.
- 📦 **Storage Ready** - MinIO or Cloudflare R2 for file and image uploads.

---

## ✨ Features

### 🔐 Authentication & Authorization

- User login with token-based authentication.
- Logout with token blacklist.
- Forgot password and reset password flows.
- Optional session management through Redis.
- Redis-backed login limiter.
- Permission middleware per module and action.
- Admin user creation with role selection.

### 👥 User, Role & Menu Management

- Admin-managed user CRUD.
- Role CRUD and permission assignment.
- Permission CRUD.
- Active menus and user-specific menus.
- User permission overrides.
- Session revoke and revoke-all-other-sessions support when Redis is enabled.

### 📦 Order & Dashboard

- List, create, update, and delete orders.
- Order dashboard and dashboard summary.
- Asynchronous order export.
- Export status and download endpoints.
- Scope filters for order data access.

### 🏢 Business & Finance

- Dealer management.
- Finance company management.
- Dealer metrics.
- Finance company metrics.
- Finance migration reports.
- Finance migration summary.
- Order-in detail and summary per migration.

### 🏍️ Master Data

- Job management.
- Motor type management.
- Installment management.
- Net income management.
- Credit capability worksheet and summary.
- Quadrant list, summary, and recompute workflow.
- Lookup data for frontend forms and filters.

### 🌾 Commodity Price

- Commodity list and upsert.
- Commodity price creation.
- Latest prices.
- Manual price scraping.
- Scrape job creation.
- Scrape result review.
- Scrape result commit workflow.
- Dashboard commodity prices.

### 📰 News & Scraping

- News source upsert and list.
- Manual news scrape and import.
- Latest news and paginated news items.
- News item deletion.
- Dashboard news items.
- Configurable cron interval through master settings.

### ⚙️ Runtime Configuration

- Master settings for news scrape cron.
- Master settings for price scrape cron.
- Setting change history.
- Authenticated create, read, update, and delete APIs for settings.

### 🎨 Frontend Experience

- React and TypeScript single-page dashboard.
- Protected routes.
- Centralized API client with auth interceptor.
- Pages for users, roles, menus, orders, finance, commodities, news, dashboard, and profile.
- Leaflet map integration for dealer and report locations.
- Tailwind-based styling per module.

---

## 🛠️ Tech Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Go** | 1.25.5 | Core backend language |
| **Gin** | 1.12.0 | HTTP framework and routing |
| **GORM** | 1.31.1 | ORM for PostgreSQL |
| **PostgreSQL** | 16+ | Primary database |
| **Redis** | 9.18.0 client | Session management and rate limiting |
| **golang-migrate** | 4.19.1 | Database migrations |
| **Viper** | 1.21.0 | Configuration management |
| **JWT** | 5.3.1 | Token utility |
| **PASETO** | 1.0.0 | Token utility |
| **MinIO SDK** | 7.0.100 | Object storage |
| **Resty** | 2.17.2 | HTTP client |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.2.0 | UI library |
| **TypeScript** | 5.3.3 | Type-safe frontend |
| **Vite** | 5.0.10 | Build tool and dev server |
| **React Router** | 6.22.3 | Client-side routing |
| **Axios** | 1.6.7 | HTTP client |
| **Zustand** | 4.5.2 | State management |
| **Tailwind CSS** | 3.4.1 | Styling |
| **Leaflet** | 1.9.4 | Interactive maps |
| **Day.js** | 1.11.11 | Date utility |

### DevOps & Tools

- **Docker** - Backend and frontend containerization.
- **Docker Compose** - Local service orchestration.
- **Swagger UI** - Interactive API documentation.
- **Python + Playwright** - Scraping runtime.
- **Cloudflare R2 / MinIO** - Object storage providers.

---

## 🏗️ Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │    Pages     │  │  Components  │  │ Services / Store   │  │
│  │  Dashboard   │  │    Common    │  │ Axios + Zustand    │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │ HTTP
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                       Backend (Go + Gin)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │   Handlers   │  │   Services   │  │ Repositories       │  │
│  │   HTTP API   │  │ Business     │  │ GORM Queries       │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Middlewares  │  │ Scheduler    │  │ DTO / Domain       │  │
│  │ Auth + RBAC  │  │ Scrape Cron  │  │ Request/Entity     │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                         Data & Services                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ PostgreSQL   │  │    Redis     │  │ MinIO / R2 Storage │  │
│  │ Main DB      │  │ Session/Rate │  │ Uploads / Files    │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Python + Playwright Scrapers                           │  │
│  │ News source scrape and commodity price scrape           │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Installation

### Prerequisites

Make sure these tools are installed:

- **Go** 1.25.5 or the version declared in `go.mod`
- **Node.js** 18+ and npm
- **PostgreSQL** 16+ or a compatible PostgreSQL service
- **Redis**, optional for sessions and rate limiting
- **Python 3**, optional for local scraping
- **Docker & Docker Compose**, optional

### Quick Start

#### 1. Open the project directory

```bash
cd /Users/zaqiakhana/Code/Project/service-songket
```

#### 2. Prepare the environment

```bash
cp .env.example .env
```

Edit `.env`, especially the database, JWT, Redis, and storage settings.

#### 3. Start local PostgreSQL

```bash
docker compose -f deploy/docker-compose.db.yml up -d
```

#### 4. Start the backend

```bash
go mod download
go run .
```

The backend runs by default at:

```text
http://localhost:8080
```

Database migrations run automatically on backend startup. Use these flags when needed:

```bash
go run . -migrate=true
go run . -migrate=false
```

#### 5. Start the frontend

```bash
cd songket-fe
npm install
npm run dev
```

The frontend development server runs by default at:

```text
http://localhost:5173
```

---

## ⚙️ Configuration

Main environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_NAME` | Application name | `SONGKET-SERVICE` |
| `APP_ENV` | Runtime environment | `development` |
| `PORT` | Backend port | `8080` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database username | `shagya` |
| `DB_PASS` | Database password | `shagya22` |
| `DB_NAME` | Database name | `songket` |
| `DB_SSLMODE` | PostgreSQL SSL mode | `disable` |
| `JWT_KEY` | Token secret | `change-this-secret` |
| `PATH_MIGRATE` | Migration path | `file://migrations` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `STORAGE_PROVIDER` | Storage provider | `minio` or `r2` |
| `STORAGE_BUCKET_NAME` | Storage bucket | `uploads` |
| `VITE_API_URL` | Frontend API URL | `http://localhost:8080` |

Scraping configuration:

| Variable | Description |
|----------|-------------|
| `SCRAPE_PANGAN_URL` | Food price source URL |
| `SCRAPE_PANGAN_SCRIPT` | Food price scraping script |
| `SCRAPE_PANGAN_PYTHON` | Python binary for food price scraping |
| `SCRAPE_BERITA_SCRIPT` | News scraping script |
| `SCRAPE_BERITA_PYTHON` | Python binary for news scraping |
| `SCRAPE_BERITA_LIMIT` | News scraping item limit |

> ⚠️ Do not use sample credentials in production. Rotate `JWT_KEY`, database credentials, Redis credentials, and storage keys.

---

## 🐳 Docker

### Backend + Frontend

```bash
docker compose up --build
```

Services:

| Service | Default |
|---------|---------|
| Backend | `http://localhost:8080` |
| Frontend | `http://localhost:3000` |

The main compose file uses the database configured in `.env`. The PostgreSQL container in `docker-compose.yml` is currently commented out. For a local database, run:

```bash
docker compose -f deploy/docker-compose.db.yml up -d
```

The backend Docker image includes a Python virtual environment and Playwright Chromium for scrapers.

---

## 📚 API Documentation

API documentation is available after the backend is running:

- **Swagger UI**: `http://localhost:8080/swagger`
- **OpenAPI YAML**: `http://localhost:8080/swagger.yaml`
- **Healthcheck**: `http://localhost:8080/healthcheck`

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/healthcheck` | Service healthcheck |
| `GET` | `/swagger` | Swagger UI |
| `GET` | `/swagger.yaml` | OpenAPI specification |
| `POST` | `/api/user/login` | Login |
| `POST` | `/api/user/forgot-password` | Request password reset |
| `POST` | `/api/user/reset-password` | Reset password |

### Protected Modules

All modules below require a Bearer token, and most routes also use permission middleware:

- Users, roles, permissions, menus, and sessions
- Location references
- Orders and dashboards
- Dealers and finance companies
- Jobs, motor types, installments, and net incomes
- Credit and quadrants
- Commodities and price scrape jobs
- News and scrape sources
- Lookups
- Master settings

---

## 📁 Project Structure

```text
service-songket/
├── main.go                       # Backend entry point
├── go.mod                        # Go module definition
├── Dockerfile                    # Backend Docker image
├── docker-compose.yml            # Backend and frontend compose file
├── deploy/
│   └── docker-compose.db.yml     # Local PostgreSQL compose file
├── docs/
│   └── swagger.yaml              # OpenAPI specification
├── infrastructure/
│   ├── database/                 # PostgreSQL and Redis connection
│   └── media/                    # Media storage adapter
├── internal/
│   ├── authscope/                # Auth scope helpers
│   ├── domain/                   # Entity definitions
│   ├── dto/                      # Request and response DTOs
│   ├── handlers/http/            # HTTP handlers
│   ├── interfaces/               # Service and repository contracts
│   ├── repositories/             # Data access layer
│   ├── router/                   # Route registration
│   ├── scheduler/                # Auto scrape schedulers
│   └── services/                 # Business logic
├── middlewares/                  # Auth, CORS, logger, recovery, rate limit
├── migrations/                   # SQL migrations and seed data
├── pkg/                          # Shared config, logger, token, storage
├── python/songket-scraping/      # Python scraping scripts
├── songket-fe/                   # React/Vite frontend
├── storage/order-exports/        # Order export output
└── utils/                        # Shared helper utilities
```

---

## 🧪 Testing

### Backend

```bash
go test ./...
```

### Frontend Build

```bash
cd songket-fe
npm run build
```

---

## 📝 Operational Notes

- Migrations run automatically on backend startup unless `RUN_MIGRATION` is disabled or `-migrate=false` is used.
- Redis is optional. If Redis is unavailable, the backend still starts, but session management is disabled.
- News and food price scrape schedulers start automatically with the backend.
- Order export files are stored in `storage/order-exports`.
- Upload storage supports `minio` and `r2`.
- The frontend API base URL uses `VITE_API_URL`, with `http://localhost:8080` as fallback.

---

<div align="center">

**Songket Service** - Built with Go, React, PostgreSQL, and pragmatic business workflows.

</div>
