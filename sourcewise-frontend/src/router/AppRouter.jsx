import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';

// Lazy-loaded pages for code splitting
const LandingPage = lazy(() => import('../pages/LandingPage'));
const SignupPage = lazy(() => import('../pages/SignupPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const SourcesPage = lazy(() => import('../pages/SourcesPage'));
const AIWorkspacePage = lazy(() => import('../pages/AIWorkspacePage'));
const PlannerPage = lazy(() => import('../pages/PlannerPage'));
const PlannerPageV2 = lazy(() => import('../pages/PlannerPageV2'));
const ProgressCenterPage = lazy(() => import('../pages/ProgressCenterPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const PlanHomePage = lazy(() => import('../pages/PlanHomePage'));
const KnowledgeHubPage = lazy(() => import('../pages/KnowledgeHubPage'));
const InsightsPage = lazy(() => import('../pages/InsightsPage'));
const PuzzleArenePage = lazy(() => import('../pages/PuzzleArenePage'));
const EventsPage = lazy(() => import('../pages/EventsPage'));
const DeepCodePage = lazy(() => import('../pages/DeepCodePage'));
const LearningPage = lazy(() => import('../pages/LearningPage'));
const AnalysisPage = lazy(() => import('../pages/AnalysisPage'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-warm"></div>
  </div>
);

// Suspense wrapper
const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SuspenseWrapper><LandingPage /></SuspenseWrapper>,
  },
  {
    path: '/signup',
    element: <SuspenseWrapper><SignupPage /></SuspenseWrapper>,
  },
  {
    path: '/login',
    element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
  },
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper>,
      },
      {
        path: '/sources',
        element: <SuspenseWrapper><SourcesPage /></SuspenseWrapper>,
      },
      {
        path: '/knowledge',
        element: <SuspenseWrapper><KnowledgeHubPage /></SuspenseWrapper>,
      },
      {
        path: '/learning',
        element: <SuspenseWrapper><LearningPage /></SuspenseWrapper>,
      },
      {
        path: '/insights',
        element: <SuspenseWrapper><PlanHomePage /></SuspenseWrapper>,
      },
      {
        path: '/workspace',
        element: <SuspenseWrapper><AIWorkspacePage /></SuspenseWrapper>,
      },
      {
        path: '/workspace/:mode',
        element: <SuspenseWrapper><AIWorkspacePage /></SuspenseWrapper>,
      },
      {
        path: '/planner',
        element: <SuspenseWrapper><PlanHomePage /></SuspenseWrapper>,
      },
      {
        path: '/plan',
        element: <SuspenseWrapper><PlanHomePage /></SuspenseWrapper>,
      },
      {
        path: '/plan/:planId',
        element: <SuspenseWrapper><PlanHomePage /></SuspenseWrapper>,
      },
      {
        path: '/planner-v2',
        element: <SuspenseWrapper><PlanHomePage /></SuspenseWrapper>,
      },
      {
        path: '/study-plans/:id',
        element: <SuspenseWrapper><PlanHomePage /></SuspenseWrapper>,
      },
      {
        path: '/progress',
        element: <SuspenseWrapper><ProgressCenterPage /></SuspenseWrapper>,
      },
      {
        path: '/events',
        element: <SuspenseWrapper><EventsPage /></SuspenseWrapper>,
      },
      {
        path: '/arena',
        element: <SuspenseWrapper><EventsPage /></SuspenseWrapper>,
      },
      {
        path: '/puzzles',
        element: <SuspenseWrapper><PuzzleArenePage /></SuspenseWrapper>,
      },
      {
        path: '/puzzles/:type',
        element: <SuspenseWrapper><PuzzleArenePage /></SuspenseWrapper>,
      },
      {
        path: '/deepcode',
        element: <SuspenseWrapper><DeepCodePage /></SuspenseWrapper>,
      },
      {
        path: '/compiler',
        element: <SuspenseWrapper><DeepCodePage /></SuspenseWrapper>,
      },
      {
        path: '/settings',
        element: <SuspenseWrapper><SettingsPage /></SuspenseWrapper>,
      },
      {
        path: '/analysis',
        element: <SuspenseWrapper><AnalysisPage /></SuspenseWrapper>,
      },
    ],
  },
  {
    path: '*',
    element: <div className="p-8 text-center"><h1 className="text-2xl font-bold">404 Not Found</h1></div>,
  }
]);
