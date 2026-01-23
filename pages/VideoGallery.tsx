
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, MediaAsset } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db, getErrorMessage } from '../supabase';
import { Plus, Search, Trash2, X, Video, Clock, User as UserIcon, Loader2, PlayCircle, AlertTriangle } from 'lucide-react';

interface VideoGalleryProps { user: User; }

const VideoGallery: React.FC<VideoGalleryProps> = ({ user }) => {
  const [videos, setVideos] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const channel = supabase.channel('realtime-videos-v14')
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
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const newVideo = {
          name: file.name.split('.')[0].toUpperCase(),
          url: ev.target?.result as string,
          description: 'Cloud Educational Asset',
          uploadedBy: user.name,
          date: new Date().toLocaleDateString()
        };
        await db.videos.insert(newVideo);
        setUploading(false);
        createAuditLog(user, 'CREATE', 'VideoGallery', `Video Published: ${newVideo.name}`);
      } catch (err) { alert("Video sync failed."); setUploading(false); }
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
      setActiveVideoId(null);
      fetchCloudData();
    } catch (err: any) {
      alert(`Delete Failed: ${getErrorMessage(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredVideos = useMemo(() => videos.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase())), [videos, searchQuery]);
  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Video Vault <Video className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Centralized educational content for all devices.</p>
        </div>
        {canManage && (
          <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest disabled:opacity-50" disabled={uploading}>
            {uploading ? <Loader2 className="animate-spin" /> : <Plus size={20} />} Add Cloud Video
          </button>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileUpload} />
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 max-w-lg">
        <div className="relative w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Search educational videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-16 pr-8 py-4 font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
          <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
          <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Connecting to Video Stream...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredVideos.map((video) => (
            <div key={video.id} className="group bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all hover:-translate-y-2 cursor-pointer relative">
               <div className="aspect-video relative overflow-hidden bg-slate-900" onClick={() => setActiveVideoId(video.id)}>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-slate-900 flex items-center justify-center">
                     <PlayCircle size={64} className="text-white/40 group-hover:text-white transition-all group-hover:scale-110 duration-500" />
                  </div>
               </div>
               <div className="p-8">
                  <h4 className="font-black text-slate-900 dark:text-white text-xl leading-tight group-hover:text-indigo-600 transition-colors uppercase truncate">{video.name}</h4>
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800 mt-4">
                     <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5"><Clock size={12} className="text-indigo-500" /> {video.date}</span>
                     {canManage && <button onClick={() => setDeleteTarget(video)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={18}/></button>}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {activeVideoId && (
        <div className="fixed inset-0 z-[500] bg-slate-950/98 backdrop-blur-xl flex flex-col items-center justify-center p-10 animate-in fade-in">
           <button onClick={() => setActiveVideoId(null)} className="absolute top-10 right-10 p-4 bg-white/10 hover:bg-rose-600 text-white rounded-2xl transition-all"><X size={32}/></button>
           <video src={videos.find(v => v.id === activeVideoId)?.url} controls autoPlay className="max-w-full max-h-[70vh] rounded-[2rem] shadow-2xl" />
           <h3 className="text-3xl font-black text-white mt-10 uppercase tracking-widest leading-tight text-center">{videos.find(v => v.id === activeVideoId)?.name}</h3>
        </div>
      )}

      {/* INSTITUTIONAL VIDEO DELETE CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-tight">Purge Video?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] leading-relaxed uppercase tracking-widest">
                Delete <b>{deleteTarget.name}</b> from the cloud archive? High-bandwidth assets take time to sync.
              </p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteTarget(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={handleConfirmDelete} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Purge Asset</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default VideoGallery;
