
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, MediaAsset } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db, getErrorMessage } from '../supabase';
import { 
  Plus, Search, Trash2, X, Video, Clock, User as UserIcon, Loader2, PlayCircle, AlertTriangle, 
  Download, Maximize2, ShieldCheck, Database, LayoutGrid, Target, Layers
} from 'lucide-react';

interface VideoGalleryProps { user: User; }

const VideoGallery: React.FC<VideoGalleryProps> = ({ user }) => {
  const [videos, setVideos] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<MediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user.role === 'ADMIN';
  const isStudent = user.role === 'STUDENT';

  const fetchCloudData = async () => {
    try {
      const data = await db.videos.getAll();
      setVideos(data.map((v: any) => ({
        id: v.id, url: v.url, type: 'video', name: v.name, description: v.description,
        uploadedBy: v.uploaded_by, date: v.date
      })));
    } catch (err) { console.error("Video Cloud Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-videos-pro-v14')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
      alert("Institutional videos are restricted to 20MB for cloud optimization.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const newVideo = {
          name: file.name.split('.')[0].toUpperCase(),
          url: ev.target?.result as string,
          description: 'Cloud Educational Asset Node',
          uploadedBy: user.name,
          date: new Date().toLocaleDateString()
        };
        await db.videos.insert(newVideo);
        setUploading(false);
        createAuditLog(user, 'CREATE', 'VideoGallery', `Video Published: ${newVideo.name}`);
        fetchCloudData();
      } catch (err) { alert("Institutional Sync Failed."); setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSyncing(true);
    try {
      await db.videos.delete(deleteTarget.id);
      await createAuditLog(user, 'DELETE', 'VideoGallery', `Purged Video: ${deleteTarget.name}`);
      setDeleteTarget(null);
      setViewingVideo(null);
      fetchCloudData();
    } catch (err: any) { alert(`Purge Failed: ${getErrorMessage(err)}`); }
    finally { setIsSyncing(false); }
  };

  const filteredVideos = useMemo(() => videos.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase())), [videos, searchQuery]);
  const canManage = isAdmin || user.role === 'TEACHER';

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-500 relative max-w-[1500px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-4 lg:px-0">
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
              <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em]">Streaming Node</p>
           </div>
           <div>
              <h1 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4 uppercase leading-none">Video Vault <Video className="text-indigo-600" size={48} /></h1>
              <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-sm tracking-widest max-w-2xl">Educational cinematography and institutional broadcast archives.</p>
           </div>
        </div>
        {canManage && (
          <button onClick={() => fileInputRef.current?.click()} className="px-12 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest disabled:opacity-50 active:scale-95 border-b-4 border-indigo-800" disabled={uploading}>
            {uploading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} strokeWidth={3} />} Synchronize Data
          </button>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileUpload} />
      </div>

      <div className="mx-4 lg:mx-0">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[3.5rem] shadow-xl border border-white dark:border-slate-800 max-w-2xl flex items-center gap-6">
            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
               <Search size={28} />
            </div>
            <input 
              type="text" 
              placeholder="SEARCH STREAMING ASSETS..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-transparent border-none font-black outline-none dark:text-white uppercase text-lg tracking-tight placeholder:text-slate-300 dark:placeholder:text-slate-700" 
            />
        </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center">
           <div className="relative">
              <div className="w-24 h-24 border-8 border-indigo-100 dark:border-indigo-900/30 rounded-full"></div>
              <div className="absolute inset-0 w-24 h-24 border-t-8 border-indigo-600 rounded-full animate-spin"></div>
           </div>
           <p className="mt-10 font-black text-[10px] uppercase tracking-[0.5em] text-slate-400 animate-pulse">Syncing Video Pipeline...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 px-4 lg:px-0">
          {filteredVideos.map((video) => (
            <div key={video.id} className="group bg-white dark:bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-lg border-4 border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:shadow-2xl transition-all duration-500 relative flex flex-col cursor-pointer" onClick={() => setViewingVideo(video)}>
               <div className="aspect-video relative overflow-hidden bg-slate-950">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-slate-950/40 to-slate-950 flex items-center justify-center">
                     <div className="bg-white/10 backdrop-blur-md p-8 rounded-full border border-white/20 group-hover:scale-125 group-hover:bg-indigo-600 transition-all duration-700">
                        <PlayCircle size={64} className="text-white fill-white/20" />
                     </div>
                  </div>
                  <div className="absolute bottom-6 left-8">
                     <span className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-xl">High Fidelity</span>
                  </div>
               </div>
               <div className="p-10 flex-1 flex flex-col">
                  <h4 className="font-black text-slate-900 dark:text-white text-2xl leading-tight group-hover:text-indigo-600 transition-colors uppercase truncate mb-4">{video.name}</h4>
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800 mt-auto">
                     <div className="flex flex-col gap-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> {video.date}</p>
                        <p className="text-[7px] font-bold text-indigo-500 uppercase tracking-widest">BY {video.uploadedBy}</p>
                     </div>
                     {isAdmin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(video); }} 
                          className="p-3 text-rose-500 bg-slate-50 dark:bg-slate-800 hover:bg-rose-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-90"
                        >
                           <Trash2 size={18}/>
                        </button>
                     )}
                  </div>
               </div>
            </div>
          ))}
          {filteredVideos.length === 0 && (
             <div className="col-span-full py-40 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[4rem] flex flex-col items-center justify-center opacity-30 animate-pulse">
                <Video size={80} className="mb-6 text-slate-200 dark:text-slate-700" />
                <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">Vault Terminal Empty</h3>
                <p className="text-slate-400 uppercase text-[10px] font-bold tracking-[0.4em] mt-4">No video assets found in cloud registry.</p>
             </div>
          )}
        </div>
      )}

      {/* COMPACT VIDEO WINDOW VIEWER */}
      {viewingVideo && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                       <Video size={18}/>
                    </div>
                    <div className="min-w-0">
                       <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{viewingVideo.name}</h3>
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Broadcast Node • {viewingVideo.date}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <a href={viewingVideo.url} download className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Download size={16}/></a>
                    <button onClick={() => setViewingVideo(null)} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><X size={20}/></button>
                 </div>
              </div>
              
              {/* Video Area */}
              <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-hidden p-2">
                 <video src={viewingVideo.url} controls autoPlay className="max-w-full max-h-full rounded-2xl" />
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-900/10 dark:bg-slate-950 flex items-center justify-center gap-4 opacity-40">
                 <ShieldCheck size={14} className="text-indigo-400"/>
                 <span className="text-[7px] font-black uppercase tracking-[0.3em] text-slate-500">Secure Institutional Streaming Node</span>
              </div>
           </div>
        </div>
      )}

      {/* SMALL DELETE CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-[320px] w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.2rem] flex items-center justify-center mb-5 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight leading-tight">Purge Stream?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium text-[9px] uppercase tracking-widest leading-relaxed">Permanently remove <b>{deleteTarget.name}</b>?</p>
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setDeleteTarget(null)} className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl uppercase text-[9px]">Keep</button>
                 <button onClick={handleConfirmDelete} className="py-3 bg-rose-600 text-white font-black rounded-xl shadow-lg hover:bg-rose-700 transition-all uppercase text-[9px]">Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default VideoGallery;
