
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, MediaAsset } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Search, Trash2, Upload, X, Maximize2, Image as ImageIcon, Clock, Loader2, Edit2, CheckCircle2, 
  AlertTriangle, Save, RefreshCw, ShieldCheck, Database, CheckSquare, Square, Layers, PlayCircle, Video, Target, Lock
} from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';

interface MediaGalleryProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];
const SECTIONS = ['A', 'B', 'C', 'D'];

const MediaGallery: React.FC<MediaGalleryProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  const isStudent = user.role === 'STUDENT';
  const isTeacher = user.role === 'TEACHER';
  
  const authorizedClasses = useMemo(() => {
    if (isAdmin) return ALL_CLASSES;
    const teacherClasses = (user as any).classes || (user.class ? [user.class] : []);
    return ALL_CLASSES.filter(c => teacherClasses.includes(c));
  }, [user, isAdmin]);

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
    const channel = supabase.channel('realtime-gallery-sync-v20')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData({ 
        name: file.name.split('.')[0].toUpperCase(), 
        description: '', 
        url: ev.target?.result as string,
        type: file.type.startsWith('video') ? 'video' : 'image'
      });
      setUploading(false);
      setShowFormModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url || targetClasses.length === 0) return;
    
    setUploading(true);
    try {
      const metadata = `[IDENTITY_NODE: ${targetClasses.join(',')}|SEC: ${targetSections.join(',')}]`;
      const payload = { 
        ...formData, 
        description: `${metadata} ${formData.description.toUpperCase()}`,
        uploadedBy: user.name,
        date: new Date().toLocaleString()
      };
      await db.gallery.insert(payload);
      await createAuditLog(user, 'CREATE', 'Gallery', `Synced asset to ${targetClasses.length} nodes`);
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
      await createAuditLog(user, 'DELETE', 'Gallery', `Purged Asset: ${deleteTarget.name}`);
      setDeleteTarget(null);
      fetchCloudData();
    } catch (err) { alert("Delete failed."); }
    finally { setIsSyncing(false); }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const nameMatch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (isStudent) {
        const desc = (asset.description || '').toUpperCase();
        const studentClass = (user.class || '').toUpperCase();
        const studentSection = (user.section || '').toUpperCase();
        const hasIdentityNode = desc.includes('[IDENTITY_NODE:');
        if (!hasIdentityNode) return false;
        const nodePart = desc.split('[IDENTITY_NODE:')[1].split(']')[0];
        const [classesStr, secsStr] = nodePart.split('|');
        const targets = classesStr.split(',').map(s => s.trim());
        const sections = secsStr.replace('SEC: ', '').split(',').map(s => s.trim());
        return nameMatch && targets.includes(studentClass) && sections.includes(studentSection);
      }
      return nameMatch;
    });
  }, [assets, searchQuery, isStudent, user]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Campus Gallery <ImageIcon className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase text-xs tracking-widest">
             {isStudent ? `Standard ${user.class}-${user.section} Memory Archive` : 'Institutional Resource Management'}
          </p>
        </div>
        {!isStudent && (
          <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest disabled:opacity-50">
            <Plus size={20} /> Upload Asset
          </button>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 mx-4 sm:px-0">
          <Search className="text-slate-300 ml-4" size={20} />
          <input type="text" placeholder="Filter archive..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none font-bold outline-none dark:text-white uppercase text-xs tracking-widest" />
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-4 sm:px-0">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="group bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all relative flex flex-col cursor-pointer" onClick={() => setActiveMediaId(asset.id)}>
               <div className="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {asset.type === 'video' ? (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                       <PlayCircle size={48} className="text-white opacity-60 group-hover:scale-110 transition-transform" />
                    </div>
                  ) : (
                    <img src={asset.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={asset.name} />
                  )}
                  <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <Maximize2 className="text-white" size={32} />
                  </div>
               </div>
               <div className="p-6 flex-1 flex flex-col">
                  <h4 className="font-black text-slate-800 dark:text-white mb-1 uppercase text-sm truncate">{asset.name}</h4>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50 dark:border-slate-800">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> {asset.date}</p>
                     {isAdmin && <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(asset); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* COMPACT DELETE DIALOG - SMALL SIZE */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-[320px] w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.2rem] flex items-center justify-center mb-5 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Purge Asset?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium text-[9px] uppercase tracking-widest leading-relaxed">Permanently remove <b>{deleteTarget.name}</b> from cloud archive?</p>
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setDeleteTarget(null)} className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl uppercase text-[9px]">Cancel</button>
                 <button onClick={handleConfirmDelete} className="py-3 bg-rose-600 text-white font-black rounded-xl shadow-lg hover:bg-rose-700 transition-all uppercase text-[9px]">Purge</button>
              </div>
           </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showFormModal && !isStudent && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Identity Node Sync</h3>
                 <button onClick={() => setShowFormModal(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={28} /></button>
              </div>
              <form onSubmit={handleSave} className="p-10 space-y-10 overflow-y-auto custom-scrollbar flex-1">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div className="aspect-video rounded-[2rem] overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-inner">
                          {formData.type === 'video' ? <video src={formData.url} className="w-full h-full object-cover" /> : <img src={formData.url} className="w-full h-full object-cover" />}
                       </div>
                       <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="ASSET NAME..." className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                    </div>
                    <div className="space-y-6">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Target size={14}/> Target Standards</label>
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                             {authorizedClasses.map(cls => (
                               <button key={cls} type="button" onClick={() => setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls])} className={`px-2 py-2 rounded-xl text-[8px] font-black uppercase transition-all border ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>
                                  {cls}
                               </button>
                             ))}
                          </div>
                       </div>
                       <button type="submit" disabled={uploading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-2xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                          {uploading ? <Loader2 className="animate-spin" /> : <Database size={20} />} Sync to Identity Hub
                       </button>
                    </div>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
