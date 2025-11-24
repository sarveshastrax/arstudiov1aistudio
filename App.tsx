import React, { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Installer } from './components/Installer';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { Viewer } from './components/Viewer';
import { api } from './services/api';
import { Layout, Menu, Settings, LogOut, Code, User as UserIcon, Loader2, AlertTriangle } from 'lucide-react';
import { Project } from './types';

// --- GLOBAL ERROR BOUNDARY ---
class GlobalErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  state: {hasError: boolean, error: Error | null} = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: any) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="text-red-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-neutral-400 mb-6 max-w-md">The application encountered a critical error. This is likely due to a network issue or a missing resource.</p>
          <div className="bg-neutral-900 p-4 rounded text-left text-xs font-mono text-red-300 mb-6 w-full max-w-lg overflow-auto">
            {this.state.error?.toString()}
          </div>
          <button onClick={() => window.location.reload()} className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-neutral-200">
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Sidebar component
const Sidebar = () => {
  const { logout, currentUser } = useStore();
  
  return (
    <div className="w-64 bg-surface border-r border-border flex flex-col justify-between h-full">
      <div>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Code size={20} className="text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Adhvyk AR</span>
          </div>
        </div>
        
        <nav className="px-4 space-y-1">
          <NavItem icon={<Layout size={20} />} label="Dashboard" active />
          <NavItem icon={<Code size={20} />} label="Experiences" />
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
            <UserIcon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{currentUser?.name || 'Admin User'}</div>
            <div className="text-xs text-neutral-500 truncate">Pro Plan</div>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-2 text-neutral-400 hover:text-white hover:bg-neutral-800 px-3 py-2 rounded transition-colors text-sm"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${active ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white hover:bg-neutral-800/50'}`}>
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const AppContent: React.FC = () => {
  const { isInstalled, currentUser, currentProject, login, _hasHydrated, setHasHydrated } = useStore();
  const [viewerMode, setViewerMode] = useState<{ active: boolean; projectId?: string; projectData?: Project } | null>(null);

  // Safety: Force hydration if it hangs
  useEffect(() => {
    if (!_hasHydrated) {
      const timer = setTimeout(() => {
        console.warn("Forcing hydration due to timeout");
        setHasHydrated(true);
      }, 500); // 0.5s timeout
      return () => clearTimeout(timer);
    }
  }, [_hasHydrated, setHasHydrated]);

  // Initial Route Check
  useEffect(() => {
    const checkRoute = async () => {
      // 1. Path Routing (Standard URL) -> /v/project_id
      const path = window.location.pathname;
      if (path.startsWith('/v/')) {
        const id = path.split('/v/')[1];
        if ((window as any).__INITIAL_PROJECT__ && (window as any).__INITIAL_PROJECT__.id === id) {
           setViewerMode({ active: true, projectData: (window as any).__INITIAL_PROJECT__ });
           return;
        }

        try {
           const project = await api.getProjectById(id);
           if (project) {
             setViewerMode({ active: true, projectData: project });
           } else {
             setViewerMode({ active: true, projectId: id });
           }
        } catch {
           setViewerMode({ active: true, projectId: id });
        }
        return;
      }

      // 2. Hash Routing (Legacy/Static)
      const hash = window.location.hash;
      if (hash.startsWith('#/v?')) {
        try {
          const queryString = hash.split('?')[1];
          const params = new URLSearchParams(queryString);
          const payload = params.get('p');
          if (payload) {
             const jsonString = atob(payload);
             const projectData = JSON.parse(jsonString);
             setViewerMode({ active: true, projectData });
             return;
          }
        } catch (e) {}
      }
      
      if (hash.startsWith('#/v/')) {
        const id = hash.split('#/v/')[1];
        if (id) {
          setViewerMode({ active: true, projectId: id });
          return;
        }
      }
    };
    
    checkRoute();
    
    const handleHashChange = () => checkRoute();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (viewerMode?.active) {
    return <Viewer projectId={viewerMode.projectId} projectData={viewerMode.projectData} />;
  }

  // WAIT FOR HYDRATION (IndexedDB loading)
  if (!_hasHydrated) {
    return (
       <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-neutral-500">
         <Loader2 className="animate-spin text-white" size={32} />
         <span className="text-xs uppercase tracking-widest">Initializing Studio...</span>
       </div>
    );
  }

  // 1. Installer Check
  if (!isInstalled) {
    return <Installer />;
  }

  // 2. Auth Check
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-full max-w-md bg-surface border border-border p-8 rounded-xl shadow-2xl">
           <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <Code size={28} className="text-black" />
              </div>
           </div>
           <h2 className="text-2xl font-bold text-white mb-2 text-center">Welcome Back</h2>
           <p className="text-neutral-400 text-center mb-8 text-sm">Sign in to access your AR Studio dashboard.</p>
           
           <button 
             onClick={async () => {
                const user = await api.login('admin@adhvyk.com');
                login(user);
             }}
             className="w-full bg-white text-black font-bold py-3 rounded hover:bg-neutral-200 transition-colors"
           >
             Continue as Admin
           </button>
        </div>
      </div>
    );
  }

  // 3. Editor View
  if (currentProject) {
    return <Editor />;
  }

  // 4. Default Dashboard View
  return (
    <div className="flex h-screen bg-background text-white font-sans selection:bg-white selection:text-black">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Dashboard />
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <GlobalErrorBoundary>
    <AppContent />
  </GlobalErrorBoundary>
);

export default App;