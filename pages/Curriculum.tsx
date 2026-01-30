
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db, getErrorMessage } from '../supabase';
import { 
  FileText, Plus, Upload, X, FolderPlus, Folder, ArrowLeft, Clock, Eye, Loader2, FileIcon, 
  ShieldCheck, RefreshCcw, CheckSquare, Square, Layers, Search, CheckCircle2, Trash2, AlertTriangle, Lock, Target, Edit2, Save
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
    setTargetClasses(folder.metadata?.target_classes?.split(',') || []);
    setShowFolderModal(true);
  };

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !folderName) return;
    setIsSyncing(true);
    try {
      const metadata = { target_classes: targetClasses.join(',') };
      if (editingFolder) {
        await supabase.from('curriculum_folders').update({ name: folderName.toUpperCase(), metadata }).eq('id', editingFolder.id);
      } else {
        await db.curriculum.insertFolder(folderName.toUpperCase(), new Date().toLocaleDateString(), metadata);
      }
      await createAuditLog(user, editingFolder ? 'UPDATE' : 'CREATE', 'Curriculum', `Folder: ${folderName}`);
      setShowFolderModal(false);
      setEditingFolder(null);
      setFolderName('');
      setTargetClasses([]);
      fetchCloudData();
    } catch (err) { alert("Sync failed."); }
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
    } catch (err) { alert("Purge failed."); }
    finally { setIsSyncing(false); }
  };

  const executeDeleteFile = async () => {
    if (!deleteFileId) return;
    setIsSyncing(true);
    try {
      await db.curriculum.deleteFile(deleteFileId);
      await createAuditLog(user, 'DELETE', 'Curriculum', `Material Document Purged: ${deleteFileId}`);
      setDeleteFileId(null);
      fetchCloudData();
    } catch (err) { alert("Purge failed."); }
    finally { setIsSyncing(false); }
  };

  const filteredFolders = useMemo(() => {
    return folders.filter(f => {
      if (isStudent) {
        const targets = f.metadata?.target_classes?.split(',').map((s: string) => s.trim().toUpperCase()) || [];
        const studentClass = (user.class || '').trim().toUpperCase();
        return targets.includes(studentClass);
      }
      return true;
    });
  }, [folders, isStudent, user.class]);

  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId), [folders, activeFolderId]);
  
  const filteredFiles = useMemo(() => {
    if (!activeFolder?.curriculum_files) return [];
    return activeFolder.curriculum_files.filter((f: any) => {
      const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (isStudent) {
        const targets = f.metadata?.target_classes?.split(',').map((s: string) => s.trim().toUpperCase()) || [];
        const studentClass = (user.class || '').trim().toUpperCase();
        return matchesSearch && targets.includes(studentClass);
      }
      return matchesSearch;
    });
  }, [activeFolder, searchQuery, isStudent, user.class]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 px-4 sm:px-0">
        <div className="flex items-center gap-6">
          {activeFolderId && (
            <button onClick={() => setActiveFolderId(null)} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 hover:text-indigo-600 transition-all shadow-sm"><ArrowLeft size={24} /></button>
          )}
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{activeFolder ? activeFolder.name : 'Curriculum Vault'}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">
               {isStudent ? `Academic Grid: Standard ${user.class}` : 'Digital Resource Management'}
            </p>
          </div>
        </div>
        {!activeFolderId && isAdmin && (
           <button onClick={() => { setEditingFolder(null); setFolderName(''); setTargetClasses([]); setShowFolderModal(true); }} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:bg-indigo-700 transition-all uppercase text-xs active:scale-95">
              <FolderPlus size={20} /> Create Module
           </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
      ) : !activeFolderId ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-4 sm:px-0">
           {filteredFolders.map(folder => (
              <div key={folder.id} onClick={() => setActiveFolderId(folder.id)} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all cursor-pointer overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[1.8rem] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner mb-8"><Folder size={28} /></div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase truncate tracking-tight">{folder.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{folder.curriculum_files?.length || 0} Documents Archived</p>
                  {isAdmin && (
                    <div className="absolute bottom-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={(e) => { e.stopPropagation(); handleEditFolder(folder); }} className="p-3 bg-white text-emerald-600 rounded-xl shadow-sm hover:bg-emerald-600 hover:text-white"><Edit2 size={16}/></button>
                       <button onClick={(e) => { e.stopPropagation(); setDeleteFolderId(folder.id); }} className="p-3 bg-white text-rose-400 rounded-xl shadow-sm hover:bg-rose-600 hover:text-white"><Trash2 size={16}/></button>
                    </div>
                  )}
              </div>
           ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mx-4 sm:mx-0">
           <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap justify-between items-center gap-6">
              <h3 className="text-3xl font-black uppercase tracking-tight leading-none text-slate-900 dark:text-white">{activeFolder?.name} Files</h3>
              <div className="flex gap-4">
                 <div className="relative group w-64">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" placeholder="Filter archive..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-black outline-none focus:ring-4 focus:ring-indigo-500/10 text-[10px] uppercase shadow-inner" />
                 </div>
                 {isAdmin && (
                    <button className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all"><Plus size={20}/></button>
                 )}
              </div>
           </div>
           
           <div className="p-10 space-y-4 min-h-[400px]">
              {filteredFiles.map((file: any) => (
                <div key={file.id} className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-slate-50/50 dark:bg-slate-800/40 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-100 hover:bg-white dark:hover:bg-slate-800 transition-all group gap-8 shadow-sm">
                   <div className="flex items-center gap-8 min-w-0 flex-1">
                      <div className="w-16 h-16 bg-white dark:bg-slate-900 text-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-md shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">{file.type === 'PDF' ? <FileText size={32}/> : <FileIcon size={32}/>}</div>
                      <div className="min-w-0">
                         <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase truncate">{file.title}</h4>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5"><Clock size={12}/> Published {file.timestamp}</p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => setViewingFile(file)} className="px-8 py-5 bg-indigo-600 text-white rounded-2xl shadow-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95"><Eye size={20} /> View</button>
                      {isAdmin && (
                        <button onClick={() => setDeleteFileId(file.id)} className="p-5 text-rose-500 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={18}/></button>
                      )}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* FOLDER DELETE DIALOG - COMPACT SMALL SIZE */}
      {deleteFolderId && isAdmin && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-[320px] w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.2rem] flex items-center justify-center mb-5 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Purge Module?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium text-[9px] leading-relaxed uppercase tracking-widest">Permanent erasure of Subject Node?</p>
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setDeleteFolderId(null)} className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl uppercase text-[9px]">Cancel</button>
                 <button onClick={executeDeleteFolder} className="py-3 bg-rose-600 text-white font-black rounded-xl shadow-lg hover:bg-rose-700 transition-all uppercase text-[9px]">Purge</button>
              </div>
           </div>
        </div>
      )}

      {/* FILE DELETE DIALOG - COMPACT SMALL SIZE */}
      {deleteFileId && isAdmin && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-[320px] w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.2rem] flex items-center justify-center mb-5 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Delete File?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium text-[9px] leading-relaxed uppercase tracking-widest">Remove document from archive?</p>
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => setDeleteFileId(null)} className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl uppercase text-[9px]">Cancel</button>
                 <button onClick={executeDeleteFile} className="py-3 bg-rose-600 text-white font-black rounded-xl shadow-lg hover:bg-rose-700 transition-all uppercase text-[9px]">Delete</button>
              </div>
           </div>
        </div>
      )}

      {/* FOLDER MODAL */}
      {showFolderModal && isAdmin && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-2xl font-black uppercase tracking-tight">{editingFolder ? 'Edit Subject Node' : 'New Subject Node'}</h3>
                 <button onClick={() => setShowFolderModal(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={32} /></button>
              </div>
              <form onSubmit={handleSaveFolder} className="p-10 space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Node Title</label>
                    <input type="text" required value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="e.g., ADVANCED MATHEMATICS" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Standards</label>
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                       {ALL_CLASSES.map(cls => (
                         <button key={cls} type="button" onClick={() => setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls])} className={`px-2 py-2 rounded-lg text-[8px] font-black uppercase transition-all border ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-transparent text-slate-400'}`}>
                            {cls}
                         </button>
                       ))}
                    </div>
                 </div>
                 <button type="submit" disabled={isSyncing} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                    {isSyncing ? <Loader2 className="animate-spin" /> : <Save size={20} />} 
                    {editingFolder ? 'Update Node' : 'Sync Node to Cloud'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Curriculum;
