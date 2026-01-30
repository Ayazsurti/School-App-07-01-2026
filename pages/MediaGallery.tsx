
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, MediaAsset } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Search, Trash2, Upload, X, Maximize2, Image as ImageIcon, Clock, Loader2, Edit2, CheckCircle2, 
  AlertTriangle, Save, RefreshCw, ShieldCheck, Database, CheckSquare, Square, Layers, PlayCircle, Video, Lock
} from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';

interface MediaGalleryProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];
const SECTIONS = ['A', 'B', 'C', 'D'];

const MediaGallery: React.FC<MediaGalleryProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const isTeacher = user.role === 'TEACHER';
  
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
  
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [targetSections, setTargetSections] = useState<string[]>(['A', 'B', 'C', 'D']);

  const [formData, setFormData] = useState({ name: '', description: '', url: '', type: 'image' as 'image' | 'video' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCloudData = async () => {
    try {
      const data = await db.gallery.getAll();
      const galleryOnly = (data || []).filter((a: any) => a.type !== 'slideshow');
      
      setAssets(galleryOnly.map((a: any) => ({
        id: a.id, url: a.url, type: a.type, name: a.name || 'UNTITLED_ASSET', description: a.description,
        date: a.date, uploadedBy: a.uploaded_by
      })));
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-gallery-sync-v17')
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
    
    if (file.type.startsWith('video') && file.size > 10 * 1024 * 1024) {
      alert("Video size too large. Max 10MB allowed for cloud sync.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData({ 
        name: (file.name || '').split('.')[0].toUpperCase() || 'NEW_ASSET', 
        description: '', 
        url: ev.target?.result as string,
        type: file.type.startsWith('video') ? 'video' : 'image'
      });
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
        description: `${metadataStr} ${(formData.description || '').toUpperCase()}`,
        uploadedBy: user.name,
        date: new Date().toLocaleString()
      };

      await db.gallery.insert(payload);
      createAuditLog(user, 'CREATE', 'Gallery', `${formData.type === 'video' ? 'Video' : 'Photo'} Synced: ${formData.name}`);
      setShowFormModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchCloudData();
    } catch (err) { alert("Sync failed."); }
    finally { setUploading(false); }
  };

  const filteredAssets = useMemo(() => {
    const query = (searchQuery || '').toLowerCase();
    return assets.filter(asset => {
      const nameMatch = (asset.name || '').toLowerCase().includes(query);
      if (isStudent) {
        const desc = (asset.description || '').toLowerCase();
        // Strict mapping check
        const targetClassMatch = desc.includes((user.class || '').toLowerCase());
        const targetSectionMatch = desc.includes(`sec: `) && desc.includes((user.section || '').toLowerCase());
        const globalMatch = desc.includes('targets: all') || desc.includes('global archive');
        
        return nameMatch && (globalMatch || (targetClassMatch && targetSectionMatch));
      }
      return nameMatch;
    });
  }, [assets, searchQuery, user, isStudent]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Campus Memories <ImageIcon className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-2">
            {isStudent ? `Authorized Archive View: Standard ${user.class}-${user.section}` : 'Institutional Identity Archive Node'}
          </p>
        </div>
        {!isStudent && (
          <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest disabled:opacity-50">
            <Plus size={20} /> Upload Asset
          </button>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 mx-4 sm:mx-0">
          <Search className="text-slate-300" size={20} />
          <input type="text" placeholder="Search memories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none font-bold outline-none dark:text-white uppercase text-xs tracking-widest" />
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-4 sm:px-0">
          {filteredAssets.map((asset) => {
             const hasTargetInfo = asset.description?.startsWith('[TARGETS:');
             const targetInfo = hasTargetInfo ? asset.description?.split(']')[0].replace('[', '') : 'Global Archive';
             const isVideo = asset.type === 'video';

             return (
              <div key={asset.id} className="group bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all relative flex flex-col cursor-pointer" onClick={() => setActiveMediaId(asset.id)}>
                 <div className="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {isVideo ? (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                        <video src={asset.url} className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <PlayCircle size={48} className="text-white opacity-80 group-hover:scale-110 transition-transform" />
                        </div>
                      </div>
                    ) : (
                      <img src={asset.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={asset.name} />
                    )}
                    <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      {isVideo ? <Video className="text-white" size={32} /> : <Maximize2 className="text-white" size={32} />}
                    </div>
                 </div>
                 <div className="p-6 flex-1 flex flex-col">
                    <h4 className="font-black text-slate-800 dark:text-white mb-1 uppercase text-sm tracking-tight truncate">{asset.name}</h4>
                    {!isStudent && <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-3 truncate">Target: {targetInfo}</p>}
                    <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4 mt-auto">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> {asset.date}</p>
                       {!isStudent && <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(asset); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>}
                    </div>
                 </div>
              </div>
             );
          })}
          {filteredAssets.length === 0 && (
             <div className="col-span-full py-40 text-center opacity-30 flex flex-col items-center">
                <ImageIcon size={64} className="mb-4 text-slate-200" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Memories Archived for your node</p>
             </div>
          )}
        </div>
      )}

      {/* MODAL & DELETE LOGIC REMAINS LOCKED FOR STUDENTS */}
      {activeMediaId && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/98 backdrop-blur-xl flex flex-col items-center justify-center p-6 lg:p-10 animate-in fade-in">
           <button onClick={() => setActiveMediaId(null)} className="absolute top-10 right-10 p-4 bg-white/10 hover:bg-rose-600 text-white rounded-2xl transition-all shadow-2xl z-50"><X size={32}/></button>
           
           <div className="w-full max-w-5xl h-full flex flex-col items-center justify-center gap-8">
              {assets.find(a => a.id === activeMediaId)?.type === 'video' ? (
                <video src={assets.find(a => a.id === activeMediaId)?.url} controls autoPlay className="max-w-full max-h-[70vh] rounded-[2rem] shadow-2xl" />
              ) : (
                <img src={assets.find(a => a.id === activeMediaId)?.url} className="max-w-full max-h-[70vh] object-contain rounded-[2rem] shadow-2xl" />
              )}
              <div className="text-center">
                 <h3 className="text-3xl font-black text-white uppercase tracking-widest leading-tight">{assets.find(a => a.id === activeMediaId)?.name}</h3>
                 <div className="flex items-center justify-center gap-3 mt-4">
                    <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                       <Lock size={12} className="text-indigo-400" />
                       <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Protected Identity Asset</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
