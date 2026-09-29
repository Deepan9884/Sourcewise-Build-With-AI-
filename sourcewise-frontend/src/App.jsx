import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/AppRouter';
import { useAuthStore } from './store/authStore';

function App() {
  const hydrateFromToken = useAuthStore((s) => s.hydrateFromToken);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    hydrateFromToken();
  }, []);

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #FFF8DC 0%, #F5E6C8 50%, #FAEBD7 100%)' }}>
        <div className="w-8 h-8 border-3 border-amber-warm/30 border-t-amber-warm rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RouterProvider router={router} />
  );
}

export default App;
