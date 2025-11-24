
import { Project, Asset, User } from '../types';

// Hybrid API Service
// 1. Tries to communicate with the real server (server.js)
// 2. Falls back to LocalStorage/Base64 if server is unreachable (Offline/Demo mode)

class APIService {
  private useServer = true; // Default to trying server
  private serverUrl = '';   // Relative path (same origin)

  constructor() {
    // Check connectivity on init
    this.checkServer();
  }

  async checkServer() {
    try {
      const res = await fetch('/api/projects');
      this.useServer = res.ok;
    } catch (e) {
      this.useServer = false;
      console.log('Server unreachable, switching to Local Mode.');
    }
  }
  
  // --- Auth ---
  async login(email: string): Promise<User> {
    // Mock Auth for now (or implement real auth in server.js)
    return {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: email.split('@')[0],
      email,
      role: 'ADMIN',
      plan: 'PRO'
    };
  }

  // --- Projects ---
  async getProjects(): Promise<Project[]> {
    if (this.useServer) {
      try {
        const res = await fetch(`${this.serverUrl}/api/projects`);
        if (res.ok) return await res.json();
      } catch (e) { console.warn('API Failed', e); }
    }
    
    // Fallback
    const stored = localStorage.getItem('adhvyk-projects');
    return stored ? JSON.parse(stored) : [];
  }

  async getProjectById(id: string): Promise<Project | null> {
    if (this.useServer) {
      try {
        const res = await fetch(`${this.serverUrl}/api/projects/${id}`);
        if (res.ok) return await res.json();
      } catch (e) { /* ignore */ }
    }
    
    // Fallback
    const stored = localStorage.getItem('adhvyk-projects');
    const projects = stored ? JSON.parse(stored) : [];
    return projects.find((p: Project) => p.id === id) || null;
  }

  async saveProject(project: Project): Promise<Project> {
    if (this.useServer) {
      try {
        const res = await fetch(`${this.serverUrl}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project)
        });
        if (res.ok) return await res.json();
      } catch (e) { console.warn('Save Failed', e); }
    }
    
    // Fallback
    const projects = await this.getProjects(); // Gets local if server failed
    const index = projects.findIndex(p => p.id === project.id);
    
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.unshift(project);
    }
    
    localStorage.setItem('adhvyk-projects', JSON.stringify(projects));
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    // Implement delete if needed
    const projects = await this.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem('adhvyk-projects', JSON.stringify(filtered));
  }

  // --- Assets ---
  async uploadAsset(file: File): Promise<Asset> {
    // 1. Try Server Upload (Real Persistence)
    if (this.useServer) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`${this.serverUrl}/api/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (res.ok) {
          const data = await res.json();
          return {
            id: 'ast_' + Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : 'MODEL',
            url: data.url, // Returns /uploads/filename.ext
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
          };
        }
      } catch (e) {
        console.warn('Server upload failed, falling back to local.', e);
      }
    }

    // 2. Fallback: Convert to Base64 (Local Persistence)
    // We do NOT use createObjectURL because it expires on reload.
    // Base64 persists in localStorage (until quota hit).
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

  // --- Helper: Portable URL ---
  async packageProjectForPortableUrl(project: Project): Promise<string> {
    // Only used if server is offline or user explicitly wants a portable link
    const clone = JSON.parse(JSON.stringify(project));

    const blobToBase64 = async (url: string): Promise<string> => {
      if (!url) return '';
      // If it's already a server URL or Base64, leave it
      if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/uploads')) return url;
      
      if (url.startsWith('blob:')) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return url;
        }
      }
      return url;
    };

    // Ensure everything is accessible
    for (const obj of clone.sceneObjects) {
      if (obj.assetUrl) obj.assetUrl = await blobToBase64(obj.assetUrl);
    }
    if (clone.targetImage) clone.targetImage = await blobToBase64(clone.targetImage);

    return btoa(JSON.stringify(clone));
  }
}

export const api = new APIService();
