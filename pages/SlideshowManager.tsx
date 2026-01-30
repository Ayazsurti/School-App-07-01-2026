
import React, { useState, useRef, useEffect } from 'react';
import { User, MediaAsset } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Trash2, Upload, X, ImageIcon, Clock, Loader2, 
  CheckCircle2, AlertTriangle, Database, MonitorPlay,
  ArrowLeft, RefreshCw, ShieldCheck, Scaling, Sliders, Wand2,
  Maximize, Minimize, StretchHorizontal, MoveHorizontal, MoveRight, MoveLeft, ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon, Sparkles,
  Type, MousePointer2, Users, Eye, Target, Link2,
  PlusCircle, ChevronUp, Edit2
} from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';
import { useNavigate } from 'react-router-dom';

interface SlideshowManagerProps { user: User; }

interface SlideConfig {
  fit: 'cover' | 'contain' | 'fill';
  animation: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up';
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  audience: 'ALL' | 'TEACHER' | 'STUDENT';
}

const SlideshowManager: React.FC<SlideshowManagerProps> = ({ user }) => {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [editingSlide, setEditingSlide] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successText, setSuccessText] = useState('Sync Successful');
  
  const [formData, setFormData] = useState({ name: '', url: '' });
  const [slideConfig, setSlideConfig] = useState<SlideConfig>({
    fit: 'cover',
    animation: 'zoom-in',
    title: '',
    subtitle: '',
    buttonText: '',
    buttonLink: '',
    audience: 'ALL'
  });

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
        date: a.date, uploadedBy: a.uploaded_by,
        description: a.description
      })));
    } catch (err) { console.error("Slideshow Fetch Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchSlides();
    const channel = supabase.channel('realtime-slides-pro-v7')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => {
        setIsSyncing(true);
        fetchSlides().then(() => setTimeout(() => setIsSyncing(false), 800));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getSlideMeta = (description: string): SlideConfig => {
    if (description?.startsWith('CONFIG:')) {
      try {
        const parsed = JSON.parse(description.replace('CONFIG:', ''));
        return { 
          fit: 'cover', animation: 'zoom-in', title: '', subtitle: '', 
          buttonText: '', buttonLink: '', audience: 'ALL', 
          ...parsed 
        };
      } catch (e) {
        return { fit: 'cover', animation: 'zoom-in', title: '', subtitle: '', buttonText: '', buttonLink: '', audience: 'ALL' };
      }
    }
    return { fit: 'cover', animation: 'zoom-in', title: '', subtitle: '', buttonText: '', buttonLink: '', audience: 'ALL' };
  };

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
      setSlideConfig({
        fit: 'cover', animation: 'zoom-in', title: '', subtitle: '', buttonText: '', buttonLink: '', audience: 'ALL'
      });
      setEditingSlide(null);
      setUploading(false);
      setShowUploadModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleEditInit = (slide: MediaAsset) => {
    const config = getSlideMeta(slide.description || '');
    setFormData({ name: slide.name, url: slide.url });
    setSlideConfig(config);
    setEditingSlide(slide);
    setShowUploadModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url || !formData.name) return;
    
    setUploading(true);
    try {
      const configStr = `CONFIG:${JSON.stringify(slideConfig)}`;
      
      if (editingSlide) {
        // UPDATE Existing Slide
        const { error } = await supabase
          .from('gallery')
          .update({
            name: formData.name,
            url: formData.url,
            description: configStr,
            uploaded_by: user.name
          })
          .eq('id', editingSlide.id);
        
        if (error) throw error;
        await createAuditLog(user, 'UPDATE', 'Dashboard', `Updated Pro Slide: ${formData.name}`);
        setSuccessText('Slide Updated Successfully');
      } else {
        // INSERT New Slide
        const payload = { 
          name: formData.name,
          url: formData.url,
          description: configStr,
          type: 'slideshow',
          uploadedBy: user.name,
          date: new Date().toLocaleString()
        };
        await db.gallery.insert(payload);
        await createAuditLog(user, 'CREATE', 'Dashboard', `Published Pro Slide: ${formData.name} for ${slideConfig.audience}`);
        setSuccessText('New Slide Published');
      }

      setShowUploadModal(false);
      setShowSuccess(true);
      setEditingSlide(null);
      setSlideConfig({ fit: 'cover', animation: 'zoom-in', title: '', subtitle: '', buttonText: '', buttonLink: '', audience: 'ALL' });
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
      await createAuditLog(user, 'DELETE', 'Dashboard', `Purged Pro Slide: ${deleteTarget.name}`);
      setDeleteTarget(null);
      fetchSlides();
    } catch (err: any) { alert(`Delete Failed: ${getErrorMessage(err)}`); }
    finally { setIsSyncing(false); }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative max-w-full mx-auto p-4 lg:p-10">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Updating Cloud Node...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">{successText}</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Cloud Sync Finalized</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/admin/dashboard')} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3 uppercase">Slideshow Pro <MonitorPlay className="text-indigo-600" /></h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-xs tracking-[0.4em]">Cinematic Motion & Role-Based Content Matrix</p>
          </div>
        </div>
        <button onClick={() => { setEditingSlide(null); fileInputRef.current?.click(); }} className="px-10 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center gap-3 active:scale-95">
          <PlusCircle size={20} /> Design Pro Slide
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {slides.map((slide) => {
            const meta = getSlideMeta(slide.description || '');
            return (
              <div key={slide.id} className="group bg-white dark:bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all relative flex flex-col">
                 <div className="aspect-video relative overflow-hidden bg-slate-950">
                    <img 
                      src={slide.url} 
                      style={{ objectFit: meta.fit }} 
                      className="w-full h-full" 
                      alt={slide.name} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-6 right-6">
                       <h4 className="text-white font-black uppercase text-xs truncate">{meta.title || slide.name}</h4>
                       <p className="text-white/40 text-[7px] font-bold uppercase tracking-widest mt-1">Target: {meta.audience}</p>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-2">
                       <span className="px-3 py-1 bg-indigo-600 text-white text-[7px] font-black uppercase tracking-widest rounded-lg shadow-lg flex items-center gap-1.5"><Sparkles size={8}/> {meta.animation}</span>
                    </div>
                 </div>
                 <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4 mt-auto">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> {slide.date.split(',')[0]}</p>
                       <div className="flex gap-2">
                          <button onClick={() => handleEditInit(slide)} className="p-3 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors shadow-sm bg-white dark:bg-slate-800"><Edit2 size={18} /></button>
                          <button onClick={() => setDeleteTarget(slide)} className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors shadow-sm bg-white dark:bg-slate-800"><Trash2 size={18} /></button>
                       </div>
                    </div>
                 </div>
              </div>
            );
          })}
          
          {slides.length === 0 && (
            <div className="col-span-full py-40 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[4rem] flex flex-col items-center justify-center opacity-50">
               <MonitorPlay size={80} className="text-slate-200 dark:text-slate-800 mb-6" />
               <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">Identity Canvas Neutral</h3>
               <p className="text-slate-400 uppercase text-[10px] font-bold tracking-widest mt-4">Design your first cinematic motion slide for the dashboard terminal.</p>
            </div>
          )}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-1 shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingSlide ? 'Edit Cinematic Node' : 'Pro Cinematic Lab'}</h3>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Configure Visual Logic Nodes</p>
                 </div>
                 <button onClick={() => setShowUploadModal(false)} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-all shadow-sm"><X size={32} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 flex flex-col gap-10 custom-scrollbar">
                 <div className="space-y-10">
                    <div className="aspect-[21/9] w-full rounded-[2.5rem] overflow-hidden bg-slate-950 shadow-2xl border-4 border-white dark:border-slate-800 relative group flex items-center justify-center">
                       <img 
                          src={formData.url} 
                          style={{ objectFit: slideConfig.fit }}
                          className={`w-full h-full transition-all duration-700 opacity-100`} 
                          alt="Preview" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                        <div className="absolute bottom-6 left-6 right-6">
                           <p className="text-[7px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Simulated Preview</p>
                           <h2 className="text-white font-black text-2xl uppercase tracking-tighter truncate">{slideConfig.title || 'HEADING TOKEN'}</h2>
                           <p className="text-white/60 text-[9px] font-medium uppercase mt-1 truncate">{slideConfig.subtitle || 'Sub-heading content...'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Type size={12}/> Main Heading</label>
                          <input type="text" value={slideConfig.title} onChange={e => setSlideConfig({...slideConfig, title: e.target.value.toUpperCase()})} placeholder="E.G. WELCOME TO CAMPUS" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 font-black uppercase text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner text-xs" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Plus size={12}/> Subheading</label>
                          <input type="text" value={slideConfig.subtitle} onChange={e => setSlideConfig({...slideConfig, subtitle: e.target.value.toUpperCase()})} placeholder="E.G. EXCELLENCE IN EDUCATION" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 font-black uppercase text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner text-xs" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MousePointer2 size={12}/> Button Label</label>
                          <input type="text" value={slideConfig.buttonText} onChange={e => setSlideConfig({...slideConfig, buttonText: e.target.value.toUpperCase()})} placeholder="E.G. EXPLORE MORE" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 font-black uppercase text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner text-xs" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Link2 size={12}/> Redirect Hash</label>
                          <input type="text" value={slideConfig.buttonLink} onChange={e => setSlideConfig({...slideConfig, buttonLink: e.target.value})} placeholder="/admin/gallery" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner text-xs" />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                       <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-4"><Target size={16}/> Target Audience</h4>
                          <div className="grid grid-cols-1 gap-2">
                             {(['ALL', 'TEACHER', 'STUDENT'] as const).map(role => (
                               <button 
                                key={role} 
                                onClick={() => setSlideConfig({...slideConfig, audience: role})}
                                className={`flex items-center gap-4 px-6 py-3 rounded-xl border font-black text-[9px] uppercase transition-all ${slideConfig.audience === role ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-slate-900 border-transparent text-slate-400'}`}
                               >
                                  <Users size={14}/>
                                  {role} IDENTITY NODE
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-4"><Wand2 size={16}/> Motion Suite</h4>
                          <div className="grid grid-cols-1 gap-2">
                             {[
                               { id: 'zoom-in', label: 'Slow Depth Zoom', icon: <ZoomInIcon size={14}/> },
                               { id: 'zoom-out', label: 'Slow Drift Zoom', icon: <ZoomOutIcon size={14}/> },
                               { id: 'pan-left', label: 'Horizontal Pan Left', icon: <MoveLeft size={14}/> },
                               { id: 'pan-right', label: 'Horizontal Pan Right', icon: <MoveRight size={14}/> }
                             ].map(anim => (
                               <button 
                                key={anim.id} 
                                onClick={() => setSlideConfig({...slideConfig, animation: anim.id as any})}
                                className={`flex items-center gap-4 px-6 py-3 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all ${slideConfig.animation === anim.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-slate-900 border-transparent text-slate-400'}`}
                               >
                                  {anim.icon}
                                  {anim.label}
                               </button>
                             ))}
                          </div>
                       </div>
                 </div>
              </div>
              
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 dark:bg-slate-800/30">
                 <button onClick={handleSave} disabled={uploading} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3">
                    {uploading ? <Loader2 className="animate-spin" size={24} /> : <Database size={24} />} 
                    {editingSlide ? 'Update Pro Slide' : 'Commit Pro Slide'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md no-print animate-in fade-in">
           {/* Modal size made extra small as requested: max-w-[320px] */}
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-[320px] w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.2rem] flex items-center justify-center mb-5 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight leading-tight">Purge Slide?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium text-[9px] uppercase tracking-widest leading-relaxed">
                Remove <b>{deleteTarget.name}</b>?
              </p>
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setDeleteTarget(null)} className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl uppercase text-[9px]">Cancel</button>
                 <button onClick={handleConfirmDelete} className="py-3 bg-rose-600 text-white font-black rounded-xl shadow-lg hover:bg-rose-700 transition-all uppercase text-[9px]">Confirm</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SlideshowManager;
