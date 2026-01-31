
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, MediaAsset } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Search, Trash2, Upload, X, Maximize2, Image as ImageIcon, Clock, Loader2, Edit2, CheckCircle2, 
  AlertTriangle, Save, RefreshCw, ShieldCheck, Database, CheckSquare, Square, Layers, PlayCircle, Video, Target, Lock,
  Download, ChevronLeft, ChevronRight, Share2, ZoomIn, Type, FileText, LayoutGrid
} from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';

interface MediaGalleryProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];

const SECTIONS_LIST = ['A', 'B', 'C', 'D'];

const MediaGallery: React.FC<MediaGalleryProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  const isStudent = user.role === 'STUDENT';
  
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
  const [viewingAsset, setViewingAsset] = useState<MediaAsset | null>(null);
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
    const channel = supabase.channel('realtime-gallery-pro-v22')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert("Asset too large. Please upload files under 10MB.");
      return;
    }

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
    if (!formData.url || targetClasses.length === 0 || targetSections.length === 0) {
      if(targetClasses.length === 0) alert("Please select at least one Target Node.");
      if(targetSections.length === 0) alert("Please select at least one Section Node.");
      return;
    }
    
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
      await createAuditLog(user, 'CREATE', 'Gallery', `Cloud Sync: ${formData.type.toUpperCase()} to ${targetClasses.length} nodes`);
      setShowFormModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchCloudData();
    } catch (err) { alert("Institutional Sync Failed."); }
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
    } catch (err) { alert("Archive Sync Failed."); }
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
        
        const studentNum = studentClass.match(/\d+/)?.[0];
        const matchesFuzzy = targets.some(t => t.match(/\d+/)?.[0] === studentNum);

        return nameMatch && (targets.includes(studentClass) || matchesFuzzy) && sections.includes(studentSection);
      }
      return nameMatch;
    });
  }, [assets, searchQuery, isStudent, user]);

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700 relative max-w-[1600px] mx-auto">
      {/* SUCCESS POPUP */}
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500 no-print">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-5 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={28} strokeWidth={3} />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Repository Synced</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-1">Cloud Update Dispatched</p>
              </div>
           </div>
        </div>
      )}

      {/* COMPACT ASSET MODAL VIEWER */}
      {viewingAsset && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                       {viewingAsset.type === 'video' ? <Video size={18}/> : <ImageIcon size={18}/>}
                    </div>
                    <div className="min-w-0">
                       <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{viewingAsset.name}</h3>
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Archived {viewingAsset.date.split(',')[0]}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <a href={viewingAsset.url} download={viewingAsset.name} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Download size={16}/></a>
                    <button onClick={() => setViewingAsset(null)} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><X size={20}/></button>
                 </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden p-2">
                 {viewingAsset.type === 'video' ? (
                    <video src={viewingAsset.url} controls autoPlay className="max-w-full max-h-full rounded-2xl" />
                 ) : (
                    <img src={viewingAsset.url} className="max-w-full max-h-full object-contain rounded-2xl" alt={viewingAsset.name} />
                 )}
              </div>
              
              {/* Footer info if description exists */}
              {viewingAsset.description && !viewingAsset.description.startsWith('[IDENTITY_NODE') && (
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic text-center">"{viewingAsset.description}"</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-4 lg:px-0">
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
              <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">Institutional Archive</p>
           </div>
           <div>
              <h1 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight">Campus Gallery.</h1>
              <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-sm tracking-widest leading-relaxed max-w-2xl">
                 {isStudent ? `Standard ${user.class}-${user.section} Unified Media Stream • High-Fidelity Visual Records.` : 'Unified management terminal for institutional photography and cinematography.'}
              </p>
           </div>
        </div>
        {!isStudent && (
          <div className="flex gap-4">
             <button onClick={() => fileInputRef.current?.click()} className="px-12 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest flex items-center gap-3 active:scale-95 border-b-4 border-indigo-800">
                <Plus size={20} strokeWidth={3} /> Sync New Data
             </button>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
      </div>

      {/* SEARCH BAR */}
      <div className="mx-4 lg:mx-0">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[3.5rem] shadow-xl border border-white dark:border-slate-800 flex items-center gap-6">
            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-600 shrink-0">
               <Search size={28} />
            </div>
            <input 
              type="text" 
              placeholder="SEARCH ASSET REPOSITORY BY NAME OR DATE..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-transparent border-none font-black outline-none dark:text-white uppercase text-lg tracking-tight placeholder:text-slate-300 dark:placeholder:text-slate-700" 
            />
            <div className="hidden lg:flex items-center gap-3 text-slate-300 dark:text-slate-700 font-black text-[10px] uppercase whitespace-nowrap">
               <Layers size={18}/>
               {filteredAssets.length} Results
            </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center">
           <div className="relative">
              <div className="w-24 h-24 border-8 border-indigo-100 dark:border-indigo-900/30 rounded-full"></div>
              <div className="absolute inset-0 w-24 h-24 border-t-8 border-indigo-600 rounded-full animate-spin"></div>
           </div>
           <p className="mt-10 font-black text-[10px] uppercase tracking-[0.5em] text-slate-400 animate-pulse">Establishing Cloud Uplink...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 px-4 lg:px-0">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="group bg-white dark:bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-lg border-4 border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:shadow-2xl transition-all duration-500 relative flex flex-col cursor-pointer" onClick={() => setViewingAsset(asset)}>
               <div className="aspect-[4/3] relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {asset.type === 'video' ? (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                       <div className="absolute inset-0 bg-indigo-900/10 opacity-40"></div>
                       <div className="z-10 bg-white/10 backdrop-blur-md p-6 rounded-full border border-white/20 group-hover:scale-125 group-hover:bg-indigo-600 transition-all duration-700">
                          <PlayCircle size={48} className="text-white fill-white/20" />
                       </div>
                       <div className="absolute bottom-4 left-6 px-3 py-1 bg-rose-600 text-white rounded-lg text-[8px] font-black uppercase flex items-center gap-1.5 shadow-xl">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div> HIGH BITRATE VIDEO
                       </div>
                    </div>
                  ) : (
                    <img src={asset.url} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt={asset.name} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                     <div className="flex items-center gap-3 text-white">
                        <Maximize2 size={24} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Quick View</span>
                     </div>
                  </div>
               </div>
               <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-4 mb-2">
                     <h4 className="font-black text-slate-800 dark:text-white leading-tight uppercase text-lg truncate flex-1">{asset.name}</h4>
                     <div className={`p-2 rounded-xl ${asset.type === 'video' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'} shadow-inner`}>
                        {asset.type === 'video' ? <Video size={14}/> : <ImageIcon size={14}/>}
                     </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50 dark:border-slate-800">
                     <div className="flex flex-col gap-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={10}/> {asset.date.split(',')[0]}</p>
                        <p className="text-[7px] font-bold text-indigo-500 uppercase tracking-widest">TAGGED: {asset.uploadedBy}</p>
                     </div>
                     {isAdmin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(asset); }} 
                          className="p-3 text-rose-500 bg-slate-50 dark:bg-slate-800 hover:bg-rose-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-90"
                        >
                           <Trash2 size={16} />
                        </button>
                     )}
                  </div>
               </div>
            </div>
          ))}
          
          {filteredAssets.length === 0 && (
             <div className="col-span-full py-40 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[4rem] flex flex-col items-center justify-center opacity-30 animate-pulse">
                <ImageIcon size={80} className="mb-6 text-slate-200 dark:text-slate-700" />
                <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">Vault Terminal Empty</h3>
                <p className="text-slate-400 uppercase text-[10px] font-bold tracking-[0.4em] mt-4 text-center">No visual data packets found for your identity profile.</p>
             </div>
          )}
        </div>
      )}

      {/* FORM MODAL - UPLOAD */}
      {showFormModal && !isStudent && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-300 no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-1 shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-white dark:border-slate-800 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cloud Dispatch Console</h3>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Identity-Scoped Media Matrix</p>
                 </div>
                 <button onClick={() => setShowFormModal(false)} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-all shadow-sm"><X size={32} /></button>
              </div>
              
              <form onSubmit={handleSave} className="p-10 space-y-12 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-900">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                       <div className="aspect-video rounded-[2.5rem] overflow-hidden bg-slate-950 shadow-2xl border-4 border-white dark:border-slate-800 relative group flex items-center justify-center">
                          {formData.type === 'video' ? (
                            <video src={formData.url} className="w-full h-full object-cover" controls />
                          ) : (
                            <img src={formData.url} className="w-full h-full object-cover" alt="Preview" />
                          )}
                          <div className="absolute top-4 left-4">
                             <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-xl border border-white/20">{formData.type} LOADED</span>
                          </div>
                       </div>
                       
                       <div className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Type size={14}/> Asset Identifier</label>
                             <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="E.G. SPORTS DAY 2026 - EVENT 01" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-8 py-5 font-black uppercase text-base text-indigo-600 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner" />
                          </div>
                          
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><FileText size={14}/> Asset Description</label>
                             <textarea 
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})} 
                                placeholder="TYPE DETAILED DESCRIPTION HERE..." 
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-8 py-5 font-medium uppercase text-sm text-slate-600 dark:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner min-h-[120px] resize-none"
                             />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-8">
                       <div className="space-y-6">
                          <div className="space-y-4">
                             <div className="flex justify-between items-center px-1">
                                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Target size={14}/> Target Identity Nodes</h4>
                                <button type="button" onClick={() => setTargetClasses(targetClasses.length === authorizedClasses.length ? [] : [...authorizedClasses])} className="text-[9px] font-black text-slate-400 uppercase hover:text-indigo-600 transition-colors">Select All Nodes</button>
                             </div>
                             <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-2 p-1">
                                {authorizedClasses.map(cls => (
                                  <button 
                                   key={cls} 
                                   type="button" 
                                   onClick={() => setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls])} 
                                   className={`px-4 py-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[0.98]' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-indigo-100'}`}
                                  >
                                     <span className="text-[9px] font-black uppercase truncate">{cls}</span>
                                     {targetClasses.includes(cls) && <CheckCircle2 size={14} strokeWidth={3}/>}
                                  </button>
                                ))}
                             </div>
                          </div>

                          <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                             <div className="flex justify-between items-center px-1">
                                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={14}/> Target Sections</h4>
                                <button type="button" onClick={() => setTargetSections(targetSections.length === SECTIONS_LIST.length ? [] : [...SECTIONS_LIST])} className="text-[9px] font-black text-slate-400 uppercase hover:text-indigo-600 transition-colors">All Sec</button>
                             </div>
                             <div className="grid grid-cols-4 gap-2">
                                {SECTIONS_LIST.map(sec => (
                                   <button 
                                    key={sec} 
                                    type="button" 
                                    onClick={() => setTargetSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec])}
                                    className={`py-3 rounded-xl border-2 transition-all font-black text-[10px] uppercase ${targetSections.includes(sec) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                   >
                                      SEC {sec}
                                   </button>
                                ))}
                             </div>
                          </div>
                       </div>
                       
                       <div className="p-8 bg-indigo-50 dark:bg-indigo-950/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800 space-y-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><ShieldCheck size={20}/></div>
                             <p className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-widest">Authorized Transmission</p>
                          </div>
                          <p className="text-[9px] font-medium text-indigo-700/60 dark:text-indigo-400/60 leading-relaxed uppercase tracking-wider">Asset will only be visible to identities within selected standard nodes and sections. Cross-node privacy is in effect.</p>
                       </div>
                    </div>
                 </div>
              </form>
              
              <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
                 <button 
                  onClick={handleSave} 
                  disabled={uploading || targetClasses.length === 0 || targetSections.length === 0}
                  className="w-full lg:w-auto px-20 py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all uppercase text-sm tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-50"
                 >
                    {uploading ? <Loader2 className="animate-spin" size={24} /> : <Database size={24} />} 
                    Finalize & Commit Asset
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* SMALL DELETE DIALOG */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-[320px] w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.2rem] flex items-center justify-center mb-5 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight leading-tight">Purge Data?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium text-[9px] uppercase tracking-widest leading-relaxed">Permanently remove <b>{deleteTarget.name}</b>?</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteTarget(null)} className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl uppercase text-[9px]">Cancel</button>
                 <button onClick={handleConfirmDelete} className="py-3 bg-rose-600 text-white font-black rounded-xl shadow-lg hover:bg-rose-700 transition-all uppercase text-[9px]">Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
