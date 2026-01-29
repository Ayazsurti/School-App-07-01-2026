
import React, { useState, useRef, useEffect } from 'react';
import { User, MediaAsset } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Trash2, Upload, X, ImageIcon, Clock, Loader2, 
  CheckCircle2, AlertTriangle, Database, MonitorPlay,
  ArrowLeft, RefreshCw, ShieldCheck
} from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';
import { useNavigate } from 'react-router-dom';

interface SlideshowManagerProps { user: User; }

const SlideshowManager: React.FC<SlideshowManagerProps> = ({ user }) => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', url: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSlides = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('type', 'slideshow')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setSlides(data.map((a: any) => ({
        id: a.id, url: a.url, type: 'image', name: a.name, 
        date: a.date, uploadedBy: a.uploaded_by
      })));
    } catch (err) { console.error("Slideshow Fetch Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchSlides();
    const channel = supabase.channel('realtime-slides-manager-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => {
        setIsSyncing(true);
        fetchSlides().then(() => setTimeout(() => setIsSyncing(false), 800));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size too large. Dashboard slides must be under 2MB for performance.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData({ 
        name: file.name.split('.')[0].toUpperCase(), 
        url: ev.target?.result as string
      });
      setUploading(false);
      setShowUploadModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url || !formData.name) return;
    
    setUploading(true);
    try {
      const payload = { 
        name: formData.name,
        url: formData.url,
        description: 'DASHBOARD_HERO_SLIDE',
        type: 'slideshow',
        uploadedBy: user.name,
        date: new Date().toLocaleString()
      };

      await db.gallery.insert(payload);
      
      await createAuditLog(user, 'CREATE', 'Dashboard', `New Slide Published: ${formData.name}`);
      setShowUploadModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchSlides();
    } catch (err: any) { alert(`Sync failed: ${getErrorMessage(err)}`); }
    finally { setUploading(false); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSyncing(true);
    try {
      await db.gallery.delete(deleteTarget.id);
      await createAuditLog(user, 'DELETE', 'Dashboard', `Purged Slide: ${deleteTarget.name}`);
      setDeleteTarget(null);
      fetchSlides();
    } catch (err: any) {
      alert(`Delete Failed: ${getErrorMessage(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative max-w-6xl mx-auto">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Updating Cloud State...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Slide Synced</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Live on Dashboard</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/admin/dashboard')} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Dashboard Slides <MonitorPlay className="text-indigo-600" /></h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Manage premium hero images for the main dashboard.</p>
          </div>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest disabled:opacity-50">
          <Plus size={20} /> Add New Slide
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-[3rem] border border-indigo-100 dark:border-indigo-800 flex items-start gap-6 mx-4">
         <div className="w-12 h-12 bg-white dark:bg-slate-800 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
            <ShieldCheck size={24} />
         </div>
         <div>
            <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest mb-1">Curation Policy</h4>
            <p className="text-xs font-medium text-indigo-700/70 dark:text-indigo-400/60 leading-relaxed uppercase">
              These images are strictly for the Dashboard. Regular gallery uploads will NOT appear here. 
              Recommended Aspect Ratio: <b>21:9</b> or <b>Landscape</b> for best results.
            </p>
         </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
          {slides.map((slide) => (
            <div key={slide.id} className="group bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all relative flex flex-col">
               <div className="aspect-[16/9] relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img src={slide.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={slide.name} />
                  <div className="absolute top-4 left-4">
                     <span className="px-3 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">Active Slide</span>
                  </div>
               </div>
               <div className="p-8 flex-1 flex flex-col">
                  <h4 className="font-black text-slate-800 dark:text-white mb-1 uppercase text-sm tracking-tight truncate">{slide.name}</h4>
                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4 mt-auto">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> {slide.date.split(',')[0]}</p>
                     <button onClick={() => setDeleteTarget(slide)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shadow-sm bg-white dark:bg-slate-800"><Trash2 size={18} /></button>
                  </div>
               </div>
            </div>
          ))}
          
          {slides.length === 0 && (
            <div className="col-span-full py-40 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[4rem] flex flex-col items-center justify-center">
               <MonitorPlay size={64} className="text-slate-200 dark:text-slate-800 mb-6" />
               <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tighter">No Active Slides</h3>
               <p className="text-slate-400 uppercase text-[10px] font-bold tracking-widest mt-2">Upload images to enable the dashboard slideshow.</p>
            </div>
          )}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-1 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sync New Slide</h3>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Dashboard Visualization Node</p>
                 </div>
                 <button onClick={() => setShowUploadModal(false)} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-all shadow-sm"><X size={32} /></button>
              </div>
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                 <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-inner border-4 border-white dark:border-slate-800">
                    <img src={formData.url} className="w-full h-full object-cover" alt="Preview" />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slide Heading / Caption</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} 
                      placeholder="ENTER DASHBOARD CAPTION" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" 
                    />
                 </div>

                 <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl uppercase text-[10px]">Discard</button>
                    <button type="submit" disabled={uploading} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                       {uploading ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />} 
                       Sync to Dashboard
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md no-print animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-sm w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-tight">Remove Slide?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] uppercase tracking-widest leading-relaxed">
                Delete <b>{deleteTarget.name}</b> from the dashboard rotation? This image will be permanently purged.
              </p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteTarget(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Keep</button>
                 <button onClick={handleConfirmDelete} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Purge Slide</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SlideshowManager;
