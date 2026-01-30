import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db, getErrorMessage } from '../supabase';
import { 
  FileText, Plus, Upload, X, FolderPlus, Folder, ArrowLeft, Clock, Eye, Loader2, FileIcon, 
  ShieldCheck, RefreshCcw, CheckSquare, Square, Layers, Search, CheckCircle2, Trash2, AlertTriangle
} from 'lucide-react';

interface CurriculumProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];
const SECTIONS = ['A', 'B', 'C', 'D'];

const Curriculum: React.FC<CurriculumProps> = ({ user }) => {
  const userRole = (user.role || '').toUpperCase();
  const isStudent = userRole === 'STUDENT';
  const isTeacher = userRole === 'TEACHER';
  const isAdmin = userRole === 'ADMIN';
  
  // Authorized classes for Teacher management (used for target selection)
  const authorizedClasses = useMemo(() => {
    if (isAdmin) return ALL_CLASSES;
    const teacherClasses = (user as any).classes || (user.class ? [user.class] : []);
    return ALL_CLASSES.filter(c => teacherClasses.includes(c));
  }, [user, isAdmin]);

  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<any | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<any | null>(null);
  
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [targetSections, setTargetSections] = useState<string[]>(['A', 'B', 'C', 'D']);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [materialTitle, setMaterialTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderPdf, setFolderPdf] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderPdfRef = useRef<HTMLInputElement>(null);

  const fetchCloudData = async () => {
    try {
      const data = await db.curriculum.getFolders();
      setFolders(data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-curriculum-master')
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

  const toggleClass = (cls: string) => {
    setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
  };

  const toggleSection = (sec: string) => {
    setTargetSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || targetClasses.length === 0) {
      if(targetClasses.length === 0) alert("Select target Classes.");
      return;
    }
    
    setUploading(true);
    try {
      const metadata = { target_classes: targetClasses.join(','), target_sections: targetSections.join(',') };
      const folderResult = await db.curriculum.insertFolder(newFolderName.toUpperCase(), new Date().toLocaleString(), metadata);
      
      if (folderResult && folderResult[0] && folderPdf) {
        const fileData = await new Promise<string>((resolve) => {
           const reader = new FileReader();
           reader.onload = (ev) => resolve(ev.target?.result as string);
           reader.readAsDataURL(folderPdf);
        });

        await db.curriculum.insertFile({
          folderId: folderResult[0].id,
          title: `${newFolderName.toUpperCase()} SYLLABUS`,
          type: 'PDF',
          mediaUrl: fileData,
          metadata,
          timestamp: new Date().toLocaleString().toUpperCase()
        });
      }

      setNewFolderName('');
      setTargetClasses([]);
      setFolderPdf(null);
      setShowFolderModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchCloudData();
    } catch (err: any) { alert(`Error: ${getErrorMessage(err)}`); }
    finally { setUploading(false); }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !activeFolderId || !materialTitle.trim() || targetClasses.length === 0) return;
    setUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await db.curriculum.insertFile({
          folderId: activeFolderId,
          title: materialTitle.toUpperCase(),
          type: selectedFile.type.includes('pdf') ? 'PDF' : 'IMAGE',
          mediaUrl: ev.target?.result as string,
          metadata: { target_classes: targetClasses.join(','), target_sections: targetSections.join(',') },
          timestamp: new Date().toLocaleString().toUpperCase()
        });
        setShowFileModal(false);
        setMaterialTitle('');
        setSelectedFile(null);
        setTargetClasses([]);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (err) { console.error(err); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(selectedFile);
  };

  const filteredFolders = useMemo(() => {
    return folders.filter(f => {
      // Teachers and Admins see everything
      if (isStudent) {
        const targets = f.metadata?.target_classes?.split(',') || [];
        return targets.includes(user.class || '');
      }
      return true;
    });
  }, [folders, isStudent, user.class]);

  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId), [folders, activeFolderId]);
  
  const filteredFiles = useMemo(() => {
    if (!activeFolder?.curriculum_files) return [];
    return activeFolder.curriculum_files.filter((f: any) => {
      const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase());
      // Teachers and Admins see all files in the folder
      if (isStudent) {
        const targets = f.metadata?.target_classes?.split(',') || [];
        const sections = f.metadata?.target_sections?.split(',') || [];
        return matchesSearch && targets.includes(user.class || '') && sections.includes(user.section || '');
      }
      return matchesSearch;
    });
  }, [activeFolder, searchQuery, isStudent, user]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCcw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Syncing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <p className="font-black text-xs uppercase tracking-widest">Registry Updated</p>
           </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 px-4 sm:px-0">
        <div className="flex items-center gap-6">
          {activeFolderId && (
            <button onClick={() => setActiveFolderId(null)} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 hover:text-indigo-600 transition-all shadow-sm"><ArrowLeft size={24} /></button>
          )}
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{activeFolder ? activeFolder.name : 'Educational Archive'}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional digital archive management terminal.</p>
          </div>
        </div>
        {!activeFolderId && !isStudent && (
          <button onClick={() => { setTargetClasses([]); setFolderPdf(null); setShowFolderModal(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><FolderPlus size={20} strokeWidth={3} /> Register Subject</button>
        )}
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
      ) : !activeFolderId ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-4 sm:px-0">
           {filteredFolders.map(folder => (
              <div key={folder.id} className="relative group">
                 <div onClick={() => setActiveFolderId(folder.id)} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all cursor-pointer overflow-hidden h-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[1.8rem] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner mb-8"><Folder size={28} /></div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase truncate tracking-tight">{folder.name}</h3>
                    <div className="space-y-1 mt-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{folder.curriculum_files?.length || 0} Assets Archived</p>
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest truncate">Target: {folder.metadata?.target_classes || 'Global Distribution'}</p>
                    </div>
                 </div>
                 {!isStudent && (
                   <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteFolderTarget(folder); }}
                    className="absolute top-6 right-6 p-3 bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white shadow-lg"
                   >
                     <Trash2 size={16} />
                   </button>
                 )}
              </div>
           ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mx-4 sm:mx-0">
           <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap justify-between items-center gap-6">
              <div className="flex items-center gap-8">
                 <h3 className="text-3xl font-black uppercase tracking-tight leading-none text-slate-900 dark:text-white">{activeFolder?.name} Node</h3>
                 <div className="relative group w-80 hidden md:block">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" placeholder="Search archive assets..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-14 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm text-xs uppercase" />
                 </div>
              </div>
              {!isStudent && <button onClick={() => { setTargetClasses([]); setTargetSections(['A','B','C','D']); setSelectedFile(null); setShowFileModal(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3 hover:bg-indigo-700 transition-all"><Plus size={18} strokeWidth={3} /> Add Educational Material</button>}
           </div>
           
           <div className="p-10 space-y-4 min-h-[400px]">
              {filteredFiles.map((file: any) => (
                <div key={file.id} className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-slate-50/50 dark:bg-slate-800/40 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-100 hover:bg-white dark:hover:bg-slate-800 transition-all group gap-8 shadow-sm">
                   <div className="flex items-center gap-8 min-w-0 flex-1">
                      <div className="w-16 h-16 bg-white dark:bg-slate-900 text-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-md shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">{file.type === 'PDF' ? <FileText size={32}/> : <FileIcon size={32}/>}</div>
                      <div className="min-w-0">
                         <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase truncate">{file.title}</h4>
                         <div className="flex flex-wrap gap-3 mt-2">
                            <span className="text-[9px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1.5 border border-indigo-100/50 dark:border-indigo-800"><Layers size={12}/> Target: {file.metadata?.target_classes || 'Standard Distribution'}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> Published {file.timestamp}</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      {!isStudent && (
                        <button onClick={() => setDeleteFileTarget(file)} className="p-5 text-rose-500 bg-rose-50 dark:bg-rose-900/30 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                           <Trash2 size={20} />
                        </button>
                      )}
                      <button onClick={() => setViewingFile(file)} className="px-8 py-5 bg-indigo-600 text-white rounded-2xl shadow-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95"><Eye size={20} /> View Document</button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* DELETE FOLDER CONFIRMATION */}
      {deleteFolderTarget && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-sm w-full shadow-2xl text-center border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Purge Subject?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] leading-relaxed uppercase tracking-widest">Delete <b>{deleteFolderTarget.name}</b> permanently?</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteFolderTarget(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={async () => {
                    const { error } = await supabase.from('curriculum_folders').delete().eq('id', deleteFolderTarget.id);
                    if (!error) { fetchCloudData(); setDeleteFolderTarget(null); }
                 }} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Delete Hub</button>
              </div>
           </div>
        </div>
      )}

      {/* DELETE FILE CONFIRMATION */}
      {deleteFileTarget && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-sm w-full shadow-2xl text-center border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <Trash2 size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Remove Asset?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] leading-relaxed uppercase tracking-widest">Remove <b>{deleteFileTarget.title}</b>?</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteFileTarget(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={async () => {
                    await db.curriculum.deleteFile(deleteFileTarget.id);
                    fetchCloudData();
                    setDeleteFileTarget(null);
                 }} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Purge File</button>
              </div>
           </div>
        </div>
      )}

      {showFolderModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-1 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Register Subject</h3>
                 <button onClick={() => setShowFolderModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleCreateFolder} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar flex flex-col lg:flex-row gap-8 bg-white dark:bg-slate-900">
                 <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Subject Title</label>
                       <input type="text" required value={newFolderName} onChange={e => setNewFolderName(e.target.value.toUpperCase())} placeholder="E.G. MATHEMATICS" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase text-xl text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Attach PDF (Optional)</label>
                       <div onClick={() => folderPdfRef.current?.click()} className={`w-full h-40 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${folderPdf ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 hover:bg-slate-100'}`}>
                          <Upload size={32} />
                          <p className="text-[10px] font-black uppercase truncate max-w-[250px]">{folderPdf ? folderPdf.name : 'Tap to attach syllabus'}</p>
                       </div>
                       <input type="file" ref={folderPdfRef} className="hidden" accept=".pdf" onChange={e => setFolderPdf(e.target.files?.[0] || null)} />
                    </div>
                 </div>
                 <div className="w-full lg:w-80 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 space-y-8 border border-slate-100 dark:border-slate-800 shadow-inner">
                    <div className="space-y-4">
                       <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={14}/> Standards</h4>
                       <div className="grid grid-cols-1 gap-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                          {authorizedClasses.map(cls => (
                             <button key={cls} type="button" onClick={() => toggleClass(cls)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-100'}`}>
                                {targetClasses.includes(cls) ? <CheckSquare size={14} /> : <Square size={14} />}
                                <span className="text-[10px] font-black uppercase truncate">{cls}</span>
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </form>
              <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                 <button onClick={handleCreateFolder} disabled={uploading || targetClasses.length === 0} className="w-full py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                    {uploading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />} Initialize Subject
                 </button>
              </div>
           </div>
        </div>
      )}

      {showFileModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sync Asset</h3>
                 <button onClick={() => setShowFileModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleUploadMaterial} className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-8 bg-white dark:bg-slate-900">
                 <div className="space-y-6">
                    <input type="text" required value={materialTitle} onChange={e => setMaterialTitle(e.target.value.toUpperCase())} placeholder="DOCUMENT HEADING..." className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-6 py-4 font-black uppercase text-lg text-indigo-600 outline-none shadow-inner" />
                    <div onClick={() => fileInputRef.current?.click()} className={`w-full h-40 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${selectedFile ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 text-slate-300 hover:bg-slate-100'}`}>
                       <Upload size={48} strokeWidth={1.5} />
                       <p className="text-xs font-black uppercase tracking-widest truncate max-w-[300px]">{selectedFile ? selectedFile.name : 'Tap to Browse repository'}</p>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 space-y-8 border border-slate-100 dark:border-slate-800 shadow-inner">
                    <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={14}/> Standards Selection</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                       {authorizedClasses.map(cls => (
                          <button key={cls} type="button" onClick={() => toggleClass(cls)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-100'}`}>
                             {targetClasses.includes(cls) ? <CheckSquare size={14} /> : <Square size={14} />}
                             <span className="text-[9px] font-black uppercase truncate">{cls}</span>
                          </button>
                       ))}
                    </div>
                 </div>
              </form>
              <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                 <button onClick={handleUploadMaterial} disabled={uploading || !selectedFile || targetClasses.length === 0} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-4">
                    {uploading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />} Sync Asset to Cloud
                 </button>
              </div>
           </div>
        </div>
      )}

      {viewingFile && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                 <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white truncate">{viewingFile.title}</h3>
                 <button onClick={() => setViewingFile(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950">
                 {viewingFile.type === 'PDF' ? (
                   <iframe src={viewingFile.media_url} className="w-full h-full border-none" title="Curriculum Viewer" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center p-8">
                      <img src={viewingFile.media_url} className="max-w-full max-h-full object-contain shadow-xl rounded-2xl" alt="Resource Preview" />
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Curriculum;