import React, { Component, Suspense, useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid, Environment, ContactShadows, Gltf, Image as DreiImage, Text } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { 
  ChevronLeft, Box, Image as ImageIcon, Video, Type, 
  Move, RotateCcw, Scaling, Layers, MonitorSmartphone, Download, Upload, FileBox, AlertTriangle, Settings, QrCode, X, Check, Smartphone, Trash2
} from 'lucide-react';
import { SceneObject, Asset, ARType } from '../types';
import * as THREE from 'three';

// --- Error Boundary for 3D Assets ---
interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// --- Modals ---

const PreviewModal: React.FC = () => {
  const { setPreviewOpen, currentProject } = useStore();
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      if (!currentProject) return;
      setLoading(true);
      
      // Determine best URL Type (Portable vs Server)
      // Check if we can save to server first
      try {
        await api.saveProject(currentProject);
        
        // If save was successful on server, use clean path
        // We verify crudely by checking if api uses server
        // In a real app, saveProject should return where it saved
        
        // Default to portable for preview to ensure immediate update without caching issues
        const payload = await api.packageProjectForPortableUrl(currentProject);
        const host = window.location.host; 
        const protocol = window.location.protocol;
        setPreviewUrl(`${protocol}//${host}/#/v?p=${payload}`);
      } catch (e) {
        // Fallback
        const payload = await api.packageProjectForPortableUrl(currentProject);
        const host = window.location.host; 
        const protocol = window.location.protocol;
        setPreviewUrl(`${protocol}//${host}/#/v?p=${payload}`);
      }
      
      setLoading(false);
    };
    generate();
  }, [currentProject]);
  
  return (
    <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex justify-between items-center bg-surfaceHighlight/30">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="text-emerald-400" size={20} />
            <h2 className="font-semibold text-white">Experience Preview</h2>
          </div>
          <button onClick={() => setPreviewOpen(false)} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 flex flex-col items-center justify-center flex-1 space-y-6">
          {loading ? (
             <div className="flex flex-col items-center gap-3">
               <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
               <span className="text-sm text-neutral-400">Packaging Assets...</span>
             </div>
          ) : (
             <>
              <div className="w-64 h-64 bg-white p-2 rounded-xl">
                 <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(previewUrl)}`} alt="QR Code" className="w-full h-full" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-medium text-white">Scan to Test on Device</h3>
                <p className="text-neutral-400 max-w-sm">
                  Use your mobile camera to scan this QR code.
                </p>
                {previewUrl.length > 5000 && (
                   <div className="flex items-center gap-2 text-yellow-500 bg-yellow-950/30 px-3 py-1 rounded text-xs justify-center max-w-md mx-auto">
                      <AlertTriangle size={12} />
                      <span>Large Project. Loading may be slow.</span>
                   </div>
                )}
              </div>
              <div className="flex gap-4 w-full justify-center">
                 <div className="flex flex-col items-center gap-2 text-neutral-500 text-xs">
                    <Smartphone size={24} />
                    <span>iOS / Android</span>
                 </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const PublishModal: React.FC = () => {
  const { setPublishOpen, currentProject } = useStore();
  const [step, setStep] = useState('confirm'); // confirm, publishing, done
  const [publishUrl, setPublishUrl] = useState('');
  const [isServerUrl, setIsServerUrl] = useState(false);

  const handlePublish = async () => {
    if (!currentProject) return;
    setStep('publishing');
    
    try {
      await api.saveProject(currentProject);
      const host = window.location.host;
      const protocol = window.location.protocol;

      // Check if we are checking against a real server
      // We do this by checking if api thinks it's server mode
      // This is a heuristic for the UI
      const isServer = (api as any).useServer; 

      if (isServer) {
         // Generate Clean URL
         const url = `${protocol}//${host}/v/${currentProject.id}`;
         setPublishUrl(url);
         setIsServerUrl(true);
      } else {
         // Generate Portable URL
         const payload = await api.packageProjectForPortableUrl(currentProject);
         const url = `${protocol}//${host}/#/v?p=${payload}`;
         setPublishUrl(url);
         setIsServerUrl(false);
      }
      
      setStep('done');
    } catch (e) {
      console.error(e);
      setStep('confirm');
    }
  };

  return (
    <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        {step === 'confirm' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 text-white">
              <Download size={24} />
              <h2 className="text-xl font-semibold">Publish Experience</h2>
            </div>
            <p className="text-neutral-400">
              You are about to publish <strong>{currentProject?.name}</strong>.
            </p>
            <div className="flex gap-3 justify-end pt-4">
              <button onClick={() => setPublishOpen(false)} className="px-4 py-2 rounded text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors">Cancel</button>
              <button onClick={handlePublish} className="px-6 py-2 bg-white text-black font-medium rounded hover:bg-neutral-200 transition-colors">Publish Now</button>
            </div>
          </div>
        )}

        {step === 'publishing' && (
          <div className="p-10 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-neutral-700 border-t-white rounded-full animate-spin" />
            <p className="text-neutral-300">Syncing to Server & Generating Link...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="p-8 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
              <Check size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Published Successfully!</h2>
              <p className="text-neutral-400 text-sm">Your AR experience is live.</p>
            </div>
            <div className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 flex justify-between items-center gap-2">
              <span className="text-xs text-neutral-400 truncate flex-1 text-left">{publishUrl}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(publishUrl)}
                className="text-xs bg-neutral-800 px-3 py-1.5 rounded text-white hover:bg-neutral-700 shrink-0 font-medium"
              >
                Copy
              </button>
            </div>
            <button onClick={() => setPublishOpen(false)} className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-neutral-200">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


// --- Scene Components ---

const SceneContent: React.FC = () => {
  const { currentProject, selectedObjectId, selectObject, transformMode } = useStore();
  
  // Target Image Visualizer
  const targetImage = currentProject?.targetImage;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7]} intensity={1.5} castShadow shadow-bias={-0.0001} />
      <Environment preset="city" />
      
      {/* If Image Tracking, show visualizer */}
      {currentProject?.type === 'IMAGE_TRACKING' && (
        <group position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {targetImage ? (
            <Suspense fallback={<mesh><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#333" /></mesh>}>
              <DreiImage url={targetImage} scale={[2, 2]} opacity={0.5} transparent />
              <Text position={[0, 1.2, 0.1]} fontSize={0.1} color="white" anchorX="center" anchorY="bottom" rotation={[0, 0, 0]}>
                Target Image Reference
              </Text>
            </Suspense>
          ) : (
            <mesh>
              <planeGeometry args={[2, 2]} />
              <meshBasicMaterial color="#1a1a1a" wireframe />
            </mesh>
          )}
          {/* Target Overlay Indicator */}
          <mesh position={[0, 0, -0.01]}>
             <planeGeometry args={[2.2, 2.2]} />
             <meshBasicMaterial color="#2563eb" wireframe transparent opacity={0.3} />
          </mesh>
        </group>
      )}

      {/* Script-Style Infinite Grid */}
      <Grid 
        infiniteGrid 
        fadeDistance={50}
        sectionColor="#4a4a4a"
        cellColor="#2a2a2a"
        sectionThickness={1}
        cellThickness={0.5}
        position={[0, -0.01, 0]}
        userData={{ type: 'grid' }}
      />
      
      {currentProject?.sceneObjects.map((obj) => (
        <SceneObjectMesh 
          key={obj.id} 
          obj={obj} 
          isSelected={obj.id === selectedObjectId}
          transformMode={transformMode}
          onSelect={() => selectObject(obj.id)}
        />
      ))}
      
      <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={20} blur={2.5} far={4} />
    </>
  );
};

const AssetErrorFallback = () => (
  <mesh>
    <boxGeometry args={[0.5, 0.5, 0.5]} />
    <meshStandardMaterial color="red" wireframe />
    <Text position={[0, 0.6, 0]} fontSize={0.1} color="red">Asset Failed</Text>
  </mesh>
);

const SceneObjectMesh: React.FC<{
  obj: SceneObject;
  isSelected: boolean;
  transformMode: 'translate' | 'rotate' | 'scale';
  onSelect: () => void;
}> = ({ obj, isSelected, transformMode, onSelect }) => {
  const { updateObject } = useStore();
  const [group, setGroup] = useState<THREE.Group | null>(null);
  
  // We use a ref to track dragging status synchronously to avoid state update lag
  const isDraggingRef = useRef(false);

  // Sync ref with props ONLY when not dragging
  useLayoutEffect(() => {
    if (group && !isDraggingRef.current) {
      group.position.set(...obj.transform.position);
      group.rotation.set(...obj.transform.rotation);
      group.scale.set(...obj.transform.scale);
      group.updateMatrix(); 
      group.updateMatrixWorld(true);
    }
  }, [obj.transform, group]);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <>
      {isSelected && group && (
        <TransformControls 
          object={group} 
          mode={transformMode} 
          onMouseDown={() => {
            isDraggingRef.current = true;
          }}
          onMouseUp={() => {
            isDraggingRef.current = false;
            if (group) {
              const { position, rotation, scale } = group;
              updateObject(obj.id, {
                transform: {
                   position: [position.x, position.y, position.z],
                   rotation: [rotation.x, rotation.y, rotation.z],
                   scale: [scale.x, scale.y, scale.z]
                }
              });
            }
          }}
          onChange={(e) => {
             if (isDraggingRef.current && group) {
                const { position, rotation, scale } = group;
                updateObject(obj.id, {
                  transform: {
                     position: [position.x, position.y, position.z],
                     rotation: [rotation.x, rotation.y, rotation.z],
                     scale: [scale.x, scale.y, scale.z]
                  }
                });
             }
          }}
        />
      )}
      
      <group
        ref={setGroup}
        onClick={handlePointerDown}
      >
        <Suspense fallback={<mesh><boxGeometry args={[0.5, 0.5, 0.5]} /><meshBasicMaterial color="#333" wireframe /></mesh>}>
          <ErrorBoundary fallback={<AssetErrorFallback />}>
            {obj.type === 'model' && obj.assetUrl ? (
                <Gltf src={obj.assetUrl} />
            ) : obj.type === 'image' && obj.assetUrl ? (
                 <DreiImage url={obj.assetUrl} transparent side={THREE.DoubleSide} />
            ) : obj.type === 'video' ? (
               <mesh>
                  <planeGeometry args={[1.6, 0.9]} />
                  <meshStandardMaterial color="black" />
                  <Text position={[0,0,0.1]} fontSize={0.1}>Video Placeholder</Text>
               </mesh>
            ) : obj.type === 'text' ? (
               <Text fontSize={0.5} color="white" anchorX="center" anchorY="middle">
                 {obj.content || '3D Text'}
               </Text>
            ) : (
              <mesh>
                <boxGeometry />
                <meshStandardMaterial color={isSelected ? "#2563eb" : "#808080"} />
              </mesh>
            )}
            
            {isSelected && (
              <mesh>
                 <boxGeometry args={[1.05, 1.05, 1.05]} />
                 <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.3} />
              </mesh>
            )}
          </ErrorBoundary>
        </Suspense>
      </group>
    </>
  );
};

const AssetsPanel = () => {
  const { assets, addObject, addAsset, currentProject, setProjectTargetImage, updateProjectSettings } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetImageInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'assets' | 'config'>('assets');
  
  const handleAddPrimitive = (type: 'box' | 'text') => {
    addObject({
      id: Math.random().toString(36).substr(2, 9),
      name: type === 'box' ? 'Basic Shape' : 'New Text',
      type: type === 'box' ? 'model' : 'text',
      transform: { position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      properties: {},
      visible: true,
      locked: false,
      content: type === 'text' ? 'Adhvyk AR' : undefined
    });
  };

  const handleAddPlaceholder = (type: 'image' | 'video') => {
     if (fileInputRef.current) {
        fileInputRef.current.setAttribute('data-type', type);
        fileInputRef.current.click();
     }
  };

  const handleAddFromLibrary = (asset: Asset) => {
    addObject({
      id: Math.random().toString(36).substr(2, 9),
      name: asset.name,
      type: asset.type === 'MODEL' ? 'model' : asset.type === 'IMAGE' ? 'image' : 'video',
      assetUrl: asset.url,
      transform: { position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      properties: {},
      visible: true,
      locked: false
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const intendedType = e.target.getAttribute('data-type'); 

    // Use API Service to handle upload
    // Returns server URL if connected, or Base64 if offline
    const asset = await api.uploadAsset(file);
    
    // Override type if button was specific
    if (intendedType === 'image' && asset.type === 'IMAGE') asset.type = 'IMAGE';
    if (intendedType === 'video' && asset.type === 'VIDEO') asset.type = 'VIDEO';

    addAsset(asset);
    
    if (intendedType) {
       handleAddFromLibrary(asset);
    }
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.removeAttribute('data-type');
    }
  };

  const handleTargetImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setProjectTargetImage(url);
  };

  return (
    <div className="w-80 bg-surface border-r border-border flex flex-col h-full z-10">
      <div className="flex border-b border-border">
         <button 
           onClick={() => setActiveTab('assets')}
           className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'assets' ? 'text-white border-b-2 border-white bg-neutral-900' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
         >
           Assets
         </button>
         <button 
           onClick={() => setActiveTab('config')}
           className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'config' ? 'text-white border-b-2 border-white bg-neutral-900' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
         >
           Config
         </button>
      </div>

      {activeTab === 'config' ? (
        <div className="p-6 space-y-6 animate-in slide-in-from-left-2 duration-200">
           <div>
              <h3 className="text-sm font-semibold text-white mb-4">Project Settings</h3>
              
              <div className="space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase">Project Name</label>
                    <input 
                      type="text" 
                      value={currentProject?.name}
                      onChange={(e) => updateProjectSettings({ name: e.target.value })}
                      className="w-full bg-neutral-900 border border-border rounded p-2 text-sm text-white focus:border-white outline-none"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase">Tracking Type</label>
                    <select 
                      value={currentProject?.type}
                      onChange={(e) => updateProjectSettings({ type: e.target.value as ARType })}
                      className="w-full bg-neutral-900 border border-border rounded p-2 text-sm text-white focus:border-white outline-none"
                    >
                      <option value="IMAGE_TRACKING">Target Image Tracking</option>
                      <option value="WORLD_TRACKING">Plane Detection (World)</option>
                      <option value="FACE_TRACKING">Face Tracking</option>
                      <option value="GEO_LOCATION">Geo Location</option>
                    </select>
                 </div>

                 {currentProject?.type === 'IMAGE_TRACKING' && (
                    <div className="space-y-2 pt-2 border-t border-border">
                       <label className="text-xs font-bold text-neutral-400 uppercase">Target Image</label>
                       
                       <div className="mt-2">
                          {currentProject.targetImage ? (
                             <div className="relative group">
                                <img src={currentProject.targetImage} className="w-full h-32 object-cover rounded border border-border" />
                                <button 
                                  onClick={() => targetImageInputRef.current?.click()}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                                >
                                  Change Image
                                </button>
                             </div>
                          ) : (
                             <button 
                               onClick={() => targetImageInputRef.current?.click()}
                               className="w-full h-32 border border-dashed border-border rounded flex flex-col items-center justify-center gap-2 hover:bg-neutral-900 transition-colors"
                             >
                                <QrCode className="text-neutral-600" />
                                <span className="text-xs text-neutral-500">Upload Target Image</span>
                             </button>
                          )}
                          <input 
                             type="file" 
                             ref={targetImageInputRef}
                             className="hidden"
                             accept="image/*"
                             onChange={handleTargetImageUpload}
                          />
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      ) : (
        <>
          <div className="p-4 grid grid-cols-2 gap-2">
            <button 
              onClick={() => {
                  if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('data-type');
                      fileInputRef.current.click();
                  }
              }}
              className="col-span-2 bg-white text-black py-2.5 rounded-lg font-bold hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 text-sm shadow-md mb-2"
            >
              <Upload size={16} />
              Upload Asset
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".glb,.gltf,.png,.jpg,.jpeg,.mp4"
              onChange={handleFileUpload}
            />

            <ToolButton icon={<Box size={18} />} label="Shape" onClick={() => handleAddPrimitive('box')} />
            <ToolButton icon={<Type size={18} />} label="Text" onClick={() => handleAddPrimitive('text')} />
            <ToolButton icon={<ImageIcon size={18} />} label="Image" onClick={() => handleAddPlaceholder('image')} />
            <ToolButton icon={<Video size={18} />} label="Video" onClick={() => handleAddPlaceholder('video')} />
          </div>
          
          <div className="flex-1 overflow-y-auto border-t border-border bg-neutral-950/50">
             <div className="p-3 bg-surface/95 backdrop-blur z-10 border-b border-border/50 flex justify-between items-center sticky top-0">
                <span className="text-xs font-bold text-neutral-500 uppercase">Library</span>
                <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 rounded">{assets.length}</span>
             </div>
             <div className="p-3 space-y-2">
                {assets.map(asset => (
                   <div 
                     key={asset.id} 
                     onClick={() => handleAddFromLibrary(asset)}
                     className="flex items-center gap-3 p-3 bg-neutral-900 border border-border rounded-lg cursor-pointer hover:border-white transition-all group shadow-sm"
                   >
                     <div className="w-10 h-10 bg-black rounded flex items-center justify-center text-neutral-500 group-hover:text-white border border-neutral-800 shrink-0">
                        {asset.type === 'MODEL' ? <FileBox size={18} /> : 
                         asset.type === 'IMAGE' ? <ImageIcon size={18} /> : <Video size={18} />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="text-sm font-medium text-neutral-200 truncate group-hover:text-white">{asset.name}</div>
                       <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{asset.size} • {asset.type}</div>
                     </div>
                   </div>
                ))}
                
                {assets.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-neutral-600 space-y-2">
                    <AlertTriangle size={24} className="opacity-20" />
                    <span className="text-xs">Library Empty</span>
                  </div>
                )}
             </div>
          </div>
        </>
      )}
    </div>
  );
};

const ToolButton = ({ icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 p-3 bg-neutral-900 border border-border rounded-lg hover:border-white transition-all group active:scale-95">
    <div className="text-neutral-500 group-hover:text-white transition-colors">{icon}</div>
    <span className="text-[10px] uppercase font-bold text-neutral-400 group-hover:text-white transition-colors">{label}</span>
  </button>
);

const PropertiesPanel = () => {
  const { currentProject, selectedObjectId, selectObject, updateObject, removeObject } = useStore();
  const selectedObject = currentProject?.sceneObjects.find(o => o.id === selectedObjectId);

  const getIcon = (type: string) => {
    switch (type) {
      case 'model': return <Box size={16} />;
      case 'text': return <Type size={16} />;
      case 'image': return <ImageIcon size={16} />;
      case 'video': return <Video size={16} />;
      default: return <Box size={16} />;
    }
  };

  if (!selectedObject) {
    return (
      <div className="w-80 bg-surface border-l border-border flex flex-col h-full overflow-y-auto z-10">
        <div className="p-4 border-b border-border bg-surfaceHighlight/10">
          <h2 className="font-semibold text-white tracking-tight flex items-center gap-2">
            <Layers size={18} className="text-neutral-400" />
            Scene Objects
          </h2>
        </div>
        
        <div className="flex-1 p-2 space-y-1">
          {currentProject?.sceneObjects.map((obj) => (
             <div 
               key={obj.id} 
               onClick={() => selectObject(obj.id)}
               className="group flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition-all"
             >
                <div className="w-8 h-8 rounded bg-neutral-900 flex items-center justify-center text-neutral-400 group-hover:text-white border border-neutral-800">
                  {getIcon(obj.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-300 group-hover:text-white truncate">{obj.name}</div>
                  <div className="text-[10px] text-neutral-500 uppercase">{obj.type}</div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 text-neutral-500">
                  <ChevronLeft size={14} className="rotate-180" />
                </div>
             </div>
          ))}

          {(!currentProject?.sceneObjects || currentProject.sceneObjects.length === 0) && (
            <div className="flex flex-col items-center justify-center h-40 text-neutral-600 space-y-2">
               <Box size={32} className="opacity-20" />
               <span className="text-xs">Scene is empty</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-surface border-l border-border flex flex-col h-full overflow-y-auto z-10 animate-in slide-in-from-right-4 duration-200">
      <div className="p-4 border-b border-border flex items-center gap-2 bg-surfaceHighlight/10">
        <button 
           onClick={() => selectObject(null)}
           className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors"
           title="Back to List"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-white tracking-tight truncate">Properties</h2>
        </div>
        <div className="text-xs text-neutral-500 font-mono uppercase bg-neutral-900 px-2 py-1 rounded border border-neutral-800">{selectedObject.type}</div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-500 uppercase">Name</label>
          <input 
            type="text" 
            value={selectedObject.name} 
            onChange={(e) => updateObject(selectedObject.id, { name: e.target.value })}
            className="w-full bg-neutral-900 border border-border rounded p-2 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder-neutral-700" 
          />
        </div>

        {selectedObject.type === 'text' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500 uppercase">Text Content</label>
            <textarea
              rows={3}
              value={selectedObject.content || ''}
              onChange={(e) => updateObject(selectedObject.id, { content: e.target.value })}
              className="w-full bg-neutral-900 border border-border rounded p-2 text-sm text-white focus:outline-none focus:border-white transition-colors resize-none"
            />
          </div>
        )}
        
        <div className="space-y-4">
          <label className="text-xs font-bold text-neutral-500 uppercase border-b border-border/50 pb-1 block">Transform</label>
          
          {['Position', 'Rotation', 'Scale'].map((label, idx) => (
             <div key={label} className="space-y-1">
               <div className="text-xs text-neutral-400 mb-1">{label}</div>
               <div className="grid grid-cols-3 gap-2">
                 {['x', 'y', 'z'].map((axis, i) => (
                   <div key={axis} className="flex items-center bg-neutral-900 rounded border border-border px-2 focus-within:border-white transition-colors">
                     <span className="text-[10px] text-neutral-600 mr-2 font-bold">{axis.toUpperCase()}</span>
                     <input 
                        type="number" 
                        value={label === 'Position' ? selectedObject.transform.position[i] : label === 'Rotation' ? selectedObject.transform.rotation[i] : selectedObject.transform.scale[i]}
                        className="w-full bg-transparent py-1.5 text-xs text-white outline-none"
                        step={label === 'Scale' ? 0.1 : 0.5}
                        onChange={(e) => {
                          const newVal = parseFloat(e.target.value);
                          if (isNaN(newVal)) return;
                          
                          const newTransform = { ...selectedObject.transform };
                          if (label === 'Position') {
                            const newPos = [...newTransform.position];
                            newPos[i] = newVal;
                            newTransform.position = newPos as [number, number, number];
                          } else if (label === 'Rotation') {
                            const newRot = [...newTransform.rotation];
                            newRot[i] = newVal;
                            newTransform.rotation = newRot as [number, number, number];
                          } else {
                            const newScale = [...newTransform.scale];
                            newScale[i] = newVal;
                            newTransform.scale = newScale as [number, number, number];
                          }
                          updateObject(selectedObject.id, { transform: newTransform });
                        }}
                     />
                   </div>
                 ))}
               </div>
             </div>
          ))}
        </div>

        <div className="pt-6 border-t border-border space-y-3">
          <button 
             onClick={() => removeObject(selectedObject.id)}
             className="w-full py-2 bg-red-950/20 text-red-500 border border-red-900/30 rounded hover:bg-red-900/40 hover:text-red-400 text-sm transition-colors font-medium hover:border-red-800 flex items-center justify-center gap-2"
          >
            <Trash2 size={14} />
            Delete Object
          </button>
        </div>
      </div>
    </div>
  );
};

export const Editor: React.FC = () => {
  const { closeProject, setTransformMode, transformMode, isPreviewOpen, setPreviewOpen, isPublishOpen, setPublishOpen, selectObject } = useStore();

  return (
    <div className="flex flex-col h-screen bg-black text-white relative">
      {isPreviewOpen && <PreviewModal />}
      {isPublishOpen && <PublishModal />}

      <div className="h-14 border-b border-border bg-surface flex justify-between items-center px-4 z-50 relative">
        <div className="flex items-center gap-4">
          <button onClick={closeProject} className="p-2 hover:bg-neutral-800 rounded-md transition-colors text-neutral-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <div className="h-6 w-[1px] bg-border" />
          <span className="text-sm font-medium tracking-tight">Adhvyk AR Editor</span>
        </div>

        <div className="flex items-center bg-neutral-900 rounded-lg border border-border p-1 gap-1 shadow-lg">
           <button 
             onClick={() => setTransformMode('translate')}
             title="Translate (Move)"
             className={`p-1.5 rounded transition-all ${transformMode === 'translate' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
           >
             <Move size={16} />
           </button>
           <button 
             onClick={() => setTransformMode('rotate')}
             title="Rotate"
             className={`p-1.5 rounded transition-all ${transformMode === 'rotate' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
           >
             <RotateCcw size={16} />
           </button>
           <button 
             onClick={() => setTransformMode('scale')}
             title="Scale"
             className={`p-1.5 rounded transition-all ${transformMode === 'scale' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
           >
             <Scaling size={16} />
           </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-300 hover:text-white transition-colors"
          >
            <MonitorSmartphone size={16} />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button 
            onClick={() => setPublishOpen(true)}
            className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded text-sm font-medium hover:bg-neutral-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            <Download size={16} />
            Publish
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <AssetsPanel />
        <div className="flex-1 bg-black relative">
          <Canvas shadows camera={{ position: [3, 4, 6], fov: 45 }} onPointerMissed={() => selectObject(null)}>
             <Suspense fallback={null}>
               <SceneContent />
               <OrbitControls makeDefault />
             </Suspense>
          </Canvas>
          <div className="absolute bottom-4 left-4 text-[10px] text-neutral-600 pointer-events-none font-mono tracking-wider">
            GRID: 1 UNIT • AXIS: Y-UP • {useStore.getState().currentProject?.type}
          </div>
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
};