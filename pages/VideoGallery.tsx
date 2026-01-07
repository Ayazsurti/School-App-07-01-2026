import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, MediaAsset } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Upload, 
  Play, 
  X, 
  Maximize2, 
  Video, 
  Clock, 
  User as UserIcon, 
  Grid, 
  List, 
  AlertCircle, 
  AlertTriangle, 
  PlayCircle, 
  Share2, 
  Bookmark 
} from 'lucide-react';

interface VideoGalleryProps { user: User; }

interface UploadQueueItem {
  file: File;
  preview: string;
  title: string;
  description: string;
  progress: number;
}

const VideoGallery: React.FC<VideoGalleryProps> = ({ user }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFullTimestamp = (date: Date) => {
    return date.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).replace(',', ' •');
  };

  const [videos, setVideos] = useState<MediaAsset[]>(() => {
    const saved = localStorage.getItem('school_video_gallery');
    if (saved) return JSON.parse(saved);
    
    return [
      {
        id: 'v1',
        url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
        type: 'video',
        name: 'Annual Sports Highlights 2024',
        description: 'Exclusive cinematic highlights from our latest Sports Day event held at the Olympic Stadium.',
        date: '25 May 2024 • 09:00 AM',
        uploadedBy: 'Admin'
      },
      {
        id: 'v2',
        url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
        type: 'video',
        name: 'Chemistry Lab: Practical Safety',
        description: 'Educational guide on standard safety protocols for class 10 students.',
        date: '22 May 2024 • 11:30 AM',
        uploadedBy: 'Staff Admin'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('school_video_gallery', JSON.stringify(videos));
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const content = `${v.name} ${v.description || ''}`.toLowerCase();
      return content.includes(searchQuery.toLowerCase());
    });
  }, [videos, searchQuery]);

  const activeVideo = useMemo(() => videos.find(v => v.id === activeVideoId), [videos, activeVideoId]);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Explicitly typed file as File to resolve unknown type inference in forEach
      Array.from(e.target.files).forEach((file: File) => {
        if (!file.type.startsWith('video/')) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadQueue(prev => [...prev, {
            file,
            preview: event.target?.result as string,
            title: file.name.split('.')[0],
            description: '',
            progress: 0
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const processUpload = () => {
    if (uploadQueue.length === 0) return;
    setUploading(true);
    
    setTimeout(() => {
      const timestamp = formatFullTimestamp(new Date());
      const newVideos: MediaAsset[] = uploadQueue.map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        url: item.preview,
        type: 'video',
        name: item.title,
        description: item.description,
        date: timestamp,
        uploadedBy: user.name
      }));
      
      setVideos(prev => [...newVideos, ...prev]);
      setUploading(false);
      setUploadQueue([]);
      setShowUploadModal(false);
    }, 1500);
  };

  const confirmDelete = () => {
    if (deleteConfirmationId) {
      setVideos(videos.filter(v => v.id !== deleteConfirmationId));
      if (activeVideoId === deleteConfirmationId) setActiveVideoId(null);
      setDeleteConfirmationId(null);
    }
  };

  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Theater Mode Viewer */}
      {activeVideo && (
        <div className="fixed inset-0 z-[300] bg-slate-950/98 backdrop-blur-xl flex flex-col items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
          <div className="absolute top-8 right-8 flex items-center gap-4">
             <button className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all"><Share2 size={24} /></button>
             <button className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all"><Bookmark size={24} /></button>
             <div className="w-px h-8 bg-white/10 mx-2" />
             <button 
              onClick={() => setActiveVideoId(null)}
              className="p-3 bg-white/10 hover:bg-indigo-600 text-white rounded-2xl transition-all z-10"
            >
              <X size={28} />
            </button>
          </div>

          <div className="w-full max-w-6xl flex flex-col items-center justify-center gap-10">
            <div className="w-full aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.2)] border border-white/10 relative group">
              <video 
                src={activeVideo.url} 
                className="w-full h-full" 
                controls 
                autoPlay 
              />
            </div>
            
            <div className="w-full text-center space-y-4">
              <h3 className="text-4xl font-black text-white tracking-tight leading-tight">{activeVideo.name}</h3>
              <p className="text-white/60 text-lg font-medium max-w-3xl mx-auto">{activeVideo.description}</p>
              <div className="flex items-center justify-center gap-8 text-[10px] font-black text-white/30 uppercase tracking-[0.3em] pt-4">
                <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10"><Clock size={16} className="text-indigo-400" /> Published: {activeVideo.date}</span>
                <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10"><UserIcon size={16} className="text-indigo-400" /> Posted by {activeVideo.uploadedBy}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Erase Video?</h3>
            <p className="text-slate-500 font-medium mb-8">This educational asset will be permanently removed from school servers.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmationId(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-1 shadow-2xl max-w-3xl w-full">
            <div className="p-8 flex justify-between items-center border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Video Sync</h3>
                <p className="text-sm text-slate-500 font-medium">Publish educational or event videos to the gallery</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
            </div>

            <div className="p-8 space-y-6">
              {uploadQueue.length === 0 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-16 text-center hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer group bg-slate-50/50"
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileSelection} className="hidden" accept="video/*" />
                  <Video size={64} className="mx-auto text-indigo-200 mb-6 group-hover:scale-110 transition-transform" />
                  <h4 className="text-xl font-black text-slate-800">Select Video Content</h4>
                  <p className="text-slate-500 font-medium mt-1">MP4, WebM or MOV (Max 50MB)</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {uploadQueue.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 flex gap-6">
                      <div className="w-40 aspect-video bg-slate-900 rounded-2xl flex items-center justify-center text-white flex-shrink-0">
                        <Play size={24} fill="currentColor" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <input 
                          type="text" 
                          value={item.title}
                          onChange={(e) => setUploadQueue(prev => prev.map((it, i) => i === idx ? {...it, title: e.target.value} : it))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800"
                          placeholder="Video Title..."
                        />
                        <textarea 
                          value={item.description}
                          onChange={(e) => setUploadQueue(prev => prev.map((it, i) => i === idx ? {...it, description: e.target.value} : it))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 resize-none"
                          placeholder="Brief description of the content..."
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/30 rounded-b-[2.5rem] flex gap-4">
              <button onClick={() => { setShowUploadModal(false); setUploadQueue([]); }} className="flex-1 py-4 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200">Discard</button>
              <button 
                onClick={processUpload} 
                disabled={uploading || uploadQueue.length === 0}
                className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {uploading ? 'Processing Video...' : `Publish to Gallery (${uploadQueue.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Content */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Video Gallery</h1>
          <p className="text-slate-500 font-medium text-lg">Watch and learn from our curated collection of school life.</p>
        </div>
        {canManage && (
          <button 
            onClick={() => { setUploadQueue([]); setShowUploadModal(true); }}
            className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-200 flex items-center gap-3 hover:-translate-y-1 transition-all"
          >
            <Plus size={20} strokeWidth={3} /> Post Video
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="relative w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Find videos by title or topic..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-8 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Video Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredVideos.map((video) => (
            <div 
              key={video.id} 
              onClick={() => setActiveVideoId(video.id)}
              className="group bg-white rounded-[3rem] overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-indigo-100/30 transition-all hover:-translate-y-2 cursor-pointer relative"
            >
              <div className="aspect-video relative overflow-hidden bg-slate-900">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-slate-900 flex items-center justify-center">
                   <PlayCircle size={64} className="text-white/40 group-hover:text-white transition-all group-hover:scale-110 duration-500" />
                </div>
                
                <div className="absolute top-6 left-6 flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-black/50 backdrop-blur rounded-xl text-[9px] font-black text-white uppercase tracking-widest border border-white/10">
                    HD 1080p
                  </div>
                </div>

                {canManage && (
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(video.id); }}
                      className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
                
                <div className="absolute bottom-6 right-6 px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black tracking-widest uppercase">
                  VIDEO
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h4 className="font-black text-slate-900 text-xl leading-tight group-hover:text-indigo-600 transition-colors">{video.name}</h4>
                </div>
                <p className="text-slate-500 text-sm line-clamp-2 mb-6 font-medium leading-relaxed">{video.description}</p>
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex flex-col gap-1 min-w-0 pr-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Posted on</span>
                    <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5 truncate">
                      <Clock size={12} className="text-indigo-500 flex-shrink-0" /> {video.date}
                    </span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">By</span>
                    <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5">
                      <UserIcon size={12} className="text-indigo-500 flex-shrink-0" /> {video.uploadedBy.split(' ')[0]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] p-24 text-center border shadow-sm flex flex-col items-center">
          <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mb-6">
            <Video size={48} />
          </div>
          <h3 className="text-2xl font-black text-slate-800">No videos found</h3>
          <p className="text-slate-400 font-medium">Try adjusting your search filters or check back later.</p>
        </div>
      )}
    </div>
  );
};

export default VideoGallery;