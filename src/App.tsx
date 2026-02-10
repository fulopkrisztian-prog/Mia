import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import FloatingIcon from './pages/FloatingIcon';

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
        return <Dashboard />;
      case '/floater':
        return <FloatingIcon />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      {renderPage()}
    </div>
  );
}

export default App;