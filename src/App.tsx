import { useEffect, useState, lazy, Suspense } from 'react';
import FloatingIcon from './pages/FloatingIcon';

const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  const [currentPath, setCurrentPath] = useState<string>('/');

  useEffect(() => {
    const path = window.location.pathname;
    setCurrentPath(path);

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderPage = () => {
    switch (currentPath) {
      case '/':
      case '/main':
      case '/dashboard':
        return (
          <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>}>
            <Dashboard />
          </Suspense>
        );
      case '/floater':
        return <FloatingIcon />;
      default:
        return (
          <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>}>
            <Dashboard />
          </Suspense>
        );
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      {renderPage()}
    </div>
  );
}

export default App;