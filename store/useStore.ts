import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Project, User, InstallConfig, SceneObject, Asset } from '../types';
import { api } from '../services/api';
import { storage } from '../utils/storage';

// Initial Mock Data
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'demo_1',
    name: 'Retail Shoe Demo',
    type: 'WORLD_TRACKING',
    thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
    status: 'PUBLISHED',
    views: 1240,
    lastModified: '2 mins ago',
    sceneObjects: []
  }
];

const INITIAL_ASSETS: Asset[] = [
  { id: 'a1', name: 'Demo Cube', type: 'MODEL', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb', size: '0.1MB' },
];

interface AppState {
  // System State
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  isInstalled: boolean;
  installConfig: InstallConfig;
  setInstalled: (status: boolean) => void;

  // Auth State
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;

  // Project State
  projects: Project[];
  currentProject: Project | null;
  createProject: (name: string, type: string) => void;
  openProject: (id: string) => void;
  closeProject: () => void;
  setProjectTargetImage: (url: string) => void;
  updateProjectSettings: (settings: Partial<Project>) => void;
  saveCurrentProject: () => Promise<void>;

  // UI State
  isPreviewOpen: boolean;
  isPublishOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  setPublishOpen: (open: boolean) => void;

  // Editor State
  selectedObjectId: string | null;
  transformMode: 'translate' | 'rotate' | 'scale';
  selectObject: (id: string | null) => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  addObject: (obj: SceneObject) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  removeObject: (id: string) => void;
  
  // Asset State
  assets: Asset[];
  addAsset: (asset: Asset) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // System
      isInstalled: false, 
      installConfig: {
        dbConnected: false,
        adminCreated: false,
        licenseValid: false,
        siteName: 'Adhvyk AR Studio'
      },
      setInstalled: (status) => set({ isInstalled: status }),

      // Auth
      currentUser: null,
      login: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),

      // Projects
      projects: INITIAL_PROJECTS,
      currentProject: null,
      
      createProject: (name, type) => set((state) => {
        const newProject: Project = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          type: type as any,
          thumbnail: `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 100)}`,
          status: 'DRAFT',
          views: 0,
          lastModified: 'Just now',
          sceneObjects: []
        };
        // Async save to "Backend"
        api.saveProject(newProject);
        return { projects: [newProject, ...state.projects] };
      }),

      openProject: (id) => set((state) => ({ 
        currentProject: state.projects.find(p => p.id === id) || null,
        selectedObjectId: null,
        isPreviewOpen: false,
        isPublishOpen: false
      })),

      closeProject: () => {
         get().saveCurrentProject();
         set({ currentProject: null });
      },

      saveCurrentProject: async () => {
         const { currentProject, projects } = get();
         if (!currentProject) return;
         
         const updatedProject = {
             ...currentProject,
             lastModified: 'Just now'
         };
         
         set({
             projects: projects.map(p => p.id === updatedProject.id ? updatedProject : p)
         });

         await api.saveProject(updatedProject);
      },
      
      setProjectTargetImage: (url) => set((state) => {
        if (!state.currentProject) return {};
        const updatedProject = { ...state.currentProject, targetImage: url };
        return {
          currentProject: updatedProject,
          projects: state.projects.map(p => p.id === updatedProject.id ? updatedProject : p)
        };
      }),

      updateProjectSettings: (settings) => set((state) => {
        if (!state.currentProject) return {};
        const updatedProject = { ...state.currentProject, ...settings };
        return {
          currentProject: updatedProject,
          projects: state.projects.map(p => p.id === updatedProject.id ? updatedProject : p)
        };
      }),

      // UI
      isPreviewOpen: false,
      isPublishOpen: false,
      setPreviewOpen: (open) => set({ isPreviewOpen: open }),
      setPublishOpen: (open) => set({ isPublishOpen: open }),

      // Editor
      selectedObjectId: null,
      transformMode: 'translate',
      selectObject: (id) => set({ selectedObjectId: id }),
      setTransformMode: (mode) => set({ transformMode: mode }),
      addObject: (obj) => set((state) => {
        if (!state.currentProject) return {};
        const updatedProject = {
          ...state.currentProject,
          sceneObjects: [...state.currentProject.sceneObjects, obj]
        };
        return {
          currentProject: updatedProject,
          selectedObjectId: obj.id,
          projects: state.projects.map(p => p.id === updatedProject.id ? updatedProject : p)
        };
      }),
      updateObject: (id, updates) => set((state) => {
        if (!state.currentProject) return {};
        const updatedObjects = state.currentProject.sceneObjects.map(obj => 
          obj.id === id ? { ...obj, ...updates } : obj
        );
        const updatedProject = { ...state.currentProject, sceneObjects: updatedObjects };
        return {
          currentProject: updatedProject,
          projects: state.projects.map(p => p.id === updatedProject.id ? updatedProject : p)
        };
      }),
      removeObject: (id) => set((state) => {
        if (!state.currentProject) return {};
        const updatedObjects = state.currentProject.sceneObjects.filter(obj => obj.id !== id);
        const updatedProject = { ...state.currentProject, sceneObjects: updatedObjects };
        return {
          currentProject: updatedProject,
          selectedObjectId: null,
          projects: state.projects.map(p => p.id === updatedProject.id ? updatedProject : p)
        };
      }),

      // Assets
      assets: INITIAL_ASSETS,
      addAsset: (asset) => set((state) => ({ assets: [asset, ...state.assets] })),
    }),
    {
      name: 'adhvyk-ar-storage',
      storage: createJSONStorage(() => storage), // Use IndexedDB Wrapper
      partialize: (state) => ({
        isInstalled: state.isInstalled,
        currentUser: state.currentUser,
        projects: state.projects,
        assets: state.assets
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);