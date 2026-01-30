
import React, { useState, useEffect, useRef } from 'react';
import { User, DisplaySettings } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { Palette, Type, Image as ImageIcon, Layers, Save, RotateCcw, Upload, CheckCircle2, Eye, Layout, Sparkles, CloudUpload, Loader2, RefreshCw } from 'lucide-react';
import { db, supabase } from '../supabase';

interface DisplayConfigureProps { user: User; settings: DisplaySettings; onUpdateSettings: (settings: DisplaySettings) => void; }

const DisplayConfigure: React.FC<DisplayConfigureProps> = ({ user, settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState<DisplaySettings>(settings);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fontOptions = [
    { name: 'Inter (Modern)', value: "'Inter', sans-serif" },
    { name: 'Poppins (Playful)', value: "'Poppins', sans-serif" },
    { name: 'Roboto (Professional)', value: "'Roboto', sans-serif" },
    { name: 'Space Mono (Tech)', value: "'Space Mono', monospace" },
  ];

  const presets = [
    { name: 'Arctic Blue', bg: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80' },
    { name: 'Midnight', bg: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&q=80' },
    { name: 'Sahara', bg: 'https://images.unsplash.com/photo-1509316785289-025f54846b5e?auto=format&fit=crop&q=80' },
    { name: 'Ethereal', bg: 'https://images.unsplash.com/photo-1475924156731-498ff79a1772?auto=format&fit=crop&q=80' },
  ];

  const handleSave = async () => {
    setIsSyncing(true);
    try {
      onUpdateSettings(localSettings);
      await db.settings.update('global_display_settings', JSON.stringify(localSettings));
      createAuditLog(user, 'UPDATE', 'System', 'Global interface visual settings updated in cloud');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) { alert("Cloud connection error."); }
    finally { setIsSyncing(false); }
  };

  const resetToDefault = () => {
    setLocalSettings({ fontFamily: "'Inter', sans-serif", fontColor: '#0f172a', accentColor: '#4f46e5', backgroundImage: null, bgOpacity: 10, cardOpacity: 90, glassBlur: 12 });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) { alert("Image too large (Max 1.5MB)."); return; }
      const reader = new FileReader();
      reader.onload = (ev) => setLocalSettings({ ...localSettings, backgroundImage: ev.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 sm:px-0">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
          <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
            <CheckCircle2 size={24} />
            <p className="font-black text-xs uppercase tracking-widest">Interface Synced</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">Display Configure <Palette className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional Aesthetic Synthesis.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={resetToDefault} className="px-6 py-4 bg-white dark:bg-slate-900 text-slate-500 font-black rounded-2xl border border-slate-200 dark:border-slate-800 hover:text-rose-500 transition-all flex items-center gap-2 uppercase text-[10px] tracking-widest"><RotateCcw size={16} /> Reset</button>
          <button onClick={handleSave} disabled={isSyncing} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 uppercase text-xs active:scale-95 disabled:opacity-50">
            {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Sync Blueprint
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-8 flex items-center gap-4"><Type className="text-indigo-600" /> Typography Node</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Font Family</label><select value={localSettings.fontFamily} onChange={e => setLocalSettings({...localSettings, fontFamily: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 font-bold outline-none uppercase text-xs">{fontOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.name}</option>)}</select></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Font Color</label><div className="flex gap-3"><input type="color" value={localSettings.fontColor} onChange={e => setLocalSettings({...localSettings, fontColor: e.target.value})} className="w-16 h-14 rounded-2xl cursor-pointer border-none bg-transparent" /><input type="text" value={localSettings.fontColor} onChange={e => setLocalSettings({...localSettings, fontColor: e.target.value})} className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 font-black text-xs uppercase" /></div></div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-8 flex items-center gap-4"><ImageIcon className="text-indigo-600" /> Background Engine</h3>
            <div className="space-y-8">
              <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 border-4 border-dashed border-indigo-50 dark:border-indigo-900/30 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group"><CloudUpload size={48} className="text-indigo-200 group-hover:text-indigo-500 transition-colors" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional Canvas Upload</p><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} /></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{presets.map(p => (<button key={p.name} onClick={() => setLocalSettings({...localSettings, backgroundImage: p.bg})} className={`h-24 rounded-2xl overflow-hidden relative group border-4 transition-all ${localSettings.backgroundImage === p.bg ? 'border-indigo-600' : 'border-transparent'}`}><img src={p.bg} className="w-full h-full object-cover" alt={p.name} /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[8px] font-black text-white uppercase tracking-widest">{p.name}</span></div></button>))}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-8 flex items-center gap-4"><Layers className="text-indigo-600" /> Transparency Nodes</h3>
            <div className="space-y-10">
              <div className="space-y-4"><div className="flex justify-between items-end"><label className="text-[10px] font-black text-slate-400 uppercase">Card Opacity</label><span className="text-xs font-black text-indigo-600">{localSettings.cardOpacity}%</span></div><input type="range" min="30" max="100" step="5" value={localSettings.cardOpacity} onChange={e => setLocalSettings({...localSettings, cardOpacity: parseInt(e.target.value)})} className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" /></div>
              <div className="space-y-4"><div className="flex justify-between items-end"><label className="text-[10px] font-black text-slate-400 uppercase">Overlay Intensity</label><span className="text-xs font-black text-indigo-600">{localSettings.bgOpacity}%</span></div><input type="range" min="0" max="80" step="5" value={localSettings.bgOpacity} onChange={e => setLocalSettings({...localSettings, bgOpacity: parseInt(e.target.value)})} className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" /></div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 relative">
          <div className="sticky top-24 space-y-6">
             <div className="bg-slate-900 rounded-[3rem] p-1 shadow-2xl overflow-hidden aspect-[4/5] relative">
                <div className="absolute inset-0 z-0"><img src={localSettings.backgroundImage || presets[0].bg} className="w-full h-full object-cover" alt="bg" /><div className="absolute inset-0 bg-slate-950" style={{ opacity: localSettings.bgOpacity / 100 }}></div></div>
                <div className="relative z-10 h-full p-8 flex flex-col" style={{ fontFamily: localSettings.fontFamily, color: localSettings.fontColor }}>
                   <div className="flex items-center justify-between mb-12"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Sparkles size={20}/></div><div className="text-right"><p className="text-[8px] font-black uppercase tracking-widest opacity-60">Live Preview Node</p></div></div>
                   <div className="p-8 rounded-[2rem] border border-white/20 shadow-xl" style={{ backgroundColor: `rgba(255,255,255, ${localSettings.cardOpacity/100})`, backdropFilter: `blur(${localSettings.glassBlur}px)` }}><h4 className="text-lg font-black uppercase mb-2">Institutional Brand</h4><p className="text-[10px] font-bold uppercase tracking-widest">Wysiwyg Interface Sync</p></div>
                   <div className="mt-auto flex justify-center"><p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Deen-E-Islam Cloud</p></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisplayConfigure;
