
import { Project, Asset, User } from '../types';
import { storage } from '../utils/storage';

// Hybrid API Service
class APIService {
  private useServer = false;
  private serverUrl = ''; // Relative path relies on same-origin

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkServer();
    }
  }

  // Quick check with timeout to prevent app hanging
  async checkServer() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
      
      const res = await fetch('/api/projects', { 
        method: 'HEAD',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      this.useServer = res.ok;
    } catch (e) {
      this.useServer = false;
      console.warn('Backend unavailable, switching to Offline Mode');
    }
  }
  
  async login(email: string): Promise<User> {
    if (this.useServer) {
       try {
         const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
         });
         if (res.ok) return await res.json();
       } catch(e) {}
    }
    
    // Fallback Mock
    return {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: email.split('@')[0],
      email,
      role: 'ADMIN',
      plan: 'PRO'
    };
  }

  async getProjects(): Promise<Project[]> {
    if (this.useServer) {
      try {
        const res = await fetch(`/api/projects`);
        if (res.ok) return await res.json();
      } catch (e) { console.warn('API Failed', e); }
    }
    
    const stored = await storage.getItem('adhvyk-projects');
    return stored ? JSON.parse(stored) : [];
  }

  async getProjectById(id: string): Promise<Project | null> {
    // 1. Check SSR Injected Data first (Fastest)
    if (typeof window !== 'undefined' && (window as any).__INITIAL_PROJECT__) {
      const initial = (window as any).__INITIAL_PROJECT__;
      if (initial.id === id) {
        return initial;
      }
    }

    // 2. Check Server
    if (this.useServer) {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) return await res.json();
      } catch (e) { /* ignore */ }
    }
    
    // 3. Check Local Async Storage
    const stored = await storage.getItem('adhvyk-projects');
    const projects = stored ? JSON.parse(stored) : [];
    return projects.find((p: Project) => p.id === id) || null;
  }

  async saveProject(project: Project): Promise<Project> {
    // Optimistic UI: Update Local Cache immediately
    const projects = await this.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) projects[index] = project;
    else projects.unshift(project);
    
    await storage.setItem('adhvyk-projects', JSON.stringify(projects));

    // Then try server sync
    if (this.useServer) {
      try {
        await fetch(`/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project)
        });
      } catch (e) { console.warn('Save to server failed', e); }
    }
    
    return project;
  }

  async uploadAsset(file: File): Promise<Asset> {
    if (this.useServer) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`/api/upload`, { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          return {
            id: 'ast_' + Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : 'MODEL',
            url: data.url, // Server URL
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
          };
        }
      } catch (e) { console.warn('Server upload failed', e); }
    }

    // Fallback: Base64
    const base64 = await new Promise<string>((resolve) => {
       const reader = new FileReader();
       reader.onloadend = () => resolve(reader.result as string);
       reader.readAsDataURL(file);
    });

    return {
      id: 'ast_' + Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : 'MODEL',
      url: base64,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB (Local)'
    };
  }

  async packageProjectForPortableUrl(project: Project): Promise<string> {
    // Clone to avoid mutating state
    const clone = JSON.parse(JSON.stringify(project));
    
    // Helper to convert URL to Base64 if needed
    const processUrl = async (url: string): Promise<string> => {
       if (!url) return url;
       // If it's a server upload, we might need to fetch it to make it portable
       // BUT for efficiency, we assume portable URLs use Base64 or public URLs
       if (url.startsWith('blob:')) {
          try {
             const res = await fetch(url);
             const blob = await res.blob();
             return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
             });
          } catch(e) { return url; }
       }
       return url;
    };

    // Convert all assets
    for (const obj of clone.sceneObjects) {
      if (obj.assetUrl) obj.assetUrl = await processUrl(obj.assetUrl);
    }
    if (clone.targetImage) clone.targetImage = await processUrl(clone.targetImage);

    return btoa(JSON.stringify(clone));
  }
}

export const api = new APIService();
