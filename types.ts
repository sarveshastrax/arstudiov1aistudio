export type ARType = 'IMAGE_TRACKING' | 'WORLD_TRACKING' | 'FACE_TRACKING' | 'GEO_LOCATION';

export type AssetType = 'MODEL' | 'IMAGE' | 'VIDEO' | 'AUDIO';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  thumbnail?: string;
  size: string;
}

export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface SceneObject {
  id: string;
  name: string;
  type: 'model' | 'image' | 'video' | 'text' | 'light';
  assetUrl?: string; // For models/images
  content?: string; // For text
  transform: Transform;
  properties: Record<string, any>;
  visible: boolean;
  locked: boolean;
}

export interface Project {
  id: string;
  name: string;
  type: ARType;
  thumbnail: string;
  status: 'DRAFT' | 'PUBLISHED';
  views: number;
  lastModified: string;
  sceneObjects: SceneObject[];
  targetImage?: string; // URL for the marker/target image
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
}

export interface InstallConfig {
  dbConnected: boolean;
  adminCreated: boolean;
  licenseValid: boolean;
  siteName: string;
}