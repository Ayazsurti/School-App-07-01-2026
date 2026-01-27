import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, MediaAsset } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { db, supabase, getErrorMessage } from '../supabase';
import { 
  Plus, Search, Trash2, Upload, X, Maximize2, Image as ImageIcon, Clock, Loader2, Edit2, CheckCircle2, 
  AlertTriangle, Save, RefreshCw, ShieldCheck, Database, CheckSquare, Square, Layers
} from 'lucide-react';

interface MediaGalleryProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];
const SECTIONS = ['A', 'B', 'C', 'D'];

const MediaGallery: React.FC<MediaGalleryProps> = ({ user }) => {
  const isTeacher = user.role === 'TEACHER';
  
  // Restricted classes for Teacher
  const authorizedClasses = useMemo(() => {
    if (user.role === 'ADMIN') return ALL_CLASSES;
    const teacherClasses = (user as any).classes || (user.class ? [user.class] : []);
    return ALL_CLASSES.filter(c => teacherClasses.includes(c));
  }, [user]);

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Multi-Targeting
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [targetSections, setTargetSections] = useState<string[]>(['A', 'B', 'C', 'D']);

  const [formData, setFormData] = useState({ name: '', description: '', url: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCloudData = async () => {
    try {
      const data = await db.gallery.getAll();
      setAssets(data.map((a: any) => ({
        id: a.id, url: a.url, type: a.type, name: a.name, description: a.description,
        date: a.date, uploadedBy: a.uploaded_by
      })));
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-gallery-sync-v14')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleClass = (cls: string) => {
    setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
  };

  const toggleSection = (sec: string) => {
    setTargetSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData({ name: file.name.split('.')[0].toUpperCase(), description: '', url: ev.target?.result as string });
      setUploading(false);
      setTargetClasses([]);
      setShowFormModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url || !formData.name || targetClasses.length === 0) {
       if(targetClasses.length === 0) alert("Select target Classes.");
       return;
    }
    
    setUploading(true);
    try {
      const metadataStr = `[TARGETS: ${targetClasses.join(', ')} | SEC: ${targetSections.join(', ')}]`;
      const payload = { 
        ...formData, 
        description: `${metadataStr} ${formData.description.toUpperCase()}`,
        type: 'image',
        uploadedBy: user.name,
        date: new Date().toLocaleString()
      };

      await db.gallery.insert(payload);
      createAuditLog(user, 'CREATE', 'Gallery', `Photo Synced: ${formData.name} for ${targetClasses.length} classes`);
      setShowFormModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchCloudData();
    } catch (err) { alert("Sync failed."); }
    finally { setUploading(false); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSyncing(true);
    try {
      await db.gallery.delete(deleteTarget.id);
      await createAuditLog(user, 'DELETE', 'Gallery', `Purged Photo: ${deleteTarget.name}`);
      setDeleteTarget(null);
      fetchCloudData();
    } catch (err: any) {
      alert(`Delete Failed: ${getErrorMessage(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (user.role === 'STUDENT') {
        const desc = asset.description || '';
        return matchesSearch && desc.includes(user.class || '') && desc.includes(`SEC: ${user.section || ''}`);
      }
      return matchesSearch;
    });
  }, [assets, searchQuery, user]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Photo Gallery <ImageIcon className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional memory archive with audience targeting.</p>
        </div>
        {user.role !== 'STUDENT' && (
          <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest disabled:opacity-50">
            <Plus size={20} /> Upload to Vault
          </button>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 mx-4 sm:mx-0">
          <Search className="text-slate-300" size={20} />
          <input type="text" placeholder="Search archives..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none font-bold outline-none dark:text-white uppercase text-xs tracking-widest" />
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-4 sm:px-0">
          {filteredAssets.map((asset) => {
             const hasTargetInfo = asset.description?.startsWith('[TARGETS:');
             const targetInfo = hasTargetInfo ? asset.description?.split(']')[0].replace('[', '') : 'Global Archive';

             return (
              <div key={asset.id} className="group bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all hover:-translate-y-2 relative flex flex-col">
                 <div className="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-800" onClick={() => setActiveMediaId(asset.id)}>
                    <img src={asset.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 cursor-pointer" alt={asset.name} />
                    <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"><Maximize2 className="text-white" size={32} /></div>
                 </div>
                 <div className="p-6 flex-1 flex flex-col">
                    <h4 className="font-black text-slate-900 dark:text-white mb-1 uppercase text-sm tracking-tight truncate">{asset.name}</h4>
                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-3 truncate">Audience: {targetInfo}</p>
                    <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4 mt-auto">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> {asset.date}</p>
                       {user.role !== 'STUDENT' && <button onClick={() => setDeleteTarget(asset)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>}
                    </div>
                 </div>
              </div>
             );
          })}
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-1 shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Upload Asset</h3>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Multi-Target Identification Node</p>
                 </div>
                 <button onClick={() => setShowFormModal(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={32} /></button>
              </div>
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar flex flex-col lg:flex-row gap-10">
                 <div className="flex-1 space-y-6">
                    <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner border-4 border-white dark:border-slate-800">
                       <img src={formData.url} className="w-full h-full object-cover" alt="Preview" />
                    </div>
                    <div className="space-y-4">
                       <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="PHOTO CAPTION" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                    </div>
                 </div>

                 <div className="w-full lg:w-80 space-y-8 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[3rem] shadow-inner border border-slate-100 dark:border-slate-800">
                    <div className="space-y-4">
                       <div className="flex justify-between items-center px-1">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={14}/> Targets</h4>
                          <button type="button" onClick={() => setTargetClasses(targetClasses.length === authorizedClasses.length ? [] : [...authorizedClasses])} className="text-[8px] font-black text-slate-400 uppercase">Toggle All</button>
                       </div>
                       <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                          {authorizedClasses.map(cls => (
                             <button key={cls} type="button" onClick={() => toggleClass(cls)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-100'}`}>
                                {targetClasses.includes(cls) ? <CheckSquare size={14} /> : <Square size={14} />}
                                <span className="text-[9px] font-black uppercase truncate">{cls}</span>
                             </button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 px-1"><Layers size={14}/> Sections</h4>
                       <div className="grid grid-cols-2 gap-2">
                          {SECTIONS.map(sec => (
                             <button key={sec} type="button" onClick={() => toggleSection(sec)} className={`py-3 rounded-xl border font-black text-[10px] transition-all ${targetSections.includes(sec) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-100'}`}>
                                SEC {sec}
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </form>
              <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                 <button onClick={handleSave} disabled={uploading || targetClasses.length === 0} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-sm tracking-[0.3em] flex items-center justify-center gap-4">
                    {uploading ? <Loader2 className="animate-spin" /> : <Database size={24} />} Synchronize to Vault
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* REFINED DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md no-print animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-tight">Purge Photo?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] uppercase tracking-widest leading-relaxed">
                Delete <b>{deleteTarget.name}</b> from the institutional vault? This cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteTarget(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={handleConfirmDelete} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;