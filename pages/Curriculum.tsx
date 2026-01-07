
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
  Search,
  FileIcon,
  Save,
  ExternalLink,
  Maximize2,
  Eye
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
  const [folders, setFolders] = useState<CurriculumFolder[]>(() => {
    const saved = localStorage.getItem('school_curriculum_vault_v5');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewingFile, setViewingFile] = useState<CurriculumFile | null>(null);
  const [editingFolder, setEditingFolder] = useState<CurriculumFolder | null>(null);
  const [editingFile, setEditingFile] = useState<CurriculumFile | null>(null);
  
  // High-Fidelity Confirmation States
  const [fileToDeleteId, setFileToDeleteId] = useState<string | null>(null);
  const [folderToDeleteId, setFolderToDeleteId] = useState<string | null>(null);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [folderName, setFolderName] = useState('');
  const [fileData, setFileData] = useState({ title: '', type: 'PDF' as CurriculumFile['type'] });
  const [tempMedia, setTempMedia] = useState<NoticeMedia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('school_curriculum_vault_v5', JSON.stringify(folders));
  }, [folders]);

  const activeFolder = useMemo(() => 
    folders.find(f => f.id === activeFolderId), 
    [folders, activeFolderId]
  );

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true
    }).replace(',', ' at');
  };

  const handleSaveFolder = () => {
    if (!folderName.trim()) return;
    
    if (editingFolder) {
      setFolders(prev => prev.map(f => f.id === editingFolder.id ? { 
        ...f, name: folderName, timestamp: `Modified: ${getTimestamp()}` 
      } : f));
      createAuditLog(user, 'UPDATE', 'Curriculum', `Renamed folder: "${editingFolder.name}" to "${folderName}"`);
      triggerSuccess('Folder title synchronized');
    } else {
      const newFolder: CurriculumFolder = {
        id: Math.random().toString(36).substr(2, 9),
        name: folderName,
        timestamp: `Established: ${getTimestamp()}`,
        files: []
      };
      setFolders(prev => [newFolder, ...prev]);
      createAuditLog(user, 'CREATE', 'Curriculum', `Established new folder: "${folderName}"`);
      triggerSuccess('Curriculum folder created');
    }
    setFolderName('');
    setEditingFolder(null);
    setShowFolderModal(false);
  };

  const confirmDeleteFolder = () => {
    if (!folderToDeleteId) return;
    const targetFolder = folders.find(f => f.id === folderToDeleteId);
    setFolders(prev => prev.filter(f => f.id !== folderToDeleteId));
    if (activeFolderId === folderToDeleteId) setActiveFolderId(null);
    setFolderToDeleteId(null);
    createAuditLog(user, 'DELETE', 'Curriculum', `Purged folder and all contents: "${targetFolder?.name}"`);
    triggerSuccess('Folder and contents purged');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTempMedia({
        url: ev.target?.result as string,
        type: 'pdf' as any,
        name: file.name
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFile = () => {
    if (!fileData.title.trim() || !activeFolderId) return;

    const fileToSave: CurriculumFile = {
      id: editingFile?.id || Math.random().toString(36).substr(2, 9),
      title: fileData.title,
      type: 'PDF',
      metadata: tempMedia ? `${(tempMedia.name)}` : editingFile?.metadata || 'Source: Institution Cloud',
      timestamp: editingFile ? `Updated: ${getTimestamp()}` : `Uploaded: ${getTimestamp()}`,
      media: tempMedia || editingFile?.media
    };

    setFolders(prev => prev.map(f => {
      if (f.id === activeFolderId) {
        if (editingFile) {
          return { ...f, files: f.files.map(file => file.id === editingFile.id ? fileToSave : file) };
        } else {
          return { ...f, files: [fileToSave, ...f.files] };
        }
      }
      return f;
    }));

    const folderNameLog = activeFolder?.name || 'Unknown';
    if (editingFile) {
      createAuditLog(user, 'UPDATE', 'Curriculum', `Modified PDF Details: "${fileData.title}" in folder "${folderNameLog}"`);
    } else {
      createAuditLog(user, 'CREATE', 'Curriculum', `Published PDF: "${fileData.title}" to folder "${folderNameLog}"`);
    }

    triggerSuccess(editingFile ? 'Resource details synchronized' : 'PDF published to folder');
    setShowFileModal(false);
    setEditingFile(null);
    setTempMedia(null);
    setFileData({ title: '', type: 'PDF' });
  };

  const confirmDeleteFile = () => {
    if (!fileToDeleteId || !activeFolderId) return;
    const targetFile = activeFolder?.files.find(f => f.id === fileToDeleteId);
    setFolders(prev => prev.map(f => {
      if (f.id === activeFolderId) {
        return { ...f, files: f.files.filter(file => file.id !== fileToDeleteId) };
      }
      return f;
    }));
    setFileToDeleteId(null);
    createAuditLog(user, 'DELETE', 'Curriculum', `Purged document: "${targetFile?.title}" from folder "${activeFolder?.name}"`);
    triggerSuccess('PDF purged from registry');
  };

  const openInBrowser = (file: CurriculumFile) => {
    if (file.media?.url) {
      const win = window.open();
      if (win) {
        win.document.title = file.title;
        win.document.write(`<iframe src="${file.media.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        win.document.close();
      }
    }
  };

  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-emerald-200/50 flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Transaction Verified</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">{successMsg}</p>
              </div>
           </div>
        </div>
      )}

      {/* Institutional Delete Confirmation Modal */}
      {(fileToDeleteId || folderToDeleteId) && (
        <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mb-6 mx-auto border border-rose-100 shadow-inner">
                 <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Erase Record?</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                 {folderToDeleteId ? 'Deleting this folder will permanently erase all nested PDF documents within it.' : 'This academic material will be permanently purged from the registry.'}
              </p>
              <div className="flex gap-3">
                 <button onClick={() => { setFileToDeleteId(null); setFolderToDeleteId(null); }} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors">Cancel</button>
                 <button onClick={folderToDeleteId ? confirmDeleteFolder : confirmDeleteFile} className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">Confirm Delete</button>
              </div>
           </div>
        </div>
      )}

      {/* PDF Secure Terminal Viewer */}
      {showViewer && viewingFile && (
        <div className="fixed inset-0 z-[600] bg-slate-950/98 backdrop-blur-2xl flex flex-col p-4 lg:p-10 animate-in zoom-in-95 duration-300">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 text-white px-2">
              <div className="flex items-center gap-5">
                 <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <FileText size={28} />
                 </div>
                 <div>
                    <h3 className="text-2xl lg:text-3xl font-black tracking-tight uppercase leading-none">{viewingFile.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                       <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                         <Clock size={12} className="text-indigo-400" /> {viewingFile.timestamp}
                       </p>
                       <div className="hidden sm:block w-1 h-1 bg-white/20 rounded-full"></div>
                       <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest truncate">{viewingFile.metadata}</p>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button 
                  onClick={() => openInBrowser(viewingFile)}
                  className="px-6 py-4 bg-white/5 hover:bg-white/10 text-indigo-400 rounded-2xl transition-all border border-white/5 flex items-center gap-2 font-black text-xs uppercase tracking-widest"
                 >
                    <ExternalLink size={20} /> Browser Tab View
                 </button>
                 <button onClick={() => setShowViewer(false)} className="p-4 bg-white/10 hover:bg-rose-600 text-white rounded-2xl transition-all">
                    <X size={32} />
                 </button>
              </div>
           </div>
           <div className="flex-1 bg-white rounded-[3rem] overflow-hidden shadow-2xl relative border-8 border-white/10">
              {viewingFile.media?.url ? (
                <iframe src={viewingFile.media.url} className="w-full h-full border-none" title={viewingFile.title} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                   <AlertCircle size={64} />
                   <p className="font-bold text-xl uppercase tracking-widest">Resource Not Reachable</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Modals for Management */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingFolder ? 'Rename Category' : 'Establish Folder'}</h3>
                 <button onClick={() => setShowFolderModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Folder Name</label>
                    <input 
                      type="text" 
                      autoFocus
                      value={folderName}
                      onChange={e => setFolderName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveFolder()}
                      placeholder="e.g., Mathematics - Semester 1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setShowFolderModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">Cancel</button>
                    <button onClick={handleSaveFolder} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2">
                      <Save size={18} /> Save Folder
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showFileModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingFile ? 'Modify PDF Label' : 'Upload Academic PDF'}</h3>
                 <button onClick={() => setShowFileModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Document Title</label>
                    <input 
                      type="text" 
                      value={fileData.title}
                      onChange={e => setFileData({...fileData, title: e.target.value})}
                      placeholder="e.g., Algebra Study Guide"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                 </div>
                 
                 <div className="flex flex-col gap-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">File Attachment</label>
                    <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 bg-indigo-50 text-indigo-600 font-black rounded-2xl border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center gap-2 hover:bg-indigo-100 transition-all group"
                    >
                      {uploading ? (
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Upload size={28} className="group-hover:-translate-y-1 transition-transform" />
                      )}
                      <span className="text-[10px] uppercase tracking-widest">{tempMedia || editingFile?.media ? 'Change PDF Source' : 'Select PDF from Device'}</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
                 </div>

                 {(tempMedia || (editingFile?.media)) && (
                   <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                        <FileIcon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Authenticated Attachment</p>
                        <p className="text-xs font-bold text-slate-700 truncate">{tempMedia?.name || editingFile?.metadata}</p>
                      </div>
                      <button onClick={() => setTempMedia(null)} className="p-2 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"><X size={16} /></button>
                   </div>
                 )}

                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setShowFileModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors">Discard</button>
                    <button onClick={handleSaveFile} disabled={!fileData.title || (!tempMedia && !editingFile?.media)} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50">
                      {editingFile ? 'Update Details' : 'Publish PDF'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Main Header Content */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {activeFolderId && (
            <button 
              onClick={() => setActiveFolderId(null)}
              className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-indigo-600 shadow-sm transition-all hover:scale-110"
            >
              <ArrowLeft size={24} strokeWidth={3} />
            </button>
          )}
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">
               {activeFolder ? activeFolder.name : 'Academic Registry'}
            </h1>
            <p className="text-slate-500 font-medium text-lg">
              {activeFolder ? `${activeFolder.files.length} documents archived in this directory.` : 'Manage and distribute educational curriculum resources.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <button 
              onClick={activeFolderId ? () => { setEditingFile(null); setShowFileModal(true); } : () => { setEditingFolder(null); setFolderName(''); setShowFolderModal(true); }}
              className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-3"
            >
              {activeFolderId ? <Upload size={20} strokeWidth={3} /> : <FolderPlus size={20} strokeWidth={3} />}
              {activeFolderId ? 'Publish PDF' : 'New Folder'}
            </button>
          )}
        </div>
      </div>

      {!activeFolderId ? (
        /* Folders Grid View */
        <div className="space-y-8">
           <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6">
              <div className="relative flex-1 w-full group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                 <input 
                  type="text" 
                  placeholder="Search repository by folder name..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-8 py-4.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" 
                 />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map(folder => (
                <div 
                  key={folder.id} 
                  onClick={() => setActiveFolderId(folder.id)}
                  className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-indigo-100/30 transition-all cursor-pointer group relative hover:-translate-y-2 overflow-hidden"
                >
                   <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[1.8rem] flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                      <Folder size={32} />
                   </div>
                   <h3 className="text-xl font-black text-slate-900 leading-tight mb-4 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{folder.name}</h3>
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <FileText size={12} className="text-indigo-500" /> {folder.files.length} Resources
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar size={12} className="text-indigo-500" /> {folder.timestamp}
                      </p>
                   </div>
                   
                   {canManage && (
                     <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setFolderName(folder.name); setShowFolderModal(true); }}
                          className="p-2.5 bg-white text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        >
                           <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setFolderToDeleteId(folder.id); }}
                          className="p-2.5 bg-white text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>
                   )}
                   <div className="mt-8 flex justify-end">
                      <div className="w-10 h-10 bg-slate-50 group-hover:bg-indigo-50 rounded-xl flex items-center justify-center transition-colors shadow-sm">
                        <ChevronRight size={24} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                      </div>
                   </div>
                </div>
              ))}

              {canManage && (
                <div 
                  onClick={() => { setEditingFolder(null); setFolderName(''); setShowFolderModal(true); }}
                  className="border-4 border-dashed border-slate-100 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all group"
                >
                   <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-200 group-hover:text-indigo-600 shadow-sm mb-4 transition-all">
                      <Plus size={32} strokeWidth={3} />
                   </div>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">Add Category</p>
                </div>
              )}
           </div>
           
           {folders.length === 0 && (
              <div className="py-32 bg-white rounded-[4rem] text-center border border-slate-100 shadow-sm">
                <div className="w-24 h-24 bg-slate-50 text-slate-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-100">
                  <Folder size={48} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Academic Vault is Empty</h3>
                <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2">Start by creating a folder to categorize your educational materials.</p>
                {canManage && (
                   <button 
                    onClick={() => setShowFolderModal(true)}
                    className="mt-8 px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                   >
                     Setup Initial Folder
                   </button>
                )}
             </div>
           )}
        </div>
      ) : (
        /* Folder Contents View */
        <div className="animate-in slide-in-from-right-4 duration-500">
           <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-[1.25rem] flex items-center justify-center shadow-lg">
                       <Folder size={28} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">{activeFolder?.name}</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                         <Calendar size={12} /> Registry Active: {activeFolder?.timestamp}
                       </p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    {canManage && (
                       <button onClick={() => { setEditingFile(null); setShowFileModal(true); }} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all">
                          <Upload size={16} strokeWidth={3} /> Upload PDF
                       </button>
                    )}
                    <button className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-slate-600 shadow-sm transition-colors"><Download size={20} /></button>
              </div>
              </div>

              <div className="p-10 space-y-4">
                 {activeFolder?.files.length === 0 ? (
                   <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[3rem] bg-slate-50/20">
                      <FileText size={56} className="mx-auto text-slate-100 mb-6" />
                      <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">Directory Empty</p>
                      {canManage && <p className="text-slate-300 text-xs font-bold mt-2 uppercase tracking-widest">Publish instructional PDF materials to this registry.</p>}
                   </div>
                 ) : (
                   activeFolder?.files.map(file => (
                     <div 
                      key={file.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-7 bg-slate-50 rounded-[2.5rem] hover:bg-white hover:shadow-2xl hover:shadow-indigo-100/40 transition-all border border-transparent hover:border-slate-100 relative group"
                     >
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-sm bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:rotate-6">
                              <FileText size={28} strokeWidth={2.5} />
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="text-xl font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight truncate pr-10">{file.title}</h4>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-2">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} className="text-indigo-400" /> {file.timestamp}</p>
                                 <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest truncate max-w-[300px] flex items-center gap-1.5">
                                   <FileIcon size={12} /> {file.metadata}
                                 </p>
                              </div>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-6 sm:mt-0">
                           <div className="flex gap-2">
                              <button 
                                onClick={() => { setViewingFile(file); setShowViewer(true); }}
                                className="p-3.5 bg-white text-indigo-600 rounded-xl shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all hover:scale-110 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                title="App Preview"
                              >
                                 <Eye size={18} /> <span className="hidden lg:inline">Quick View</span>
                              </button>
                              <button 
                                onClick={() => openInBrowser(file)}
                                className="p-3.5 bg-white text-emerald-600 rounded-xl shadow-sm border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all hover:scale-110 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                title="External Browser View"
                              >
                                 <ExternalLink size={18} /> <span className="hidden lg:inline">Browser Tab</span>
                              </button>
                           </div>

                           <div className="h-10 w-px bg-slate-200 mx-2 hidden lg:block"></div>

                           {canManage && (
                             <div className="flex gap-2">
                               <button 
                                onClick={() => { setEditingFile(file); setFileData({ title: file.title, type: file.type }); setShowFileModal(true); }}
                                className="p-3.5 bg-white text-amber-600 rounded-xl shadow-sm border border-amber-100 hover:bg-amber-600 hover:text-white transition-all hover:scale-110"
                                title="Edit Title"
                               >
                                  <Edit2 size={18} />
                               </button>
                               <button 
                                onClick={() => { setFileToDeleteId(file.id); }}
                                className="p-3.5 bg-white text-rose-500 rounded-xl shadow-sm border border-rose-100 hover:bg-rose-500 hover:text-white transition-all hover:scale-110"
                                title="Delete Document"
                               >
                                  <Trash2 size={18} />
                                </button>
                             </div>
                           )}
                           <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl hidden lg:flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><ChevronRight size={24} strokeWidth={3} /></div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Curriculum;
