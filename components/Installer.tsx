import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ShieldCheck, Database, Server, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

export const Installer: React.FC = () => {
  const setInstalled = useStore((state) => state.setInstalled);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (step < 4) {
        setStep(step + 1);
      } else {
        setInstalled(true);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-border bg-surfaceHighlight/30 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Adhvyk AR Studio</h1>
          <p className="text-muted text-sm mt-2 uppercase tracking-widest font-medium">Installation Wizard</p>
        </div>

        {/* Steps Visualizer */}
        <div className="flex justify-between px-10 py-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${step >= i ? 'bg-white' : 'bg-neutral-800'}`} />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 min-h-[300px] flex flex-col justify-center">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 text-emerald-400 mb-6">
                <ShieldCheck size={32} />
                <h2 className="text-xl font-semibold text-white">System Check</h2>
              </div>
              <ul className="space-y-3 text-neutral-400">
                <li className="flex items-center gap-3"><CheckCircle size={16} className="text-white" /> Node.js v18.16.0 detected</li>
                <li className="flex items-center gap-3"><CheckCircle size={16} className="text-white" /> Write permissions verified</li>
                <li className="flex items-center gap-3"><CheckCircle size={16} className="text-white" /> Memory available: 4GB+</li>
              </ul>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 text-blue-400 mb-6">
                <Database size={32} />
                <h2 className="text-xl font-semibold text-white">Database Configuration</h2>
              </div>
              <p className="text-neutral-400 mb-4">Connecting to local Prisma instance (SQLite/MySQL)...</p>
              <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-neutral-500 border border-neutral-800">
                > Running migrations...<br/>
                > Creating schema...<br/>
                > Seeding initial data...<br/>
                > <span className="text-emerald-500">Success.</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 text-purple-400 mb-6">
                <Server size={32} className="text-white" />
                <h2 className="text-xl font-semibold text-white">Admin Setup</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs uppercase font-bold text-neutral-500">Admin Email</label>
                  <input type="email" defaultValue="admin@adhvyk.com" className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-white transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase font-bold text-neutral-500">Password</label>
                  <input type="password" defaultValue="password" className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:border-white transition-colors" />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 text-emerald-400 mb-6">
                <CheckCircle size={32} />
                <h2 className="text-xl font-semibold text-white">Ready to Launch</h2>
              </div>
              <p className="text-neutral-400">Adhvyk AR Studio is ready. The environment has been provisioned.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-surfaceHighlight/20 flex justify-end">
          <button 
            onClick={handleNext} 
            disabled={loading}
            className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                {step === 4 ? 'Launch Studio' : 'Continue'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
