
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { 
  FileText, Download, Plus, Upload, X, Trash2, ChevronRight, FolderPlus, Folder, ArrowLeft, Clock, CheckCircle2, Eye, Loader2, FileIcon, ExternalLink, AlertTriangle, Smartphone, RefreshCw, ShieldCheck, FileUp, Bell, UserCircle, Database
} from 'lucide-react';

interface CurriculumProps { user: User; }

const Curriculum: React.FC<CurriculumProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [fullStudentData, setFullStudentData] = useState<any>(null);
  
  // Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  
  // Form Data for New Material
  const [materialTitle, setMaterialTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [materialPreview, setMaterialPreview] = useState<string | null>(null);
  
  // Folder Data
  const [folderName, setFolderName] = useState('');
  
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTimestamp = () => {
    return new Date().toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true 
    }).toUpperCase();
  };

  const fetchCloudData = async () => {
    try {
      const data = await db.curriculum.getFolders();
      setFolders(data || []);
    } catch (err) { console.error("Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-curriculum-v6')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'curriculum_folders' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'curriculum_files' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();

    if (isStudent) {
       supabase.from('students').select('*').eq('id', user.id).single().then(({data}) => {
          if (data) setFullStudentData(data);
       });
    }

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim() || isStudent) return;
    setUploading(true);
    try {
      const timestamp = formatTimestamp();
      await db.curriculum.insertFolder(folderName.toUpperCase(), timestamp);
      await createAuditLog(user, 'CREATE', 'Curriculum', `New Subject Category: ${folderName}`);
      setFolderName('');
      setShowFolderModal(false);
      setSuccessMsg('Subject Added to Cloud');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchCloudData();
    } catch (err) { alert("Failed to add subject."); }
    finally { setUploading(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => setMaterialPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setMaterialPreview(null);
      }
      if (!materialTitle) {
        setMaterialTitle(file.name.split('.')[0].toUpperCase());
      }
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !activeFolderId || !materialTitle.trim() || isStudent) return;
    setUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const payload = {
          folderId: activeFolderId,
          title: materialTitle.trim().toUpperCase(),
          type: selectedFile.type.includes('pdf') ? 'PDF' : 'IMAGE',
          mediaUrl: ev.target?.result as string,
          metadata: { size: selectedFile.size, lastModified: selectedFile.lastModified },
          timestamp: formatTimestamp()
        };
        await db.curriculum.insertFile(payload);
        await createAuditLog(user, 'CREATE', 'Curriculum', `Synced material: ${payload.title}`);
        setSuccessMsg('Material Synced to Cloud');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        setMaterialTitle('');
        setSelectedFile(null);
        setMaterialPreview(null);
        setShowFileModal(false);
        fetchCloudData();
      } catch (err) { alert("File sync failed."); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(selectedFile);
  };

  const confirmDeleteFile = async () => {
    if (!deleteFileId || isStudent) return;
    try {
      await db.curriculum.deleteFile(deleteFileId);
      setDeleteFileId(null);
      fetchCloudData();
    } catch (err) { alert("Delete failed."); }
  };

  const openFileViewer = (file: any) => {
    if (file.media_url.startsWith('data:application/pdf')) {
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
    } else {
      setBlobUrl(file.media_url);
    }
    setViewingFile(file);
  };

  const closeViewer = () => {
    if (blobUrl && blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setViewingFile(null);
  };

  const canManage = !isStudent && (user.role === 'ADMIN' || user.role === 'TEACHER');
  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId), [folders, activeFolderId]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {/* HARDWARE INTERFACE HUD */}
      <div className="flex flex-wrap gap-4 no-print px-4 sm:px-0">
         <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 px-4 py-2 rounded-full shadow-sm">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Document Node: Verified</span>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
         </div>
         <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 px-4 py-2 rounded-full shadow-sm">
            <Database size={14} className="text-indigo-500" />
            <span className="text-[8px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Global Vault Synced</span>
         </div>
      </div>

      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-indigo-400">
              <RefreshCw size={12} className="animate-spin" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white">Refreshing Library...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Operation Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">{successMsg}</p>
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
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{activeFolder ? activeFolder.name : 'Curriculum Archive'}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-lg uppercase tracking-tight">Institutional education assets with verified sync data.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {isStudent && (
              <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 pl-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                 <button className="p-2 text-slate-400 hover:text-indigo-600 transition-all relative">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                 </button>
                 <div className="h-6 w-px bg-slate-100 dark:bg-slate-800"></div>
                 <div className="flex items-center gap-3 pr-2 group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('open-profile-modal'))}>
                    <div className="text-right hidden md:block">
                       <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none truncate max-w-[100px]">{user.name}</p>
                       <p className="text-[8px] text-indigo-500 font-bold uppercase mt-0.5">My Profile</p>
                    </div>
                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-indigo-600 transition-all">
                       {user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" /> : <UserCircle size={20} className="text-indigo-300" />}
                    </div>
                 </div>
              </div>
           )}

           {!activeFolderId && canManage && (
             <button onClick={() => setShowFolderModal(true)} className="px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest transition-all hover:bg-indigo-700 hover:-translate-y-1"><FolderPlus size={18} /> New Subject</button>
           )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
          <Loader2 size={48} className="animate-spin text-indigo-600" />
          <p className="text-[10px] font-black uppercase text-slate-400 mt-4 tracking-widest">Connecting to curriculum node...</p>
        </div>
      ) : !activeFolderId ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 sm:px-0">
           {folders.map(folder => (
              <div key={folder.id} onClick={() => setActiveFolderId(folder.id)} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all cursor-pointer group relative">
                 <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[1.8rem] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner mb-6"><Folder size={28} /></div>
                 <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-1 uppercase truncate">{folder.name}</h3>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">{folder.curriculum_files?.length || 0} Documents</p>
                 <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5"><Clock size={10}/> Establish: {folder.timestamp}</p>
              </div>
           ))}
           {folders.length === 0 && (
             <div className="col-span-full py-40 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[4rem] flex flex-col items-center justify-center opacity-50">
               <Folder size={64} className="text-slate-200 mb-4" />
               <p className="text-xs font-black uppercase tracking-widest text-slate-400">Library is empty. Create a subject to begin.</p>
             </div>
           )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mx-4 sm:mx-0">
           <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="text-2xl font-black uppercase tracking-tight">{activeFolder?.name} Repository</h3>
              {canManage && (
                <button onClick={() => setShowFileModal(true)} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-700">
                   <Plus size={16} /> Add Material
                </button>
              )}
           </div>
           <div className="p-8 space-y-4">
              {activeFolder?.curriculum_files?.map((file: any) => (
                <div key={file.id} className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-800/40 rounded-[2rem] border border-transparent hover:border-indigo-100 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                   <div className="flex items-center gap-6 min-w-0 flex-1">
                      <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                        {file.type === 'PDF' ? <FileText size={24}/> : <FileIcon size={24}/>}
                      </div>
                      <div className="min-w-0">
                         <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase truncate">{file.title}</h4>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5"><Clock size={12}/> Synced: {file.timestamp}</p>
                      </div>
                   </div>
                   <div className="flex gap-3 shrink-0 ml-4 items-center">
                      <button onClick={() => openFileViewer(file)} className="px-6 py-4 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border border-indigo-500/50"><Eye size={16} /> View</button>
                      {canManage && <button onClick={() => setDeleteFileId(file.id)} className="p-4 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"><Trash2 size={18}/></button>}
                   </div>
                </div>
              ))}
              {activeFolder?.curriculum_files?.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center">
                  <FileText className="text-slate-200" size={64} />
                  <p className="text-xs font-black text-slate-400 uppercase mt-4">Cloud subject is empty.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* NEW SUBJECT MODAL (FOLDER) */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-md w-full animate-in zoom-in-95 border border-slate-100 dark:border-slate-800 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">New Subject Category</h3>
                 <button onClick={() => setShowFolderModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={24}/></button>
              </div>
              <form onSubmit={handleCreateFolder} className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Category Name</label>
                    <input 
                      type="text" 
                      required 
                      value={folderName} 
                      onChange={e => setFolderName(e.target.value)} 
                      placeholder="e.g. MATHEMATICS"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-5 font-black uppercase text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                 </div>
                 <button type="submit" disabled={uploading || !folderName} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
                    {uploading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20}/>}
                    Create Category
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* NEW MATERIAL MODAL (FILE) */}
      {showFileModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-xl w-full animate-in zoom-in-95 border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Add Material</h3>
                 <button onClick={() => setShowFileModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={24}/></button>
              </div>
              <form onSubmit={handleUploadMaterial} className="space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Document Title</label>
                    <input 
                      type="text" 
                      required 
                      value={materialTitle} 
                      onChange={e => setMaterialTitle(e.target.value)} 
                      placeholder="e.g. ALGEBRA NOTES CHAPTER 1"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-5 font-black uppercase text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Select Document (PDF/Image)</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-48 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group overflow-hidden"
                    >
                      {selectedFile ? (
                        <div className="flex flex-col items-center gap-2">
                          {materialPreview ? (
                            <img src={materialPreview} className="h-20 w-20 object-cover rounded-xl shadow-lg" />
                          ) : (
                            <FileText size={48} className="text-indigo-600" />
                          )}
                          <p className="text-[10px] font-black uppercase text-slate-500 truncate max-w-[200px]">{selectedFile.name}</p>
                        </div>
                      ) : (
                        <>
                          <FileUp size={48} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Click to Browse Institutional Assets</p>
                        </>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleFileSelect} />
                 </div>

                 <button type="submit" disabled={uploading || !selectedFile || !materialTitle} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-50">
                    {uploading ? <Loader2 className="animate-spin" /> : <Upload size={20}/>}
                    Sync to Repository
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* DELETE CONFIRMATION FILE - UPDATED TO COMPACT SIZE */}
      {deleteFileId && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Delete Asset?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] uppercase tracking-widest">This material will be permanently purged.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteFileId(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={confirmDeleteFile} className="py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px]">Purge</button>
              </div>
           </div>
        </div>
      )}

      {viewingFile && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/98 backdrop-blur-2xl flex flex-col p-4 sm:p-10 animate-in zoom-in-95">
           <div className="flex justify-between items-center mb-6 text-white">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white/10 rounded-xl hidden sm:flex"><FileIcon size={24} /></div>
                 <div>
                    <h3 className="text-xl lg:text-3xl font-black uppercase tracking-tight">{viewingFile.title}</h3>
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Global Educational Asset</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={closeViewer} className="p-4 bg-white/10 hover:bg-rose-600 rounded-2xl transition-all border border-white/5"><X size={24} /></button>
              </div>
           </div>
           <div className="flex-1 bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden border-8 border-white/10 shadow-2xl relative">
              {viewingFile.type === 'IMAGE' ? (
                <div className="w-full h-full flex items-center justify-center p-4 bg-slate-900"><img src={blobUrl || viewingFile.media_url} className="max-w-full max-h-full object-contain rounded-xl" /></div>
              ) : (
                <iframe src={`${blobUrl}#toolbar=0&navpanes=0`} className="w-full h-full border-none" title="PDF Viewer" />
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Curriculum;
