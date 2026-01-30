
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db, getErrorMessage } from '../supabase';
import { 
  FileText, Plus, Upload, X, FolderPlus, Folder, ArrowLeft, Clock, Eye, Loader2, FileIcon, 
  ShieldCheck, RefreshCcw, CheckSquare, Square, Layers, Search, CheckCircle2, Trash2, AlertTriangle, Lock
} from 'lucide-react';

interface CurriculumProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];

const Curriculum: React.FC<CurriculumProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const isAdmin = user.role === 'ADMIN';
  
  const authorizedClasses = useMemo(() => {
    if (isAdmin) return ALL_CLASSES;
    const teacherClasses = (user as any).classes || (user.class ? [user.class] : []);
    return ALL_CLASSES.filter(c => teacherClasses.includes(c));
  }, [user, isAdmin]);

  const [folders, setFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingFile, setViewingFile] = useState<any>(null);

  const fetchCloudData = async () => {
    try {
      const data = await db.curriculum.getFolders();
      setFolders(data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchCloudData(); }, []);

  const filteredFolders = useMemo(() => {
    return folders.filter(f => {
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
      if (isStudent) {
        const targets = f.metadata?.target_classes?.split(',') || [];
        return matchesSearch && targets.includes(user.class || '');
      }
      return matchesSearch;
    });
  }, [activeFolder, searchQuery, isStudent, user]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 px-4 sm:px-0">
        <div className="flex items-center gap-6">
          {activeFolderId && (
            <button onClick={() => setActiveFolderId(null)} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 hover:text-indigo-600 transition-all shadow-sm"><ArrowLeft size={24} /></button>
          )}
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{activeFolder ? activeFolder.name : 'Digital Resources'}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional Academic digital archive.</p>
          </div>
        </div>
        {isStudent && (
          <div className="flex items-center gap-3 px-6 py-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-2xl shadow-sm">
             <ShieldCheck size={18} className="text-indigo-600" />
             <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Authorized Scholar View</span>
          </div>
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
              </div>
           ))}
           {filteredFolders.length === 0 && (
             <div className="col-span-full py-40 text-center opacity-30">
                <Folder size={64} className="mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">No resources registered for your standard</p>
             </div>
           )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mx-4 sm:mx-0">
           <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap justify-between items-center gap-6">
              <h3 className="text-3xl font-black uppercase tracking-tight leading-none text-slate-900 dark:text-white">{activeFolder?.name} Node</h3>
              <div className="relative group w-80">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                 <input type="text" placeholder="Search documents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-14 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm text-xs uppercase" />
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
                   <button onClick={() => setViewingFile(file)} className="px-8 py-5 bg-indigo-600 text-white rounded-2xl shadow-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95"><Eye size={20} /> View Asset</button>
                </div>
              ))}
              {filteredFiles.length === 0 && (
                <div className="py-20 text-center opacity-30">
                   <FileText size={48} className="mx-auto mb-2" />
                   <p className="text-[10px] font-black uppercase">No matching digital assets found</p>
                </div>
              )}
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
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-center">
                 <div className="flex items-center gap-3 px-6 py-2 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
                    <Lock size={12} className="text-slate-300" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authenticated View-Only Document</span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Curriculum;
