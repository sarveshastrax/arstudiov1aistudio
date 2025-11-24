import React from 'react';
import { useStore } from '../store/useStore';
import { Plus, Search, Folder, MoreVertical, Eye, Box } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { projects, createProject, openProject } = useStore();

  return (
    <div className="h-full overflow-y-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">Projects</h1>
          <p className="text-neutral-500">Manage your AR experiences and assets.</p>
        </div>
        <button 
          onClick={() => createProject('New AR Experience', 'IMAGE_TRACKING')}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-neutral-200 transition-colors"
        >
          <Plus size={18} />
          Create New
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          <input 
            type="text" 
            placeholder="Search projects..." 
            className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-white focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Published', 'Drafts'].map(filter => (
            <button key={filter} className="px-3 py-2 rounded-lg border border-border text-neutral-400 hover:text-white hover:border-neutral-600 text-sm transition-colors">
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project) => (
          <div 
            key={project.id} 
            onClick={() => openProject(project.id)}
            className="group bg-surface border border-border rounded-xl overflow-hidden hover:border-neutral-500 transition-all cursor-pointer relative"
          >
            {/* Thumbnail */}
            <div className="h-48 bg-neutral-900 relative overflow-hidden">
               <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
               <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-white uppercase tracking-wider border border-white/10">
                 {project.type.replace('_TRACKING', '')}
               </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-medium truncate pr-4">{project.name}</h3>
                <button className="text-neutral-500 hover:text-white">
                  <MoreVertical size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-500 mt-4">
                <span className="flex items-center gap-1">
                  <Eye size={12} /> {project.views}
                </span>
                <span>{project.lastModified}</span>
              </div>
            </div>

            {/* Hover Action */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
              <button className="bg-white text-black px-6 py-2 rounded-full font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                Open Editor
              </button>
            </div>
          </div>
        ))}

        {/* Placeholder New Card */}
        <button 
          onClick={() => createProject('New Project', 'WORLD_TRACKING')}
          className="h-[300px] border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-neutral-600 hover:text-white hover:border-neutral-500 hover:bg-surfaceHighlight/10 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mb-4 border border-border">
            <Plus size={24} />
          </div>
          <span className="font-medium">Create Blank Project</span>
        </button>
      </div>
    </div>
  );
};
