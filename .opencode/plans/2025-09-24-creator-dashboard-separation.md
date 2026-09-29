# Creator Dashboard Separation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the existing admin/creator dashboard from the main SourceWise frontend into a standalone React + Vite application that shares JWT authentication, enabling independent deployment and scaling.

**Architecture:** Monorepo structure with two independent Vite apps sharing a common auth mechanism via JWT tokens in HTTP-only cookies or shared localStorage. The creator dashboard becomes a completely separate `sourcewise-dashboard/` app that can be deployed to its own domain (e.g., `dashboard.sourcewise.com`) with independent CI/CD, scaling, and infrastructure.

**Tech Stack:** React 19, Vite 8, TypeScript, TailwindCSS 3, Zustand 5, React Router 7, Recharts 2 — identical to current stack for minimal migration effort.

---

## Global Constraints

- **Shared auth:** JWT issued by main app's `/auth/login` works for dashboard via `VITE_API_URL` pointing to same node-api
- **Same design system:** Reuse existing Tailwind config, component primitives, color palette
- **Node API unchanged:** `/admin/*` routes remain as-is, dashboard calls same endpoints
- **Independent CI/CD:** Dashboard has its own `.github/workflows/dashboard.yml` and Dockerfile
- **Zero breaking changes:** Main app `/admin` routes remain functional during/after migration

---

## File Structure

```
sourcewise-dashboard/                    # NEW separate app
├── .github/
│   └── workflows/
│       ├── dashboard.yml               # CI: lint, build, test
│       └── deploy.yml                  # CD: Docker build + deploy
├── Dockerfile
├── docker-compose.yml                  # Local dev with node-api + python-ai
├── .env.example
├── package.json
├── vite.config.ts
├── tailwind.config.js                  # Shared from main app
├── tsconfig.json
├── index.html
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── router/
│   │   └── AppRouter.tsx
│   ├── pages/
│   │   ├── AdminDashboardPage.tsx      # Migrated from main app
│   │   ├── AdminUsersPage.tsx
│   │   ├── AdminUserDetailPage.tsx
│   │   ├── AdminUsagePage.tsx
│   │   ├── AdminProvidersPage.tsx
│   │   ├── AdminSystemPage.tsx
│   │   └── LoginPage.tsx               # Optional: separate login
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminLayout.tsx         # Migrated
│   │   │   └── StatCard.tsx
│   │   └── ui/                         # Shared primitives (copied)
│   ├── lib/
│   │   └── adminApi.ts                 # Migrated to TS
│   ├── store/
│   │   └── adminStore.ts               # Migrated to TS
│   ├── hooks/
│   └── utils/
└── tests/
    └── ...
```

---

## Phase 1: Scaffold New App (Day 1)

### Task 1: Initialize `sourcewise-dashboard/` with Vite + React + TS

**Files:**
- Create: `sourcewise-dashboard/package.json`
- Create: `sourcewise-dashboard/vite.config.ts`
- Create: `sourcewise-dashboard/tsconfig.json`
- Create: `sourcewise-dashboard/tailwind.config.js`
- Create: `sourcewise-dashboard/.env.example`
- Create: `sourcewise-dashboard/index.html`
- Create: `sourcewise-dashboard/src/main.tsx`
- Create: `sourcewise-dashboard/src/App.tsx`
- Create: `sourcewise-dashboard/src/App.css`

**Interfaces:**
- Consumes: None (foundation)
- Produces: Runnable Vite app skeleton with TS + React 19 + Tailwind

- [ ] **Step 1: Create package.json**

```json
{
  "name": "sourcewise-dashboard",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0",
    "recharts": "^2.15.0",
    "lucide-react": "^0.400.0",
    "axios": "^1.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0",
    "eslint": "^9.0.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/admin': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: true },
})
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create tailwind.config.js (copy from main app)**

```js
// Copy exact tailwind.config.js from sourcewise-frontend/
// Includes all planner colors, fonts, animations, utilities
```

- [ ] **Step 5: Create .env.example**

```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=SourceWise Creator Dashboard
```

- [ ] **Step 6: Create src/main.tsx, App.tsx, index.html, App.css**

```tsx
// main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './App.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

```tsx
// App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminUserDetailPage from './pages/AdminUserDetailPage'
import AdminUsagePage from './pages/AdminUsagePage'
import AdminProvidersPage from './pages/AdminProvidersPage'
import AdminSystemPage from './pages/AdminSystemPage'
import AdminLayout from './components/admin/AdminLayout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<AdminDashboardPage />} />
        <Route path="/users" element={<AdminUsersPage />} />
        <Route path="/users/:id" element={<AdminUserDetailPage />} />
        <Route path="/usage" element={<AdminUsagePage />} />
        <Route path="/providers" element={<AdminProvidersPage />} />
        <Route path="/system" element={<AdminSystemPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

---

## Phase 2: Migrate Shared Primitives (Day 1-2)

### Task 2: Copy Design System Primitives

**Files:**
- Create: `sourcewise-dashboard/src/components/ui/*.tsx` (copied from main app)
- Create: `sourcewise-dashboard/src/lib/utils.ts` (cn, etc.)

**Copy from main app:**
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/glow-card.tsx`
- `src/components/ui/study-progress-ring.tsx`
- `src/components/ui/ambient-light.tsx`
- `src/components/ui/particle-background.tsx`
- `src/components/ui/knowledge-graph.tsx`
- `src/components/ui/empty-state.tsx`

**Interfaces:**
- Consumes: None
- Produces: Reusable UI primitives identical to main app

- [ ] **Step 1: Copy each primitive component, update imports to `@/lib/utils`**
- [ ] **Step 2: Create `src/lib/utils.ts` with `cn` helper**

---

## Phase 3: Migrate Admin Components & Pages (Day 2-3)

### Task 3: Migrate Admin Layout & Components

**Files:**
- Create: `sourcewise-dashboard/src/components/admin/AdminLayout.tsx`
- Create: `sourcewise-dashboard/src/components/admin/StatCard.tsx`

**Migration:** Copy from `sourcewise-frontend/src/components/admin/` with:
- Update imports to `@/components/ui/*`, `@/lib/utils`
- Replace `useAuthStore` from new `@/store/authStore`
- Update `adminApi` import from `@/lib/adminApi`

**Interfaces:**
- Consumes: `@/store/authStore`, `@/lib/adminApi`
- Produces: Layout wrapper with sidebar nav, StatCard component

- [ ] **Step 1: Copy AdminLayout, update imports, add logout handler from new authStore**
- [ ] **Step 2: Copy StatCard component**

### Task 4: Migrate Admin Pages (6 pages)

**Files (create all):**
- `AdminDashboardPage.tsx`
- `AdminUsersPage.tsx`
- `AdminUserDetailPage.tsx`
- `AdminUsagePage.tsx`
- `AdminProvidersPage.tsx`
- `AdminSystemPage.tsx`

**Migration:** Copy from `sourcewise-frontend/src/pages/admin/` with:
- Update all imports to new paths (`@/lib/adminApi`, `@/store/adminStore`, `@/components/admin/*`, `@/components/ui/*`)
- Convert `.jsx` → `.tsx` with proper TypeScript types
- Keep all Recharts, Lucide, Framer Motion logic identical

**Interfaces:**
- Consumes: `@/lib/adminApi`, `@/store/adminStore`, `@/components/admin/AdminLayout`
- Produces: 6 fully functional admin pages

- [ ] **Step 1: Migrate AdminDashboardPage.tsx** (most complex, has Recharts)
- [ ] **Step 2: Migrate AdminUsersPage.tsx**
- [ ] **Step 3: Migrate AdminUserDetailPage.tsx**
- [ ] **Step 4: Migrate AdminUsagePage.tsx**
- [ ] **Step 5: Migrate AdminProvidersPage.tsx**
- [ ] **Step 6: Migrate AdminSystemPage.tsx**

---

## Phase 4: Migrate Auth & API Layer (Day 3)

### Task 5: Create Auth Store

**File:** `sourcewise-dashboard/src/store/authStore.ts`

**Migration:** Copy from `sourcewise-frontend/src/store/authStore.js` → `.ts`
- Add TypeScript types for `User`, `AuthState`
- Keep `hydrateFromToken` logic identical
- Persist to `sourcewise-dashboard-auth` localStorage key

**Interfaces:**
- Produces: `useAuthStore` with `login`, `logout`, `hydrateFromToken`, `accessToken`, `user`, `isAuthenticated`

### Task 6: Migrate Admin API & Store

**Files:**
- `sourcewise-dashboard/src/lib/adminApi.ts` (JS → TS)
- `sourcewise-dashboard/src/store/adminStore.ts` (JS → TS)

**Migration:** Copy from main app, add TS types:
- `AdminStats`, `AdminUser`, `UsageTimeseries`, `ProviderHealth`, `PricingRow`
- Keep all endpoint logic identical

**Interfaces:**
- Consumes: `useAuthStore` for token
- Produces: Typed API client + Zustand store

---

## Phase 5: Login Page & Routing (Day 3-4)

### Task 7: Create Login Page

**File:** `sourcewise-dashboard/src/pages/LoginPage.tsx`

**Options (choose one):**
- **A:** Copy main app's `LoginPage.jsx` → `.tsx`, update imports
- **B:** Minimal dedicated login (email/password → calls `/auth/login` → stores token → redirects to `/`)

**Recommended:** Option B — leaner, dashboard-focused, same auth endpoint.

**Interfaces:**
- Consumes: `useAuthStore.login`, `adminApi` (for validation)
- Produces: Login form with email/password, error handling, redirect on success

### Task 8: Add Auth Guard & Router

**Already covered in App.tsx (Phase 1 Step 6)**

---

## Phase 6: Local Dev Infrastructure (Day 4)

### Task 9: Docker & Docker Compose

**Files:**
- Create: `sourcewise-dashboard/Dockerfile`
- Create: `sourcewise-dashboard/docker-compose.yml`

**Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5174
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5174"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  dashboard:
    build: .
    ports:
      - "5174:5174"
    environment:
      - VITE_API_URL=http://node-api:4000
    depends_on:
      node-api:
        condition: service_healthy
  node-api:
    build: ../sourcewise-backend/node-api
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
      - JWT_SECRET=dev-secret
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Task 10: GitHub Actions CI/CD

**Files:**
- Create: `sourcewise-dashboard/.github/workflows/dashboard.yml`
- Create: `sourcewise-dashboard/.github/workflows/deploy.yml`

**dashboard.yml (CI):**
```yaml
name: Dashboard CI
on:
  push:
    paths:
      - 'sourcewise-dashboard/**'
  pull_request:
    paths:
      - 'sourcewise-dashboard/**'
jobs:
  lint-build-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: sourcewise-dashboard
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: sourcewise-dashboard/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm run test
```

**deploy.yml (CD):**
```yaml
name: Dashboard Deploy
on:
  push:
    branches: [main]
    paths:
      - 'sourcewise-dashboard/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Add your deploy steps (Vercel, Railway, Fly.io, AWS ECS, etc.)
```

---

## Phase 7: Verification & Cleanup (Day 4-5)

### Task 11: Verify Build, Lint, Tests

- [ ] Run `npm run lint` in dashboard app
- [ ] Run `npm run build` — verify dist output
- [ ] Run `npm run test` (add basic vitest setup + 1-2 smoke tests)
- [ ] Run `docker compose up --build` — verify full stack starts

### Task 12: Update Main App (Optional Cleanup)

**Files to potentially remove from main app after verification:**
- `sourcewise-frontend/src/pages/admin/` (6 pages)
- `sourcewise-frontend/src/components/admin/`
- `sourcewise-frontend/src/lib/adminApi.js`
- `sourcewise-frontend/src/store/adminStore.js`
- `sourcewise-frontend/src/components/ui/*` (if dashboard copies them)

**Keep in main app:**
- `AdminLayout` → if main app still needs admin routes
- `adminStore` / `adminApi` → if main app still calls `/admin` endpoints

**Decision point:** Do you want to **completely remove** admin from main app, or **keep both** during transition?

---

## Implementation Order Summary

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| 1 | 1-2 | Running Vite app with design system |
| 2 | 3-4 | All 6 admin pages migrated + layout |
| 3 | 5-7 | Auth + API + Login working |
| 4 | 8-10 | Docker + CI/CD + local stack |
| 5 | 11-12 | Verified build, optional main app cleanup |

---

## Open Decisions (Need Your Input)

1. **Complete removal vs. parallel?** Remove admin from main app entirely, or keep both during transition?
2. **Login page:** Copy main app's LoginPage, or minimal dedicated dashboard login?
3. **Deployment target:** Where does dashboard deploy? (Vercel, Railway, Fly.io, AWS ECS, Kubernetes?)
4. **Domain:** `dashboard.sourcewise.com` or separate `sourcewise-dashboard.com`?
5. **Shared component library:** Should we extract `ui/` primitives to a shared `packages/ui` in monorepo, or duplicate?

---

**Plan complete.** Once you confirm decisions above, we can proceed to implementation.