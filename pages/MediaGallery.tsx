import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, MediaAsset } from '../types';
import { createAuditLog } from '../utils/auditLogger';
// Fix: Imported db and supabase which were missing
import { db, supabase } from '../supabase';
import { 
  Plus, Search, Trash2, Upload, X, Maximize2, Image as ImageIcon, Clock, User as UserIcon, AlertCircle, Loader2, Edit2, CheckCircle2, AlertTriangle, Save, RefreshCw
} from 'lucide-react';

interface MediaGalleryProps { user: User; }

const MediaGallery: React.FC<MediaGalleryProps> = ({ user }) => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', description: '', url: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTimestamp = () => {
    return new Date().toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  const fetchCloudData = async () => {
    try {
      const data = await db.gallery.getAll();
      setAssets(data.map((a: any) => ({
        id: a.id, url: a.url, type: a.type, name: a.name, description: a.description,
        date: a.date, uploadedBy: a.uploaded_by
      })));
    } catch (err) { console.error("Gallery Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-gallery')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData({
        name: file.name.split('.')[0],
        description: '',
        url: ev.target?.result as string
      });
      setUploading(false);
      setShowFormModal(true);
      setEditingAsset(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url || !formData.name) return;
    
    setUploading(true);
    try {
      if (editingAsset) {
        await db.gallery.update(editingAsset.id, formData);
        createAuditLog(user, 'UPDATE', 'Gallery', `Photo Updated: ${formData.name}`);
      } else {
        const newAsset = {
          name: formData.name,
          url: formData.url,
          description: formData.description || 'Cloud Memory',
          type: 'image',
          uploadedBy: user.name,
          date: formatTimestamp()
        };
        await db.gallery.insert(newAsset);
        createAuditLog(user, 'CREATE', 'Gallery', `Photo Uploaded: ${newAsset.name}`);
      }
      setShowFormModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Cloud operation failed."); }
    finally { setUploading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await db.gallery.delete(deleteId);
      createAuditLog(user, 'DELETE', 'Gallery', `Photo Purged from Cloud`);
      setDeleteId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Deletion failed."); }
  };

  const filteredAssets = useMemo(() => assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (a.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  ), [assets, searchQuery]);

  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Updating Cloud Gallery...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Sync Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Cloud Storage Updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Photo Gallery <ImageIcon className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Preserving institutional memories with precise timestamps.</p>
        </div>
        {canManage && (
          <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest disabled:opacity-50" disabled={uploading}>
            {uploading ? <Loader2 className="animate-spin" /> : <Plus size={20} />} Upload to Cloud
          </button>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-6">
        <div className="relative group flex-1 w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input type="text" placeholder="Search by title or description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-transparent rounded-2xl pl-16 pr-6 py-4 text-sm font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
          <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
          <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Accessing Global Archive...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="group bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all hover:-translate-y-2 relative flex flex-col">
               <div className="aspect-[4/3] relative overflow-hidden bg-slate-100 dark:bg-slate-800" onClick={() => setActiveMediaId(asset.id)}>
                  <img src={asset.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 cursor-pointer" alt={asset.name} />
                  <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                     <Maximize2 className="text-white" size={32} />
                  </div>
               </div>
               <div className="p-8 flex-1 flex flex-col">
                  <h4 className="font-black text-slate-900 dark:text-white mb-2 uppercase text-sm tracking-tight truncate">{asset.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed mb-6 flex-1 italic">
                    {asset.description || 'No description provided'}
                  </p>
                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-6 mt-auto">
                     <div className="space-y-1">
                        <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> {asset.date}</p>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">By {asset.uploadedBy}</p>
                     </div>
                     {canManage && (
                       <div className="flex gap-1">
                         <button onClick={() => { setEditingAsset(asset); setFormData({ name: asset.name, description: asset.description || '', url: asset.url }); setShowFormModal(true); }} className="p-3 bg-white dark:bg-slate-800 text-indigo-600 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit2 size={16} /></button>
                         <button onClick={() => setDeleteId(asset.id)} className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={16} /></button>
                       </div>
                     )}
                  </div>
               </div>
            </div>
          ))}
          
          {filteredAssets.length === 0 && (
            <div className="col-span-full py-40 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
               <ImageIcon size={64} className="text-slate-200 dark:text-slate-700 mb-6" />
               <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter">Memory Archive Empty</h3>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Try searching with a different term.</p>
            </div>
          )}
        </div>
      )}

      {/* FULL PREVIEW MODAL */}
      {activeMediaId && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/98 backdrop-blur-xl flex flex-col items-center justify-center p-10 animate-in fade-in">
           <button onClick={() => setActiveMediaId(null)} className="absolute top-10 right-10 p-4 bg-white/10 hover:bg-rose-600 text-white rounded-2xl transition-all shadow-2xl"><X size={32}/></button>
           <img src={assets.find(a => a.id === activeMediaId)?.url} className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl border-8 border-white/5" />
           <div className="text-center mt-10 space-y-2">
             <h3 className="text-3xl font-black text-white uppercase tracking-widest">{assets.find(a => a.id === activeMediaId)?.name}</h3>
             <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs italic">{assets.find(a => a.id === activeMediaId)?.description}</p>
           </div>
        </div>
      )}

      {/* FORM MODAL (UPLOAD/EDIT) */}
      {showFormModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-1 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingAsset ? 'Modify Details' : 'Cloud Photo Details'}</h3>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-1">Institutional Memory Registry</p>
                 </div>
                 <button onClick={() => setShowFormModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={32} /></button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
                 <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner border border-slate-100 dark:border-slate-700">
                    <img src={formData.url} className="w-full h-full object-cover" alt="Preview" />
                 </div>

                 <div className="space-y-6">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Photo Heading / Title</label>
                       <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner transition-all" placeholder="e.g., Science Fair 2026" />
                    </div>

                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Short Description</label>
                       <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] px-8 py-8 font-medium text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none shadow-inner" placeholder="Tell the story behind this photo..." />
                    </div>
                 </div>
              </form>

              <div className="p-12 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                 <button onClick={handleSave} disabled={uploading || !formData.name} className="w-full py-7 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all uppercase text-sm tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-50">
                    {uploading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                    {editingAsset ? 'Synchronize Details' : 'Finalize Cloud Sync'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL - UPDATED TO COMPACT SIZE */}
      {deleteId && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 max-w-xs w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Purge Memory?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] leading-relaxed uppercase tracking-widest">This photo and its details will be permanently erased from the archive.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteId(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={confirmDelete} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
