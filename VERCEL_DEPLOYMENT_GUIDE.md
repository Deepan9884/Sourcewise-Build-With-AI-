# 🚀 SourceWise Vercel Deployment Guide

This guide walks you through deploying **SourceWise** services to [Vercel](https://vercel.com).

---

## 🏗️ Architecture & Hosting Overview

| Service | Technology | Recommended Host | Vercel Ready? |
|---|---|---|:---:|
| **Frontend Web App** (`sourcewise-frontend`) | Vite 8 + React 19 SPA | **Vercel** | ✅ **Yes** |
| **Creator Dashboard** (`sourcewise-dashboard`) | Vite 8 + React 19 Admin SPA | **Vercel** | ✅ **Yes** |
| **Node API** (`sourcewise-backend/node-api`) | Express 4 / Node 20 REST | **Vercel** (Serverless) or Render/Railway/VPS | ✅ **Yes** |
| **Python AI Microservice** (`python-ai`) | FastAPI + ChromaDB + PyTorch | Render / Railway / Fly.io / VPS / Docker | ⚠️ *Requires Container Host* |

> ℹ️ **Note regarding Python AI**: The Python AI service uses **ChromaDB** on disk and **sentence-transformers** (PyTorch embeddings, >1GB dependencies), which exceed Vercel's 250MB serverless limit. Host `python-ai` on a container platform (Railway, Render, Fly.io, or Docker), and connect it to your Node API via `PYTHON_AI_URL`.

---

## 1. Deploying the Main Web App (`sourcewise-frontend`)

### Method A: Zero-Config Direct Root Import (Easiest)
Because we configured root `vercel.json` and root `package.json`, you can simply import the repository directly:
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
2. Select your `Source-wise` repository.
3. Leave **Root Directory** as `./` (default).
4. Expand **Environment Variables** and add:
   ```env
   VITE_API_URL=https://your-node-api-url.com
   VITE_AI_URL=https://your-python-ai-url.com
   ```
5. Click **Deploy**.

---

### Method B: Monorepo Root Directory Setting
If you prefer deploying isolated project settings per folder:
1. In Vercel, click **"Add New Project"** and select the repository.
2. In the **Root Directory** setting, click **Edit** and choose `sourcewise-frontend`.
3. Vercel will automatically detect the **Vite** framework.
4. Expand **Environment Variables** and add:
   - `VITE_API_URL`: Your Node backend URL (e.g. `https://api.yourdomain.com` or `https://sourcewise-api.vercel.app`)
   - `VITE_AI_URL`: (Optional) Your Python AI URL (e.g. `https://sourcewise-ai.up.railway.app`)
   - `VITE_GOOGLE_AUTH_URL`: (Optional) Google OAuth redirect URL if configured.
5. Click **Deploy**.

> ✅ **SPA Routing Ready**: `sourcewise-frontend/vercel.json` contains rewrites so subroutes like `/plan`, `/knowledge`, `/insights`, `/login`, etc. do not 404 when refreshed.

---

## 2. Deploying the Creator Dashboard (`sourcewise-dashboard`)

1. In Vercel, click **"Add New Project"** and select the same repository.
2. Set **Project Name** to `sourcewise-dashboard` (or your choice).
3. In **Root Directory**, click **Edit** and select:
   ```
   sourcewise-dashboard
   ```
4. Framework Preset: **Vite**
5. Expand **Environment Variables** and add:
   ```env
   VITE_API_URL=https://your-node-api-url.com
   VITE_APP_NAME=SourceWise Creator Dashboard
   ```
6. Click **Deploy**.

---

## 3. Deploying Node API on Vercel (`sourcewise-backend/node-api`)

`sourcewise-backend/node-api` is configured to run as a **Vercel Serverless Function** using `api/index.js` and `vercel.json`.

1. In Vercel, click **"Add New Project"** and select the repository.
2. Set **Root Directory** to:
   ```
   sourcewise-backend/node-api
   ```
3. Expand **Environment Variables** and provide the backend secrets:
   ```env
   NODE_ENV=production
   JWT_SECRET=your-secure-jwt-secret
   SUPABASE_URL=https://your-supabase-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   PYTHON_AI_URL=https://your-python-ai-host.com
   INTERNAL_API_KEY=your-shared-internal-key
   FRONTEND_ORIGIN=https://your-frontend.vercel.app,https://your-dashboard.vercel.app
   LOG_LEVEL=info
   ```
4. Click **Deploy**.
5. Once deployed, verify your deployment:
   ```bash
   curl https://your-node-api.vercel.app/health
   ```
   Should respond with `status: "healthy"` or `"degraded"` with 200 HTTP code.

---

## 4. Connecting Everything (CORS & Environment Variables)

- **CORS Configured for Vercel**: `sourcewise-backend/node-api/src/index.js` automatically permits:
  - All domains specified in `FRONTEND_ORIGIN` (supports comma-separated values).
  - All Vercel preview and production deployments ending in `*.vercel.app`.
  - Localhost ports `5173`, `5174`, `3000`.

- **Client Environment Variables**:
  Make sure `sourcewise-frontend` has `VITE_API_URL` set to your deployed Node API URL (no trailing slash).

---

## 5. Verification Checklist

- [x] `sourcewise-frontend` Vite SPA build succeeded (`npm run build`).
- [x] `sourcewise-dashboard` Vite admin build succeeded (`tsc -b && vite build`).
- [x] Node API test suite passes with 100% success rate (17 suites, 121 tests).
- [x] `vercel.json` SPA rewrites created for both `sourcewise-frontend` and `sourcewise-dashboard`.
- [x] Root `vercel.json` and `package.json` created for single-click root import.
- [x] Node API serverless adapter created (`api/index.js` + `vercel.json`).
- [x] Serverless safe export (`require.main === module` guard added to `app.listen`).
- [x] `.vercelignore` created to avoid uploading heavy dependencies to Vercel builds.
