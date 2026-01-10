
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { 
  FileText, Download, Plus, Upload, X, Trash2, ChevronRight, FolderPlus, Folder, ArrowLeft, Clock, CheckCircle2, Eye, Loader2, FileIcon, ExternalLink, AlertTriangle, Smartphone
} from 'lucide-react';

interface CurriculumProps { user: User; }

const Curriculum: React.FC<CurriculumProps> = ({ user }) => {
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCloudData = async () => {
    try {
      const data = await db.curriculum.getFolders();
      setFolders(data);
    } catch (err) { console.error("Curriculum Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-curriculum')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'curriculum_folders' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'curriculum_files' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // PDF Compatibility Fix for Mobile/Android
  const openFileViewer = (file: any) => {
    if (file.media_url.startsWith('data:application/pdf')) {
      try {
        const base64Data = file.media_url.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (e) {
        console.error("PDF Blob conversion failed", e);
        setBlobUrl(file.media_url);
      }
    } else {
      setBlobUrl(file.media_url);
    }
    setViewingFile(file);
  };

  const closeViewer = () => {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
    setBlobUrl(null);
    setViewingFile(null);
  };

  const handleNativeOpen = () => {
    if (blobUrl) {
      // More reliable method for Android Chrome
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      // For PDF on mobile, it's often better to just let the browser handle it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) return;
    try {
      await db.curriculum.insertFolder(folderName, new Date().toLocaleDateString());
      setFolderName('');
      setShowFolderModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Failed to create cloud folder."); }
  };

  const handleFileSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeFolderId || !fileTitle) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await db.curriculum.insertFile({
          folderId: activeFolderId,
          title: fileTitle,
          type: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
          metadata: file.name,
          mediaUrl: ev.target?.result as string,
          timestamp: new Date().toLocaleString()
        });
        setUploading(false);
        setShowFileModal(false);
        setFileTitle('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (err) { alert("Cloud file sync failed."); setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const executeDelete = async () => {
    if (!deleteFileId) return;
    try {
      await db.curriculum.deleteFile(deleteFileId);
      setDeleteFileId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Delete operation failed."); }
  };

  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId), [folders, activeFolderId]);
  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {/* Real-time sync indicator */}
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-indigo-400">
              <RefreshCw size={12} className="animate-spin" />
              <span className="text-[9px] font-black uppercase tracking-widest">Updating Cloud...</span>
           </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-24 right-4 sm:right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={20} strokeWidth={3} />
              <div>
                 <p className="font-black text-[10px] uppercase tracking-widest leading-none">Sync Success</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-4 sm:px-0">
        <div className="flex items-center gap-3 sm:gap-5">
          {activeFolderId && (
            <button onClick={() => setActiveFolderId(null)} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 hover:text-indigo-600 transition-all"><ArrowLeft size={20} /></button>
          )}
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{activeFolder ? activeFolder.name : 'Curriculum Vault'}</h1>
            <p className="text-slate-500 font-medium text-xs sm:text-lg">Education assets synced globally.</p>
          </div>
        </div>
        {!activeFolderId && canManage && (
          <button onClick={() => setShowFolderModal(true)} className="w-full sm:w-auto px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest hover:-translate-y-1 transition-all"><FolderPlus size={18} /> New Category</button>
        )}
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
           <Loader2 className="animate-spin text-indigo-600" size={48} />
           <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.3em]">Accessing Cloud...</p>
        </div>
      ) : !activeFolderId ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8 px-4 sm:px-0">
           {folders.map(folder => (
              <div key={folder.id} onClick={() => setActiveFolderId(folder.id)} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all cursor-pointer group flex flex-col">
                 <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl sm:rounded-[1.8rem] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner mb-4 sm:mb-6">
                    <Folder size={24} />
                 </div>
                 <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight mb-1 uppercase truncate">{folder.name}</h3>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileText size={10} /> {folder.curriculum_files?.length || 0} Assets</p>
                 <div className="mt-6 sm:mt-8 flex justify-end"><ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" /></div>
              </div>
           ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mx-4 sm:mx-0">
           <div className="p-6 sm:p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tight">{activeFolder?.name} Files</h3>
              {canManage && (
                <button onClick={() => setShowFileModal(true)} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:-translate-y-1 transition-all"><Plus size={16} /> Sync New File</button>
              )}
           </div>
           <div className="p-4 sm:p-10 space-y-3 sm:space-y-4">
              {activeFolder?.curriculum_files?.map((file: any) => (
                <div key={file.id} className="flex items-center justify-between p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/40 rounded-[1.5rem] sm:rounded-[2rem] border border-transparent hover:border-slate-100 hover:bg-white transition-all group">
                   <div className="flex items-center gap-4 sm:gap-6 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><FileIcon size={20}/></div>
                      <div className="min-w-0">
                         <h4 className="text-sm sm:text-lg font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px] sm:max-w-xs">{file.title}</h4>
                         <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{file.timestamp}</p>
                      </div>
                   </div>
                   <div className="flex gap-2 sm:gap-3 shrink-0 ml-4 items-center">
                      <button onClick={() => openFileViewer(file)} className="px-4 py-3 sm:px-6 sm:py-4 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 font-black text-[9px] sm:text-[10px] uppercase tracking-widest border border-indigo-500/50">
                        <Eye size={16} /> <span>View</span>
                      </button>
                      {canManage && <button onClick={() => setDeleteFileId(file.id)} className="p-3 sm:p-4 text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"><Trash2 size={16}/></button>}
                   </div>
                </div>
              ))}
              {activeFolder?.curriculum_files?.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center">
                  <FileText className="text-slate-200 mb-4" size={48} />
                  <p className="text-xs font-black text-slate-400 uppercase">No documents found in this cloud folder.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {showFolderModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Establish Category</h3>
              <input type="text" autoFocus value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="Category Name" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 mb-6 text-slate-800 dark:text-white" />
              <div className="flex gap-4">
                 <button onClick={() => setShowFolderModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={handleSaveFolder} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg uppercase text-[10px]">Initialize</button>
              </div>
           </div>
        </div>
      )}

      {showFileModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase mb-8">Publish Cloud File</h3>
              <input type="text" placeholder="Document Title" value={fileTitle} onChange={e => setFileTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold mb-6 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
              <button disabled={uploading} onClick={() => fileInputRef.current?.click()} className="w-full py-8 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 rounded-3xl border-4 border-dashed border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-3 hover:bg-indigo-100 transition-all">
                 {uploading ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
                 <span className="text-[10px] font-black uppercase tracking-widest">Select Device Document</span>
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleFileSave} />
              <button onClick={() => setShowFileModal(false)} className="w-full mt-6 py-4 bg-slate-100 dark:bg-slate-800 font-black rounded-2xl text-[10px] uppercase text-slate-600 dark:text-slate-400">Discard</button>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteFileId && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 sm:p-12 max-w-sm w-full shadow-2xl text-center border border-rose-100 dark:border-rose-900/50 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={36} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Purge Cloud Asset?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium text-[10px] leading-relaxed uppercase tracking-widest">This document will be permanently erased from all institutional devices.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeleteFileId(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px] tracking-widest">Cancel</button>
                 <button onClick={executeDelete} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Delete</button>
              </div>
           </div>
        </div>
      )}

      {viewingFile && (
        <div className="fixed inset-0 z-[700] bg-slate-950/98 backdrop-blur-2xl flex flex-col p-4 sm:p-10 animate-in zoom-in-95">
           <div className="flex justify-between items-center mb-6 text-white px-2">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white/10 rounded-xl hidden sm:flex"><FileIcon size={24} /></div>
                 <div>
                    <h3 className="text-xl lg:text-3xl font-black uppercase tracking-tight truncate max-w-[120px] sm:max-w-md">{viewingFile.title}</h3>
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Global Asset Archive</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 {viewingFile.type === 'PDF' && (
                   <button 
                    onClick={handleNativeOpen} 
                    className="p-3 sm:px-6 bg-white/10 hover:bg-indigo-600 text-white rounded-2xl transition-all flex items-center gap-2 font-bold uppercase text-[9px] sm:text-[10px] border border-white/5"
                   >
                     <Smartphone size={18} /> <span className="hidden sm:inline">Open Native</span>
                   </button>
                 )}
                 <a 
                   href={blobUrl || viewingFile.media_url} 
                   download={viewingFile.title + (viewingFile.type === 'PDF' ? '.pdf' : '.jpg')}
                   className="p-3 sm:px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all flex items-center gap-2 font-bold uppercase text-[9px] sm:text-[10px] shadow-xl"
                   rel="noopener noreferrer"
                 >
                   <Download size={18} /> <span className="hidden sm:inline">Download</span>
                 </a>
                 <button onClick={closeViewer} className="p-3 bg-white/10 hover:bg-rose-600 rounded-2xl transition-all border border-white/5"><X size={20} /></button>
              </div>
           </div>
           
           <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[3rem] overflow-hidden border-4 lg:border-8 border-white/10 shadow-2xl relative">
              {viewingFile.type === 'IMAGE' ? (
                <div className="w-full h-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
                   <img src={blobUrl || viewingFile.media_url} className="max-w-full max-h-full object-contain rounded-xl" alt="Preview" />
                </div>
              ) : (
                <div className="w-full h-full relative group">
                  <iframe 
                    src={`${blobUrl}#toolbar=0&navpanes=0`} 
                    className="w-full h-full border-none sm:block hidden" 
                    title="PDF Viewer"
                  />
                  {/* Improved Android help view - Always visible if iframe might fail on small screens */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-900/95 backdrop-blur-md sm:hidden">
                      <div className="w-24 h-24 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center mb-8 border border-indigo-500/30">
                        <Smartphone size={48} className="animate-pulse" />
                      </div>
                      <h4 className="text-white font-black text-2xl mb-4 uppercase tracking-tight">Android Cloud Access</h4>
                      <p className="text-slate-400 font-medium text-sm mb-10 leading-relaxed uppercase tracking-widest max-w-xs">Mobile Chrome requires external authentication for PDF viewing. Use the buttons below to open in your phone's viewer or save the file.</p>
                      <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                        <button 
                          onClick={handleNativeOpen}
                          className="w-full py-6 bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
                        >
                          <ExternalLink size={20} /> Open Fullscreen
                        </button>
                        <a 
                          href={blobUrl || viewingFile.media_url} 
                          download={viewingFile.title + '.pdf'}
                          className="w-full py-6 bg-white/10 text-white border border-white/10 rounded-[1.8rem] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3"
                          rel="noopener noreferrer"
                        >
                          <Download size={20} /> Save to Phone
                        </a>
                      </div>
                  </div>
                </div>
              )}
           </div>
           <p className="text-center text-white/40 text-[8px] font-black uppercase py-4 tracking-[0.3em]">Mobile-Enhanced Asset Protocol</p>
        </div>
      )}
    </div>
  );
};

const RefreshCw = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
);

export default Curriculum;
