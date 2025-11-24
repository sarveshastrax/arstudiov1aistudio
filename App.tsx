
import React, { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Installer } from './components/Installer';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { Viewer } from './components/Viewer';
import { api } from './services/api';
import { Layout, Menu, Settings, LogOut, Code, User as UserIcon } from 'lucide-react';
import { Project } from './types';

// Sidebar component extracted here for App layout
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

const App: React.FC = () => {
  const { isInstalled, currentUser, currentProject, login } = useStore();
  const [viewerMode, setViewerMode] = useState<{ active: boolean; projectId?: string; projectData?: Project } | null>(null);

  // Initial Route Check
  useEffect(() => {
    const checkRoute = async () => {
      // 1. Path Routing (Standard URL) -> /v/project_id
      const path = window.location.pathname;
      if (path.startsWith('/v/')) {
        const id = path.split('/v/')[1];
        // If we have a server, try to fetch the project data immediately
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

      // 2. Hash Routing (Legacy/Static) -> #/v?p=...
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

  // 0. Public Viewer Route
  if (viewerMode?.active) {
    return <Viewer projectId={viewerMode.projectId} projectData={viewerMode.projectData} />;
  }

  // 1. Installer Check
  if (!isInstalled) {
    return <Installer />;
  }

  // 2. Auth Check
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-full max-w-md bg-surface border border-border p-8 rounded-xl">
           <h2 className="text-2xl font-bold text-white mb-6 text-center">Sign In</h2>
           <button 
             onClick={() => login({ id: '1', name: 'Sarvesh', email: 'admin@adhvyk.com', role: 'ADMIN', plan: 'PRO' })}
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

export default App;
