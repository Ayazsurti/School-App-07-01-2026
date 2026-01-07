
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
  Image as ImageIcon, 
  Video, 
  Clock, 
  User as UserIcon,
  Grid,
  List,
  AlertCircle,
  AlertTriangle,
  FileText,
  Check,
  AlignLeft,
  FileIcon
} from 'lucide-react';

interface MediaGalleryProps { user: User; }

interface UploadQueueItem {
  file: File;
  preview: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  progress: number;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ user }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to format date and time consistently
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

  // Initialize assets from localStorage to ensure they are saved permanently
  const [assets, setAssets] = useState<MediaAsset[]>(() => {
    const saved = localStorage.getItem('school_gallery_assets');
    if (saved) return JSON.parse(saved);
    
    // Default initial data if nothing is saved
    return [
      {
        id: '1',
        url: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=800',
        type: 'image',
        name: 'Annual Sports Day - Track Event',
        description: 'Students participating in the 100m sprint finals at the main stadium.',
        date: '24 May 2024 • 10:30 AM',
        uploadedBy: 'Admin'
      },
      {
        id: '2',
        url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800',
        type: 'image',
        name: 'Class of 2024 Group Photo',
        description: 'The graduating class of 2024 gathered for a final group photo in the courtyard.',
        date: '20 May 2024 • 02:15 PM',
        uploadedBy: 'Principal'
      },
      {
        id: '3',
        url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800',
        type: 'image',
        name: 'Science Exhibition Winners',
        description: 'Congratulations to our junior scientists for their award-winning volcano project.',
        date: '15 May 2024 • 11:00 AM',
        uploadedBy: 'Dr. Emily Vance'
      }
    ];
  });

  // Persist assets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('school_gallery_assets', JSON.stringify(assets));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const content = `${asset.name} ${asset.description || ''}`.toLowerCase();
      const matchesSearch = content.includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || asset.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [assets, searchQuery, filterType]);

  const activeAsset = useMemo(() => assets.find(a => a.id === activeMediaId), [assets, activeMediaId]);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addToQueue(e.target.files);
  };

  const addToQueue = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const type = file.type.startsWith('video') ? 'video' : 'image';
        setUploadQueue(prev => [...prev, {
          file,
          preview: event.target?.result as string,
          title: file.name.split('.')[0],
          description: '',
          type: type as 'image' | 'video',
          progress: 0
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFromQueue = (index: number) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index));
  };

  const updateQueueField = (index: number, field: 'title' | 'description', value: string) => {
    setUploadQueue(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const processUpload = () => {
    if (uploadQueue.length === 0) return;
    setUploading(true);
    
    // Simulate gradual progress for each item
    const interval = setInterval(() => {
      setUploadQueue(prev => prev.map(item => ({
        ...item,
        progress: Math.min(100, item.progress + Math.random() * 30)
      })));
    }, 400);

    setTimeout(() => {
      clearInterval(interval);
      const timestamp = formatFullTimestamp(new Date());
      const newAssets: MediaAsset[] = uploadQueue.map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        url: item.preview,
        type: item.type,
        name: item.title,
        description: item.description,
        date: timestamp,
        uploadedBy: user.name
      }));
      
      setAssets(prev => [...newAssets, ...prev]);
      setUploading(false);
      setUploadQueue([]);
      setShowUploadModal(false);
    }, 2000);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addToQueue(e.dataTransfer.files);
  };

  const confirmDelete = () => {
    if (deleteConfirmationId) {
      setAssets(assets.filter(a => a.id !== deleteConfirmationId));
      if (activeMediaId === deleteConfirmationId) setActiveMediaId(null);
      setDeleteConfirmationId(null);
    }
  };

  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Lightbox Viewer */}
      {activeAsset && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute top-6 right-6 flex items-center gap-3">
            {canManage && (
              <button 
                onClick={() => setDeleteConfirmationId(activeAsset.id)}
                className="p-3 bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl transition-all z-10 flex items-center gap-2 font-bold text-sm border border-rose-500/30"
                title="Delete this item"
              >
                <Trash2 size={20} /> Delete
              </button>
            )}
            <button 
              onClick={() => setActiveMediaId(null)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all z-10"
              title="Close viewer"
            >
              <X size={24} />
            </button>
          </div>

          <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center">
            <div className="relative w-full flex-1 flex items-center justify-center">
              {activeAsset.type === 'image' ? (
                <img src={activeAsset.url} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95" alt={activeAsset.name} />
              ) : (
                <video src={activeAsset.url} className="max-w-full max-h-full rounded-xl shadow-2xl" controls autoPlay />
              )}
            </div>
            
            <div className="mt-8 text-center text-white space-y-3 max-w-2xl px-4">
              <h3 className="text-3xl font-black">{activeAsset.name}</h3>
              {activeAsset.description && (
                <p className="text-white/80 font-medium leading-relaxed">{activeAsset.description}</p>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-sm text-white/40 font-bold uppercase tracking-widest pt-2">
                <span className="flex items-center gap-2"><Clock size={16} /> Posted {activeAsset.date}</span>
                <span className="flex items-center gap-2"><UserIcon size={16} /> By {activeAsset.uploadedBy}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Media?</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">This file will be permanently removed from the school records. This action cannot be reversed.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmationId(null)} 
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-step Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-1 shadow-2xl animate-in zoom-in-95 duration-200 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-8 flex justify-between items-center border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sync Media Library</h3>
                <p className="text-sm text-slate-500 font-medium">Add new memories with detailed descriptions</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
              {uploadQueue.length === 0 ? (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-4 border-dashed rounded-[3rem] p-16 text-center transition-all cursor-pointer group relative overflow-hidden h-[450px] flex flex-col items-center justify-center bg-white ${isDragging ? 'border-indigo-600 bg-indigo-50/50 scale-102' : 'border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/20 shadow-sm'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileSelection} className="hidden" multiple accept="image/*,video/*" />
                  <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl shadow-indigo-100 group-hover:scale-110 transition-transform">
                    <Upload size={40} strokeWidth={3} />
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 tracking-tight">Drop school files here</h4>
                  <p className="text-slate-500 font-medium mt-2">Images or MP4 Videos supported</p>
                  <div className="mt-8 px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Select From Device</div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{uploadQueue.length} Assets in Queue</span>
                    {!uploading && (
                      <button onClick={() => setUploadQueue([])} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-xl transition-colors">Discard Queue</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {uploadQueue.map((item, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 flex flex-col md:flex-row gap-8 animate-in slide-in-from-bottom-2 duration-300 shadow-sm relative overflow-hidden">
                        {/* Progress Overlay/Bar */}
                        {uploading && (
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}

                        <div className="w-full md:w-56 h-56 rounded-[2rem] overflow-hidden flex-shrink-0 bg-slate-100 border-4 border-slate-50 shadow-md relative group">
                          {item.type === 'image' ? (
                            <img src={item.preview} className="w-full h-full object-cover" alt="Preview" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                              <Video size={40} />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 px-3 py-1 bg-white/95 backdrop-blur rounded-xl text-[9px] font-black uppercase tracking-[0.15em] text-indigo-600 shadow-sm border border-indigo-50">
                            {item.type}
                          </div>
                          {!uploading && (
                            <button 
                              onClick={() => removeFromQueue(idx)}
                              className="absolute top-3 right-3 w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
                            >
                              <X size={18} strokeWidth={3} />
                            </button>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col justify-center space-y-5">
                          <div className="flex flex-col gap-1 px-1">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              <FileIcon size={12} className="text-indigo-400" /> Source: <span className="text-slate-900 lowercase font-bold">{item.file.name}</span>
                            </div>
                            <div className="relative group/field">
                              <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/field:text-indigo-500 transition-colors" />
                              <input 
                                type="text" 
                                value={item.title}
                                disabled={uploading}
                                onChange={(e) => updateQueueField(idx, 'title', e.target.value)}
                                placeholder="Media Title..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] pl-12 pr-4 py-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all focus:bg-white disabled:opacity-50"
                              />
                            </div>
                          </div>

                          <div className="relative group/field px-1">
                            <AlignLeft size={16} className="absolute left-5 top-5 text-slate-400 group-focus-within/field:text-indigo-500 transition-colors" />
                            <textarea 
                              value={item.description}
                              disabled={uploading}
                              onChange={(e) => updateQueueField(idx, 'description', e.target.value)}
                              placeholder="Write a descriptive caption for the school gallery..."
                              rows={2}
                              className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] pl-12 pr-4 py-4 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none focus:bg-white disabled:opacity-50"
                            />
                          </div>

                          {uploading && (
                            <div className="flex items-center justify-between px-2">
                              <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" /> Synchronizing...
                              </span>
                              <span className="text-[10px] font-black text-slate-400">{Math.round(item.progress)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {!uploading && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 bg-white rounded-[2.5rem] flex flex-col items-center justify-center p-12 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all text-slate-400 hover:text-indigo-600 group"
                      >
                        <Plus size={48} className="mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Add more school memories</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex gap-4 no-print">
              <button 
                onClick={() => { setShowUploadModal(false); setUploadQueue([]); }} 
                disabled={uploading}
                className="flex-1 py-5 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={processUpload} 
                disabled={uploading || uploadQueue.length === 0}
                className={`flex-[2] py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest ${uploading || uploadQueue.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700 hover:-translate-y-1 active:scale-[0.98]'}`}
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Syncing Assets...
                  </>
                ) : (
                  <>
                    <Check size={20} strokeWidth={3} />
                    Finalize Upload ({uploadQueue.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gallery</h1>
          <p className="text-slate-500 font-medium text-lg">Visual stories from our campus and events.</p>
        </div>
        {canManage && (
          <button 
            onClick={() => { setUploadQueue([]); setShowUploadModal(true); }}
            className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center gap-3 hover:bg-indigo-700 transition-all hover:-translate-y-1 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} /> Add Content
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by title or description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-6 py-3 text-xs font-black uppercase tracking-[0.2em] rounded-xl transition-all ${filterType === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilterType('image')}
            className={`px-6 py-3 text-xs font-black uppercase tracking-[0.2em] rounded-xl transition-all ${filterType === 'image' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Photos
          </button>
          <button 
            onClick={() => setFilterType('video')}
            className={`px-6 py-3 text-xs font-black uppercase tracking-[0.2em] rounded-xl transition-all ${filterType === 'video' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Videos
          </button>
        </div>

        <div className="flex items-center gap-2 p-2 bg-indigo-50/50 rounded-2xl">
          <button className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm transition-all"><Grid size={20} /></button>
          <button className="p-3 text-slate-400 hover:text-indigo-600 transition-colors"><List size={20} /></button>
        </div>
      </div>

      {/* Grid */}
      {filteredAssets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredAssets.map((asset) => (
            <div 
              key={asset.id} 
              onClick={() => setActiveMediaId(asset.id)}
              className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-indigo-100/40 transition-all hover:-translate-y-2 cursor-pointer relative"
            >
              <div className="aspect-square relative overflow-hidden bg-slate-100">
                <img src={asset.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={asset.name} />
                
                <div className="absolute top-5 left-5">
                  <div className="w-12 h-12 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-800 shadow-lg border border-white/20">
                    {asset.type === 'image' ? <ImageIcon size={22} /> : <Play size={22} fill="currentColor" />}
                  </div>
                </div>

                {canManage && (
                  <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(asset.id); }}
                      className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg"
                      title="Delete Permanently"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}

                <div className="absolute inset-0 bg-indigo-900/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-lg border border-white/30 rounded-full flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform duration-500">
                    <Maximize2 size={24} />
                  </div>
                </div>
              </div>

              <div className="p-7">
                <h4 className="font-black text-slate-900 mb-2 truncate leading-tight text-lg group-hover:text-indigo-600 transition-colors">{asset.name}</h4>
                {asset.description && (
                  <p className="text-slate-500 text-sm line-clamp-2 mb-4 font-medium leading-relaxed">{asset.description}</p>
                )}
                <div className="flex items-center justify-between border-t border-slate-50 pt-5 mt-auto">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Posted At</span>
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 truncate">
                      <Clock size={12} className="text-indigo-500 flex-shrink-0" /> {asset.date}
                    </span>
                  </div>
                  <div className="text-right flex flex-col items-end flex-shrink-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">By</span>
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <UserIcon size={12} className="text-indigo-500 flex-shrink-0" /> {asset.uploadedBy}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] p-24 text-center border shadow-sm flex flex-col items-center">
          <div className="w-32 h-32 bg-slate-50 text-slate-200 rounded-[3rem] flex items-center justify-center mb-8 shadow-inner">
            <AlertCircle size={64} />
          </div>
          <h3 className="text-3xl font-black text-slate-800 mb-3">No results found</h3>
          <p className="text-slate-500 font-medium max-w-sm mx-auto text-lg leading-relaxed">We couldn't find any media matching your search or filters.</p>
          {canManage && (
            <button 
              onClick={() => { setUploadQueue([]); setShowUploadModal(true); }} 
              className="mt-12 px-12 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:-translate-y-1 active:scale-95"
            >
              Add New Memory
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
