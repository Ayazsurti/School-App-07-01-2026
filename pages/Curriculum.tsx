
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, NoticeMedia } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { 
  FileText, Download, Plus, Upload, X, Trash2, ChevronRight, FolderPlus, Folder, ArrowLeft, Clock, CheckCircle2, Eye, Loader2, FileIcon
} from 'lucide-react';

interface CurriculumProps { user: User; }

const Curriculum: React.FC<CurriculumProps> = ({ user }) => {
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [folderName, setFolderName] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const [uploading, setUploading] = useState(false);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'curriculum_folders' }, () => fetchCloudData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'curriculum_files' }, () => fetchCloudData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSaveFolder = async () => {
    if (!folderName.trim()) return;
    try {
      await db.curriculum.insertFolder(folderName, new Date().toLocaleDateString());
      setFolderName('');
      setShowFolderModal(false);
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
      } catch (err) { alert("Cloud file sync failed."); setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const confirmDeleteFile = async (id: string) => {
    if (confirm("Purge asset from cloud?")) {
      try { await db.curriculum.deleteFile(id); }
      catch (err) { alert("Delete failed."); }
    }
  };

  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId), [folders, activeFolderId]);
  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex items-center gap-5">
          {activeFolderId && (
            <button onClick={() => setActiveFolderId(null)} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 hover:text-indigo-600 transition-all"><ArrowLeft size={24} /></button>
          )}
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{activeFolder ? activeFolder.name : 'Cloud Curriculum Vault'}</h1>
            <p className="text-slate-500 font-medium text-lg">Centralized educational resources synced across all devices.</p>
          </div>
        </div>
        {!activeFolderId && canManage && (
          <button onClick={() => setShowFolderModal(true)} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 uppercase text-xs tracking-widest"><FolderPlus size={20} /> Create Cloud Category</button>
        )}
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
           <Loader2 className="animate-spin text-indigo-600" size={64} />
           <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.3em]">Accessing Cloud Library...</p>
        </div>
      ) : !activeFolderId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
           {folders.map(folder => (
              <div key={folder.id} onClick={() => setActiveFolderId(folder.id)} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden flex flex-col">
                 <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[1.8rem] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner mb-6">
                    <Folder size={32} />
                 </div>
                 <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase truncate">{folder.name}</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12} /> {folder.curriculum_files?.length || 0} Cloud Assets</p>
                 <div className="mt-8 flex justify-end"><ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" /></div>
              </div>
           ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
           <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase tracking-tight">{activeFolder?.name} Files</h3>
              {canManage && (
                <button onClick={() => setShowFileModal(true)} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"><Plus size={16} /> Sync New File</button>
              )}
           </div>
           <div className="p-10 space-y-4">
              {activeFolder?.curriculum_files?.map((file: any) => (
                <div key={file.id} className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-800/40 rounded-[2rem] border border-transparent hover:border-slate-100 hover:bg-white transition-all group">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><FileIcon size={24}/></div>
                      <div>
                         <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase truncate max-w-xs">{file.title}</h4>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sync Date: {file.timestamp}</p>
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <button onClick={() => { setViewingFile(file); }} className="p-4 bg-white dark:bg-slate-700 text-indigo-600 rounded-xl shadow-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border border-indigo-50"><Eye size={18} /> View</button>
                      {canManage && <button onClick={() => confirmDeleteFile(file.id)} className="p-4 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {showFolderModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Establish Cloud Category</h3>
              <input type="text" autoFocus value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="Category Name" className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 mb-6" />
              <div className="flex gap-4">
                 <button onClick={() => setShowFolderModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={handleSaveFolder} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg uppercase text-[10px]">Initialize</button>
              </div>
           </div>
        </div>
      )}

      {showFileModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-black uppercase mb-8">Publish Cloud File</h3>
              <input type="text" placeholder="Document Title" value={fileTitle} onChange={e => setFileTitle(e.target.value)} className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold mb-6" />
              <button disabled={uploading} onClick={() => fileInputRef.current?.click()} className="w-full py-8 bg-indigo-50 text-indigo-600 rounded-3xl border-4 border-dashed border-indigo-200 flex flex-col items-center justify-center gap-3 hover:bg-indigo-100 transition-all">
                 {uploading ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
                 <span className="text-[10px] font-black uppercase tracking-widest">Select Device Document</span>
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleFileSave} />
              <button onClick={() => setShowFileModal(false)} className="w-full mt-6 py-4 bg-slate-100 font-black rounded-2xl text-[10px] uppercase">Discard</button>
           </div>
        </div>
      )}

      {viewingFile && (
        <div className="fixed inset-0 z-[700] bg-slate-950/98 backdrop-blur-2xl flex flex-col p-10 animate-in zoom-in-95">
           <div className="flex justify-between items-center mb-8 text-white">
              <h3 className="text-3xl font-black uppercase tracking-tight">{viewingFile.title}</h3>
              <button onClick={() => setViewingFile(null)} className="p-4 bg-white/10 hover:bg-rose-600 rounded-2xl transition-all"><X size={32} /></button>
           </div>
           <div className="flex-1 bg-white rounded-[3rem] overflow-hidden border-8 border-white/10 shadow-2xl">
              <iframe src={viewingFile.media_url} className="w-full h-full border-none" />
           </div>
        </div>
      )}
    </div>
  );
};

export default Curriculum;
