
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db, getErrorMessage } from '../supabase';
import { 
  FileText, Plus, Upload, X, FolderPlus, Folder, ArrowLeft, Clock, Eye, Loader2, FileIcon, 
  ShieldCheck, RefreshCcw, CheckSquare, Square, Layers, Search, CheckCircle2, Trash2, AlertTriangle, Lock, Target, Edit2, Save,
  Check, Filter
} from 'lucide-react';

interface CurriculumProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];

const Curriculum: React.FC<CurriculumProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  const isStudent = user.role === 'STUDENT';
  const isTeacher = user.role === 'TEACHER';
  
  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingFile, setViewingFile] = useState<any>(null);
  
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [folderName, setFolderName] = useState('');
  const [targetClasses, setTargetClasses] = useState<string[]>([]);

  const [showFileModal, setShowFileModal] = useState(false);
  const [fileTitle, setFileTitle] = useState('');
  const [tempPdf, setTempPdf] = useState<{url: string, name: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation States
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);

  const fetchCloudData = async () => {
    try {
      const data = await db.curriculum.getFolders();
      setFolders(data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchCloudData(); }, []);

  const handleEditFolder = (folder: any) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    const savedTargets = folder.metadata?.target_classes;
    setTargetClasses(savedTargets ? savedTargets.split(',').map((s: string) => s.trim()) : []);
    setShowFolderModal(true);
  };

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !folderName) return;
    if (targetClasses.length === 0) {
      alert("Please select at least one Target Class Node.");
      return;
    }

    setIsSyncing(true);
    try {
      const metadata = { target_classes: targetClasses.join(',') };
      if (editingFolder) {
        await supabase.from('curriculum_folders').update({ name: folderName.toUpperCase(), metadata }).eq('id', editingFolder.id);
      } else {
        await db.curriculum.insertFolder(folderName.toUpperCase(), new Date().toLocaleDateString(), metadata);
      }
      await createAuditLog(user, editingFolder ? 'UPDATE' : 'CREATE', 'Curriculum', `Subject Node: ${folderName} for ${targetClasses.length} nodes`);
      setShowFolderModal(false);
      setEditingFolder(null);
      setFolderName('');
      setTargetClasses([]);
      fetchCloudData();
    } catch (err) { alert("Sync failed."); }
    finally { setIsSyncing(false); }
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') { alert("Please upload a PDF file only."); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTempPdf({ url: ev.target?.result as string, name: file.name });
        if (!fileTitle) setFileTitle(file.name.replace('.pdf', '').toUpperCase());
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !activeFolderId || !fileTitle || !tempPdf) return;
    setIsSyncing(true);
    try {
      await db.curriculum.insertFile({
        folderId: activeFolderId,
        title: fileTitle.toUpperCase(),
        type: 'PDF',
        mediaUrl: tempPdf.url,
        timestamp: new Date().toLocaleDateString('en-GB'),
        metadata: activeFolder?.metadata
      });
      await createAuditLog(user, 'CREATE', 'Curriculum', `Resource: ${fileTitle} in ${activeFolder?.name}`);
      setShowFileModal(false);
      setFileTitle('');
      setTempPdf(null);
      fetchCloudData();
    } catch (err) { alert("File sync failed."); }
    finally { setIsSyncing(false); }
  };

  const executeDeleteFolder = async () => {
    if (!deleteFolderId) return;
    setIsSyncing(true);
    try {
      await supabase.from('curriculum_folders').delete().eq('id', deleteFolderId);
      await createAuditLog(user, 'DELETE', 'Curriculum', `Subject Node Purged: ${deleteFolderId}`);
      setDeleteFolderId(null);
      fetchCloudData();
    } catch (err) { alert("Delete failed."); }
    finally { setIsSyncing(false); }
  };

  const executeDeleteFile = async () => {
    if (!deleteFileId) return;
    setIsSyncing(true);
    try {
      await db.curriculum.deleteFile(deleteFileId);
      await createAuditLog(user, 'DELETE', 'Curriculum', `Document Purged: ${deleteFileId}`);
      setDeleteFileId(null);
      fetchCloudData();
    } catch (err) { alert("Delete failed."); }
    finally { setIsSyncing(false); }
  };

  const filteredFolders = useMemo(() => {
    return folders.filter(f => {
      const rawTargets = f.metadata?.target_classes || '';
      const folderTargets = rawTargets.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
      
      if (isStudent) {
        const studentClass = String(user.class || '').trim().toUpperCase();
        
        // Match 1: Full string match
        let isTargeted = folderTargets.includes(studentClass);
        
        // Match 2: Numeric part match (Smart fuzzy match)
        if (!isTargeted && studentClass) {
          const studentNum = studentClass.match(/\d+/)?.[0];
          if (studentNum) {
            isTargeted = folderTargets.some(target => {
              const targetNum = target.match(/\d+/)?.[0];
              return targetNum === studentNum;
            });
          }
        }
        if (!isTargeted) return false;
      }
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [folders, isStudent, user.class, searchQuery]);

  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId), [folders, activeFolderId]);
  const filteredFiles = useMemo(() => {
    if (!activeFolder?.curriculum_files) return [];
    return activeFolder.curriculum_files.filter((f: any) => 
      f.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeFolder, searchQuery]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 px-4 sm:px-0">
        <div className="flex items-center gap-6">
          {activeFolderId && <button onClick={() => { setActiveFolderId(null); setSearchQuery(''); }} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 hover:text-indigo-600 transition-all shadow-sm"><ArrowLeft size={24} /></button>}
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{activeFolder ? activeFolder.name : 'Curriculum Vault'}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">
               {isStudent ? `Standard ${user.class} Integrated Hub` : 'Digital Institutional Resource Management'}
            </p>
          </div>
        </div>
        {!activeFolderId && isAdmin && <button onClick={() => { setEditingFolder(null); setFolderName(''); setTargetClasses([]); setShowFolderModal(true); }} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:bg-indigo-700 transition-all uppercase text-xs active:scale-95"><FolderPlus size={20} /> Create Subject Node</button>}
      </div>

      {!activeFolderId && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 mx-4 sm:mx-0">
            <Search className="text-slate-300 ml-4" size={20} />
            <input type="text" placeholder="Search institutional modules..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none font-bold outline-none dark:text-white uppercase text-xs tracking-widest" />
            {isStudent && <button onClick={fetchCloudData} className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl"><RefreshCcw size={18} /></button>}
        </div>
      )}

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
      ) : !activeFolderId ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4 sm:px-0">
           {filteredFolders.map(folder => {
              const targets = folder.metadata?.target_classes?.split(',') || [];
              return (
                <div key={folder.id} onClick={() => { setActiveFolderId(folder.id); setSearchQuery(''); }} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all cursor-pointer overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[1.8rem] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner mb-8"><Folder size={28} /></div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase truncate tracking-tight">{folder.name}</h3>
                    <div className="mt-2 space-y-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{folder.curriculum_files?.length || 0} Documents Archived</p>
                       {!isStudent && <div className="flex items-center gap-2 text-[8px] font-black text-indigo-500 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-800 w-fit"><Target size={10}/> {targets.length} Target Nodes</div>}
                    </div>
                    {isAdmin && (
                      <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                         <button onClick={(e) => { e.stopPropagation(); handleEditFolder(folder); }} className="p-3 bg-white dark:bg-slate-800 text-emerald-600 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 hover:bg-emerald-600 hover:text-white transition-all"><Edit2 size={16}/></button>
                         <button onClick={(e) => { e.stopPropagation(); setDeleteFolderId(folder.id); }} className="p-3 bg-white dark:bg-slate-800 text-rose-400 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                      </div>
                    )}
                </div>
              );
           })}
           {filteredFolders.length === 0 && (
             <div className="col-span-full py-40 text-center opacity-30 flex flex-col items-center justify-center">
                <FileIcon size={64} className="mb-4" />
                <p className="font-black text-sm uppercase tracking-widest">Vault is empty for your identity profile</p>
             </div>
           )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mx-4 sm:mx-0">
           <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap justify-between items-center gap-6">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tight leading-none text-slate-900 dark:text-white">{activeFolder?.name}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2"><Target size={12}/> Authorized Nodes: {activeFolder?.metadata?.target_classes || 'GLOBAL'}</p>
              </div>
              <div className="flex gap-4">
                 <div className="relative group w-64">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" placeholder="Filter node resources..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-black outline-none focus:ring-4 focus:ring-indigo-500/10 text-[10px] uppercase shadow-inner" />
                 </div>
                 {isAdmin && <button onClick={() => setShowFileModal(true)} className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 font-black text-xs uppercase px-6"><Plus size={20} strokeWidth={3}/> Sync New Data</button>}
              </div>
           </div>
           
           <div className="p-10 space-y-4 min-h-[400px]">
              {filteredFiles.map((file: any) => (
                <div key={file.id} className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-slate-50/50 dark:bg-slate-800/40 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-100 hover:bg-white dark:hover:bg-slate-800 transition-all group gap-8 shadow-sm">
                   <div className="flex items-center gap-8 min-w-0 flex-1">
                      <div className="w-16 h-16 bg-white dark:bg-slate-900 text-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-md shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all"><FileText size={32}/></div>
                      <div className="min-w-0">
                         <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase truncate">{file.title}</h4>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5"><Clock size={12}/> Synchronized {file.timestamp}</p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => setViewingFile(file)} className="px-8 py-5 bg-indigo-600 text-white rounded-2xl shadow-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95"><Eye size={20} /> View Source</button>
                      {isAdmin && <button onClick={() => setDeleteFileId(file.id)} className="p-5 text-rose-500 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={18}/></button>}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* FOLDER PURGE DIALOG */}
      {deleteFolderId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={40} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-tight">Purge Subject Node?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-xs leading-relaxed uppercase tracking-widest">
                This will permanently delete the entire subject node and all associated cloud documents.
              </p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteFolderId(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Discard</button>
                 <button onClick={executeDeleteFolder} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Execute Purge</button>
              </div>
           </div>
        </div>
      )}

      {/* FILE DELETE DIALOG */}
      {deleteFileId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-tight">Purge Document?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-xs leading-relaxed uppercase tracking-widest">
                Remove this PDF resource from the institutional archive permanently?
              </p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteFileId(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Discard</button>
                 <button onClick={executeDeleteFile} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Confirm Purge</button>
              </div>
           </div>
        </div>
      )}

      {/* FOLDER MODAL */}
      {showFolderModal && isAdmin && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-2xl font-black uppercase tracking-tight">{editingFolder ? 'Modify Node' : 'Initialize Subject Node'}</h3>
                 <button onClick={() => setShowFolderModal(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={32} /></button>
              </div>
              <form onSubmit={handleSaveFolder} className="p-10 flex flex-col md:flex-row gap-10">
                 <div className="flex-1 space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Identity Token (Name)</label>
                        <input type="text" required value={folderName} onChange={e => setFolderName(e.target.value.toUpperCase())} placeholder="e.g., MATHEMATICS PRO" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                    </div>
                    <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                       <h4 className="text-[11px] font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-widest mb-4 flex items-center gap-2"><Target size={16}/> Target Authorization</h4>
                       <p className="text-[10px] font-medium text-indigo-700/60 dark:text-indigo-400/60 leading-relaxed uppercase tracking-wider">Only students within these specific nodes will be authorized to access this resource vault.</p>
                       <div className="mt-4 flex flex-wrap gap-2"><span className="text-[9px] font-black px-3 py-1 bg-indigo-600 text-white rounded-full uppercase">{targetClasses.length} Nodes Active</span></div>
                    </div>
                    <button type="submit" disabled={isSyncing} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3">{isSyncing ? <Loader2 className="animate-spin" /> : <Save size={20} />} Sync to Cloud</button>
                 </div>
                 <div className="w-full md:w-80 space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Filter size={14}/> Node Registry</label>
                        <div className="flex gap-2">
                           <button type="button" onClick={() => setTargetClasses([...ALL_CLASSES])} className="text-[8px] font-black text-indigo-600 uppercase">All</button>
                           <button type="button" onClick={() => setTargetClasses([])} className="text-[8px] font-black text-rose-500 uppercase">Clear</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-[350px] overflow-y-auto custom-scrollbar p-2 bg-slate-50 dark:bg-slate-800 rounded-3xl shadow-inner">
                       {ALL_CLASSES.map(cls => (
                         <button key={cls} type="button" onClick={() => setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls])} className={`px-2 py-3 rounded-xl text-[8px] font-black uppercase transition-all border flex items-center justify-between gap-2 ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-400'}`}>
                            <span className="truncate">{cls}</span>
                            {targetClasses.includes(cls) && <Check size={12} strokeWidth={4}/>}
                         </button>
                       ))}
                    </div>
                 </div>
              </form>
           </div>
        </div>
      )}

      {showFileModal && isAdmin && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Synchronize Material</h3>
                 <button onClick={() => { setShowFileModal(false); setTempPdf(null); setFileTitle(''); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={32} /></button>
              </div>
              <form onSubmit={handleSaveFile} className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Label</label>
                    <input type="text" required value={fileTitle} onChange={e => setFileTitle(e.target.value.toUpperCase())} placeholder="e.g. UNIT 1 SYLLABUS" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Data Stream (PDF)</label>
                    <div onClick={() => fileInputRef.current?.click()} className={`w-full h-40 border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${tempPdf ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 hover:bg-slate-100'}`}>
                      {tempPdf ? <><CheckCircle2 size={48} className="text-emerald-500" /><p className="text-[9px] font-black uppercase truncate max-w-[80%]">{tempPdf.name}</p></> : <><Upload size={48} className="text-indigo-200" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select PDF Archive</p></>}
                      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handlePdfSelect} />
                    </div>
                 </div>
                 <button type="submit" disabled={isSyncing || !tempPdf} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl uppercase text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">{isSyncing ? <Loader2 className="animate-spin" /> : <Save size={20} />} Commit Data Stream</button>
              </form>
           </div>
        </div>
      )}

      {/* PDF VIEWER */}
      {viewingFile && (
        <div className="fixed inset-0 z-[1400] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="flex items-center gap-4"><div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FileText size={20}/></div><h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white truncate max-w-[200px] md:max-w-md">{viewingFile.title}</h3></div>
                 <button onClick={() => setViewingFile(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-hidden bg-white"><iframe src={viewingFile.media_url} className="w-full h-full border-none" title="Archive Viewer" /></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Curriculum;
