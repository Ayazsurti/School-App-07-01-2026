import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, NoticeMedia } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  FileText, 
  Download, 
  Plus, 
  Upload, 
  X, 
  Edit2,
  Trash2,
  ChevronRight,
  AlertCircle,
  FolderPlus,
  Folder,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  FileIcon,
  Save,
  Maximize2,
  Eye,
  Loader2,
  Image as ImageIcon,
  PlayCircle,
  FileVideo,
  FileImage,
  MoreVertical,
  FilePlus2
} from 'lucide-react';

interface CurriculumProps {
  user: User;
}

interface CurriculumFile {
  id: string;
  title: string;
  type: 'PDF' | 'VIDEO' | 'IMAGE';
  metadata: string;
  timestamp: string;
  media?: NoticeMedia;
}

interface CurriculumFolder {
  id: string;
  name: string;
  timestamp: string;
  files: CurriculumFile[];
}

const Curriculum: React.FC<CurriculumProps> = ({ user }) => {
  const [folders, setFolders] = useState<CurriculumFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  
  // Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  
  // Active Items for Actions
  const [viewingFile, setViewingFile] = useState<CurriculumFile | null>(null);
  const [editingFile, setEditingFile] = useState<CurriculumFile | null>(null);
  const [fileToDeleteId, setFileToDeleteId] = useState<string | null>(null);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [uploading, setUploading] = useState(false);

  const [folderName, setFolderName] = useState('');
  const [fileData, setFileData] = useState({ title: '', type: 'PDF' as CurriculumFile['type'] });
  const [tempMedia, setTempMedia] = useState<NoticeMedia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from Local Vault
  useEffect(() => {
    fetchCurriculum();
  }, []);

  const fetchCurriculum = () => {
    setIsLoading(true);
    try {
      const saved = localStorage.getItem('school_curriculum_vault_v4');
      if (saved) {
        setFolders(JSON.parse(saved));
      } else {
        setFolders([]);
      }
    } catch (err: any) {
      console.error("Local Access Error:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const syncToLocal = (updatedFolders: CurriculumFolder[]) => {
    localStorage.setItem('school_curriculum_vault_v4', JSON.stringify(updatedFolders));
    setFolders(updatedFolders);
  };

  const activeFolder = useMemo(() => 
    folders.find(f => f.id === activeFolderId), 
    [folders, activeFolderId]
  );

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const handleSaveFolder = () => {
    if (!folderName.trim()) return;
    const existing = folders.find(f => f.id === folderName);
    if (existing) {
        setActiveFolderId(existing.id);
    } else {
        const newFolder: CurriculumFolder = {
            id: folderName,
            name: folderName,
            timestamp: `Established: ${new Date().toLocaleDateString()}`,
            files: []
        };
        const updated = [newFolder, ...folders];
        syncToLocal(updated);
        setActiveFolderId(newFolder.id);
    }
    setFolderName('');
    setShowFolderModal(false);
    triggerSuccess(`Category "${folderName}" initialized`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    let detectedType: CurriculumFile['type'] = 'PDF';
    if (file.type.startsWith('image/')) detectedType = 'IMAGE';
    if (file.type.startsWith('video/')) detectedType = 'VIDEO';

    setFileData(prev => ({ ...prev, type: detectedType }));

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTempMedia({
        url: ev.target?.result as string,
        type: detectedType.toLowerCase() as any,
        name: file.name
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFile = () => {
    if (!fileData.title.trim() || !activeFolderId || !tempMedia) {
      alert("Requirements: Title and File are mandatory.");
      return;
    }

    setUploading(true);
    const newFile: CurriculumFile = {
      id: Math.random().toString(36).substr(2, 9),
      title: fileData.title,
      type: fileData.type,
      metadata: tempMedia.name,
      timestamp: new Date().toLocaleString(),
      media: tempMedia
    };

    const updatedFolders = folders.map(f => {
      if (f.id === activeFolderId) {
        return { ...f, files: [newFile, ...f.files] };
      }
      return f;
    });

    syncToLocal(updatedFolders);
    createAuditLog(user, 'CREATE', 'Curriculum', `Local Sync: "${fileData.title}" (${fileData.type})`);
    
    setUploading(false);
    setShowFileModal(false);
    setTempMedia(null);
    setFileData({ title: '', type: 'PDF' });
    
    // UI Update: Do not automatically open the viewer here.
    // Let the user decide when to open from the list.
    triggerSuccess('Asset stored in vault');
  };

  const handleEditFile = () => {
    if (!editingFile || !fileData.title.trim()) return;

    const updatedFolders = folders.map(f => ({
      ...f,
      files: f.files.map(file => file.id === editingFile.id ? { ...file, title: fileData.title } : file)
    }));

    syncToLocal(updatedFolders);
    createAuditLog(user, 'UPDATE', 'Curriculum', `Renamed local asset: "${fileData.title}"`);
    triggerSuccess('Registry updated');
    setShowEditModal(false);
    setEditingFile(null);
  };

  const confirmDeleteFile = () => {
    if (!fileToDeleteId) return;
    
    const updatedFolders = folders.map(f => ({
      ...f,
      files: f.files.filter(file => file.id !== fileToDeleteId)
    }));

    syncToLocal(updatedFolders);
    triggerSuccess('Asset purged from local storage');
    setFileToDeleteId(null);
  };

  const downloadFile = (file: CurriculumFile) => {
    if (!file.media?.url) return;
    const link = document.createElement('a');
    link.href = file.media.url;
    link.download = `${file.title}.${file.type.toLowerCase() === 'image' ? 'png' : file.type.toLowerCase() === 'video' ? 'mp4' : 'pdf'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {/* SUCCESS OVERLAY */}
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-5 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={32} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-sm uppercase tracking-[0.2em]">Verified</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-1">{successMsg}</p>
              </div>
           </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {fileToDeleteId && (
        <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-sm w-full shadow-2xl animate-in zoom-in-95 text-center border border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2rem] flex items-center justify-center mb-6 mx-auto border border-rose-100 dark:border-rose-900/50 shadow-inner">
                 <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Confirm Erasure?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">This action will erase the selected institutional asset permanently from the browser vault.</p>
              <div className="flex gap-3">
                 <button onClick={() => setFileToDeleteId(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors uppercase text-[10px] tracking-widest">Cancel</button>
                 <button onClick={confirmDeleteFile} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all">Confirm Delete</button>
              </div>
           </div>
        </div>
      )}

      {/* MEDIA THEATER VIEWER */}
      {showViewer && viewingFile && viewingFile.media && (
        <div className="fixed inset-0 z-[600] bg-slate-950/98 backdrop-blur-2xl flex flex-col p-4 lg:p-10 animate-in zoom-in-95 duration-300">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 text-white px-2">
              <div className="flex items-center gap-5">
                 <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-lg">
                    {viewingFile.type === 'IMAGE' ? <ImageIcon size={28}/> : viewingFile.type === 'VIDEO' ? <PlayCircle size={28}/> : <FileText size={28} />}
                 </div>
                 <div>
                    <h3 className="text-2xl lg:text-3xl font-black tracking-tight uppercase leading-none">{viewingFile.title}</h3>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mt-2">
                      <Clock size={12} className="text-indigo-400" /> Stored: {viewingFile.timestamp}
                    </p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button 
                  onClick={() => downloadFile(viewingFile)}
                  className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl"
                 >
                    <Download size={20} /> Save Copy
                 </button>
                 <button onClick={() => setShowViewer(false)} className="p-4 bg-white/10 hover:bg-rose-600 text-white rounded-2xl transition-all">
                    <X size={32} />
                 </button>
              </div>
           </div>
           <div className="flex-1 bg-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative border-8 border-white/10 flex items-center justify-center">
              {viewingFile.type === 'PDF' ? (
                <iframe src={viewingFile.media.url} className="w-full h-full border-none bg-white" title={viewingFile.title} />
              ) : viewingFile.type === 'IMAGE' ? (
                <img src={viewingFile.media.url} className="max-w-full max-h-full object-contain" alt={viewingFile.title} />
              ) : (
                <video src={viewingFile.media.url} controls autoPlay className="max-w-full max-h-full" />
              )}
           </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {showEditModal && editingFile && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-8">Modify Title</h3>
              <input 
                type="text" 
                autoFocus
                value={fileData.title}
                onChange={e => setFileData({...fileData, title: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 mb-6 shadow-inner"
              />
              <div className="flex gap-4">
                 <button onClick={() => setShowEditModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl uppercase text-xs">Discard</button>
                 <button onClick={handleEditFile} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest hover:bg-indigo-700">Sync Changes</button>
              </div>
           </div>
        </div>
      )}

      {/* FOLDER MODAL */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-8">Subject Category</h3>
              <input 
                type="text" 
                autoFocus
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                placeholder="e.g., Mathematics - Grade 10"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 mb-6 shadow-inner"
              />
              <div className="flex gap-4">
                 <button onClick={() => setShowFolderModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl uppercase text-xs">Cancel</button>
                 <button onClick={handleSaveFolder} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest hover:bg-indigo-700">Initialize</button>
              </div>
           </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showFileModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Upload to {activeFolder?.name}</h3>
                 <button onClick={() => setShowFileModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-all"><X size={20}/></button>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Asset Identity (Title)</label>
                    <input 
                      type="text" 
                      value={fileData.title}
                      onChange={e => setFileData({...fileData, title: e.target.value})}
                      placeholder="e.g., Chapter 1 Summary"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                    />
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Asset Type</label>
                    <div className="grid grid-cols-3 gap-2">
                       {(['PDF', 'IMAGE', 'VIDEO'] as const).map(t => (
                         <button 
                           key={t}
                           type="button"
                           onClick={() => setFileData({...fileData, type: t})}
                           className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${fileData.type === t ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                         >
                           {t}
                         </button>
                       ))}
                    </div>
                 </div>
                 
                 <div className="flex flex-col gap-2">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Local Resource Select</label>
                    <button 
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full py-10 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 font-black rounded-[2rem] border-4 border-dashed border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-4 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all ${tempMedia ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600' : ''}`}
                    >
                      {uploading ? <Loader2 className="animate-spin" size={32} /> : tempMedia ? <CheckCircle2 size={32} /> : <Upload size={32} />}
                      <span className="text-xs uppercase tracking-widest">{tempMedia ? 'Asset Ready' : 'Choose Device File'}</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,image/*,video/*" />
                 </div>

                 {tempMedia && (
                   <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                         <FileIcon size={18} className="text-emerald-600" />
                         <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 truncate uppercase tracking-widest">{tempMedia.name}</span>
                      </div>
                      <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                   </div>
                 )}

                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setShowFileModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl uppercase text-xs tracking-widest transition-colors">Discard</button>
                    <button 
                      onClick={handleSaveFile} 
                      disabled={!fileData.title || !tempMedia || uploading} 
                      className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      {uploading ? <><Loader2 size={16} className="animate-spin" /> Syncing Local...</> : 'Save to Vault'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MAIN UI HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex flex-col gap-5 items-start">
          <div className="flex items-center gap-5">
            {activeFolderId && (
              <button onClick={() => setActiveFolderId(null)} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 shadow-sm transition-all hover:scale-110 active:scale-95"><ArrowLeft size={24} /></button>
            )}
            <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{activeFolder ? activeFolder.name : 'Curriculum Repository'}</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Centralized browser database for subject materials and resources.</p>
            </div>
          </div>
          
          {!activeFolderId && canManage && (
            <button 
              onClick={() => setShowFolderModal(true)}
              className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-indigo-900/40 flex items-center gap-3 hover:bg-indigo-700 hover:-translate-y-1 transition-all uppercase text-[10px] tracking-[0.2em]"
            >
              <FolderPlus size={20} strokeWidth={3} /> Add Subject Category
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
           <Loader2 className="animate-spin text-indigo-600" size={80} />
           <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.3em]">Accessing Local Library...</p>
        </div>
      ) : !activeFolderId ? (
        /* GRID OF FOLDERS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
           {folders.map(folder => (
              <div 
                key={folder.id} 
                onClick={() => setActiveFolderId(folder.id)}
                className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden flex flex-col hover:-translate-y-2"
              >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
                 
                 <div className="flex items-start justify-between mb-6 relative z-10">
                   <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[1.8rem] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                      <Folder size={32} />
                   </div>
                 </div>

                 <div className="relative z-10">
                   <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase tracking-tight truncate">{folder.name}</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12} /> {folder.files.length} Assets Verified</p>
                 </div>
                 
                 <div className="mt-8 flex justify-end relative z-10">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 transition-all group-hover:translate-x-1">
                       <ChevronRight size={20} />
                    </div>
                 </div>
              </div>
           ))}
           {folders.length === 0 && (
             <div className="col-span-full py-40 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[4rem] bg-white dark:bg-slate-900/50">
                <Folder size={64} className="mx-auto text-slate-100 dark:text-slate-800 mb-6" />
                <h3 className="text-2xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tight">Vault Empty</h3>
                <p className="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest text-[10px] mt-2">Initialize a category to begin educational asset storage.</p>
             </div>
           )}
        </div>
      ) : (
        /* LIST OF FILES IN ACTIVE FOLDER */
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
           <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{activeFolder?.name}</h3>
                 <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-2">Active Subject Terminal: {activeFolder?.files.length} Assets Stored Locally</p>
              </div>
              {canManage && (
                <button 
                  onClick={() => { setFileData({ title: '', type: 'PDF' }); setTempMedia(null); setShowFileModal(true); }}
                  className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl flex items-center gap-2 hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest shadow-xl"
                >
                  <Plus size={16} strokeWidth={3} /> Add PDF / Asset
                </button>
              )}
           </div>

           <div className="p-10 space-y-4">
              {activeFolder?.files.map(file => (
                <div key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-7 bg-slate-50/50 dark:bg-slate-800/40 rounded-[2.5rem] hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700 relative group">
                   <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
                        file.type === 'PDF' ? 'bg-indigo-50 text-indigo-600' :
                        file.type === 'IMAGE' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-amber-50 text-amber-600'
                      } group-hover:rotate-6`}>
                         {file.type === 'PDF' ? <FileText size={28}/> : file.type === 'IMAGE' ? <FileImage size={28}/> : <FileVideo size={28} />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase truncate pr-10">{file.title}</h4>
                         <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                           <Calendar size={12} /> Registry Date: {file.timestamp} • <span className="text-indigo-500">{file.type}</span>
                         </p>
                      </div>
                   </div>
                   
                   <div className="flex flex-wrap items-center gap-3 mt-6 sm:mt-0">
                      <button 
                        onClick={() => { setViewingFile(file); setShowViewer(true); }}
                        className="p-4 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 rounded-xl shadow-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border border-indigo-50 dark:border-slate-600"
                      >
                         <Eye size={18} /> Open
                      </button>
                      <button 
                        onClick={() => downloadFile(file)}
                        className="p-4 bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 rounded-xl shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border border-emerald-50 dark:border-slate-600"
                      >
                         <Download size={18} /> Download
                      </button>
                      {canManage && (
                        <>
                          <button 
                            onClick={() => { setEditingFile(file); setFileData({ ...fileData, title: file.title }); setShowEditModal(true); }} 
                            className="p-4 bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 rounded-xl shadow-sm hover:bg-amber-500 hover:text-white transition-all border border-amber-50 dark:border-slate-600"
                          >
                             <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => setFileToDeleteId(file.id)} 
                            className="p-4 bg-white dark:bg-slate-700 text-rose-500 rounded-xl shadow-sm hover:bg-rose-500 hover:text-white transition-all border border-rose-50 dark:border-slate-600"
                          >
                             <Trash2 size={18} />
                          </button>
                        </>
                      )}
                   </div>
                </div>
              ))}
              {activeFolder?.files.length === 0 && (
                <div className="py-32 text-center text-slate-300 dark:text-slate-700 font-black uppercase text-xs tracking-widest flex flex-col items-center gap-4">
                   <AlertCircle size={40} />
                   Directory terminal empty. Add educational assets to this folder.
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Curriculum;