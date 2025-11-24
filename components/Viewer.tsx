import React, { Suspense, useMemo, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Gltf, Image as DreiImage, Text } from '@react-three/drei';
import { useStore } from '../store/useStore';
import * as THREE from 'three';
import { Play, AlertCircle, AlertTriangle } from 'lucide-react';
import { SceneObject, Project } from '../types';

// Error Boundary specifically for the Viewer Scene to prevent whole-app crash
class SceneErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <mesh>
           <boxGeometry args={[1, 1, 1]} />
           <meshStandardMaterial color="red" wireframe />
           <Text position={[0, 1.2, 0]} fontSize={0.2} color="red">Scene Error</Text>
        </mesh>
      );
    }
    return this.props.children;
  }
}

const ViewerObject: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  return (
    <group
      position={new THREE.Vector3(...obj.transform.position)}
      rotation={new THREE.Euler(...obj.transform.rotation)}
      scale={new THREE.Vector3(...obj.transform.scale)}
    >
        <Suspense fallback={<mesh><boxGeometry args={[0.5,0.5,0.5]} /><meshBasicMaterial color="#333" wireframe /></mesh>}>
          {obj.type === 'model' && obj.assetUrl ? (
              <Gltf src={obj.assetUrl} onError={(e) => console.error("Failed to load model", e)} />
          ) : obj.type === 'image' && obj.assetUrl ? (
               <DreiImage url={obj.assetUrl} transparent side={THREE.DoubleSide} />
          ) : obj.type === 'video' ? (
             <mesh>
                <planeGeometry args={[1.6, 0.9]} />
                <meshStandardMaterial color="black" />
                <Text position={[0,0,0.1]} fontSize={0.1} color="white" anchorX="center" anchorY="middle">Video</Text>
             </mesh>
          ) : obj.type === 'text' ? (
             <Text fontSize={0.5} color="white" anchorX="center" anchorY="middle">
               {obj.content || '3D Text'}
             </Text>
          ) : (
            <mesh>
              <boxGeometry />
              <meshStandardMaterial color="#808080" />
            </mesh>
          )}
        </Suspense>
    </group>
  );
};

interface ViewerProps {
  projectId?: string;
  projectData?: Project;
}

export const Viewer: React.FC<ViewerProps> = ({ projectId, projectData }) => {
  const { projects } = useStore();
  
  const { project, isFallback } = useMemo(() => {
    if (projectData) return { project: projectData, isFallback: false };
    
    if (projectId) {
      const found = projects.find(p => p.id === projectId);
      if (found) return { project: found, isFallback: false };
    }
    
    // Fallback
    return { project: projects[0], isFallback: true };
  }, [projects, projectId, projectData]);

  if (!project) return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
         <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
         <span className="text-sm text-neutral-400">Loading AR Experience...</span>
      </div>
  );

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Overlay UI */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div>
            <h1 className="text-white font-bold text-xl drop-shadow-md tracking-tight">{project.name}</h1>
            <p className="text-white/70 text-xs drop-shadow-md uppercase tracking-wider mt-1">Powered by Adhvyk AR</p>
        </div>
        <div className="pointer-events-auto">
             <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-xs text-white font-medium flex items-center gap-2 shadow-xl">
                <Play size={12} className="fill-white" /> Live Preview
             </div>
        </div>
      </div>

      {/* Fallback Warning */}
      {isFallback && (
          <div className="absolute bottom-10 left-4 right-4 z-20 pointer-events-none flex justify-center">
            <div className="bg-neutral-900/90 backdrop-blur border border-neutral-800 text-white px-4 py-3 rounded-xl shadow-2xl max-w-sm flex items-center gap-3">
               <div className="bg-yellow-500/20 p-2 rounded-full text-yellow-500">
                 <AlertCircle size={20} />
               </div>
               <div>
                 <p className="font-bold text-sm">Demo Mode</p>
                 <p className="text-xs text-neutral-400">Original project data not found. Showing demo.</p>
               </div>
            </div>
          </div>
      )}

      {/* AR/3D Scene */}
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 50 }}>
         <color attach="background" args={['#050505']} />
         <ambientLight intensity={0.7} />
         <directionalLight position={[5, 10, 7]} intensity={1.5} castShadow />
         <Environment preset="city" />
         
         <SceneErrorBoundary>
            {project.sceneObjects.map((obj) => (
                <ViewerObject key={obj.id} obj={obj} />
            ))}
         </SceneErrorBoundary>

         <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={20} blur={2.5} far={4} />
         <OrbitControls makeDefault autoRotate={false} minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
      </Canvas>
    </div>
  );
};