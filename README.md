# SiteTrack

Construction project tracker built to learn NestJS, GraphQL, Next.js, Kubernetes, and CI/CD.

## Stack

| Layer          | Technology                                     |
| -------------- | ---------------------------------------------- |
| Backend        | NestJS + TypeORM + PostgreSQL                  |
| API            | GraphQL (code-first) + WebSocket subscriptions |
| Auth           | JWT + Passport + NextAuth.js                   |
| Frontend       | Next.js 14 App Router + Tailwind CSS           |
| Infrastructure | Docker + Kubernetes (minikube)                 |
| CI/CD          | GitHub Actions → GHCR → K8s                    |

## Quick start (local dev)

```bash
# 1. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 2. Start everything
docker compose up --build

# 3. Open the app
open http://localhost:3000

# 4. Create an admin user via GraphQL Sandbox
open http://localhost:3001/graphql
```

## Step-by-step guide

See [GUIDE.md](./GUIDE.md) for a complete walkthrough of every phase, including explanations of every architectural decision.

## Project structure

```
backend/    NestJS API (GraphQL, TypeORM, JWT)
frontend/   Next.js App Router (Server Components, Server Actions)
k8s/        Kubernetes manifests
.github/    GitHub Actions CI/CD pipeline
```
