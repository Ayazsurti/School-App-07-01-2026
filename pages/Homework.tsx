
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Homework as HomeworkType, NoticeMedia } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  PencilRuler, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  FileText, 
  Upload, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  Eye, 
  Save, 
  BookOpen,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  FileIcon,
  Loader2,
  RefreshCw,
  Download,
  Smartphone,
  AlertTriangle,
  ShieldCheck,
  Database
} from 'lucide-react';
import { MOCK_SUBJECTS } from '../constants';
import { db, supabase } from '../supabase';

interface HomeworkProps { user: User; }
const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const Homework: React.FC<HomeworkProps> = ({ user }) => {
  const [homeworks, setHomeworks] = useState<HomeworkType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewingFile, setViewingFile] = useState<HomeworkType | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [editingHomework, setEditingHomework] = useState<HomeworkType | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('All');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');

  const [formData, setFormData] = useState<Partial<HomeworkType>>({
    title: '', description: '', subject: MOCK_SUBJECTS[0], className: '10th', section: 'A',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  const [tempAttachment, setTempAttachment] = useState<NoticeMedia | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const formatTimestamp = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true 
    }).toUpperCase();
  };

  const fetchCloudData = async () => {
    try {
      const data = await db.homework.getAll();
      setHomeworks(data.map((h: any) => ({
        id: h.id, title: h.title, description: h.description, subject: h.subject,
        className: h.class_name, section: h.section, dueDate: h.due_date,
        createdAt: formatTimestamp(h.created_at), createdBy: h.created_by,
        attachment: h.attachment
      })));
    } catch (err) { console.error("Cloud Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-homework')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const openHomeworkViewer = (hw: HomeworkType) => {
    if (hw.attachment?.url.startsWith('data:application/pdf')) {
      const base64Data = hw.attachment.url.split(',')[1];
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
      setBlobUrl(hw.attachment?.url || null);
    }
    setViewingFile(hw);
    setShowViewer(true);
  };

  const closeViewer = () => {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
    setBlobUrl(null);
    setViewingFile(null);
    setShowViewer(false);
  };

  const handleNativeOpen = () => {
    if (blobUrl) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTempAttachment({ url: ev.target?.result as string, type: 'pdf', name: file.name });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role === 'STUDENT') return;
    if (!formData.title || !formData.subject) return;
    setIsUploading(true);
    try {
      await db.homework.upsert({
        ...formData,
        id: editingHomework?.id || '',
        createdBy: editingHomework?.createdBy || user.name,
        attachment: tempAttachment || editingHomework?.attachment
      });
      createAuditLog(user, 'CREATE', 'Homework', `Cloud Synced: ${formData.title}`);
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Failed to save to cloud."); }
    finally { setIsUploading(false); }
  };

  const confirmDelete = async () => {
    if (user.role === 'STUDENT') return;
    if (!deleteConfirmationId) return;
    try {
      await db.homework.delete(deleteConfirmationId);
      setDeleteConfirmationId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Delete failed."); }
  };

  const filteredHomeworks = useMemo(() => {
    return homeworks.filter(hw => {
      const matchesSearch = (hw.title + ' ' + hw.description).toLowerCase().includes(searchQuery.toLowerCase());
      if (user.role === 'STUDENT') {
        return matchesSearch && hw.className === user.class && hw.section === user.section;
      }
      const matchesClass = selectedClassFilter === 'All' || hw.className === selectedClassFilter;
      const matchesSubject = selectedSubjectFilter === 'All' || hw.subject === selectedSubjectFilter;
      return matchesSearch && matchesClass && matchesSubject;
    });
  }, [homeworks, searchQuery, selectedClassFilter, selectedSubjectFilter, user]);

  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {/* HARDWARE INTERFACE HUD */}
      <div className="flex flex-wrap gap-4 no-print px-4 sm:px-0 mb-2">
         <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 px-4 py-2 rounded-full shadow-sm">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Gateway Verified</span>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
         </div>
         <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 px-4 py-2 rounded-full shadow-sm">
            <Database size={14} className="text-indigo-500" />
            <span className="text-[8px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Cloud Repository Connected</span>
         </div>
      </div>

      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-indigo-400">
              <RefreshCw size={12} className="animate-spin" />
              <span className="text-[9px] font-black uppercase tracking-widest">Refreshing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-4 sm:right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={20} strokeWidth={3} />
              <p className="font-black text-[10px] uppercase tracking-widest">Updated</p>
           </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase flex items-center gap-2 sm:gap-3">Homework <PencilRuler className="text-indigo-600" size={24} /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-lg">Assignment distribution system with precise timestamps.</p>
        </div>
        {canManage && (
          <button onClick={() => { setEditingHomework(null); setTempAttachment(null); setShowModal(true); }} className="w-full sm:w-auto px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><Plus size={18} /> Post Task</button>
        )}
      </div>

      <div className="px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search assignments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
           <Loader2 className="animate-spin text-indigo-600" size={48} />
           <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.3em]">Accessing Cloud...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 px-4 sm:px-0">
          {filteredHomeworks.map((hw) => (
            <div key={hw.id} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all group relative hover:-translate-y-2 flex flex-col">
               <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner"><BookOpen size={24} /></div>
                  <span className="px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black tracking-widest uppercase bg-amber-50 text-amber-600 border border-amber-100">Due: {hw.dueDate}</span>
               </div>
               <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight mb-1 uppercase truncate">{hw.title}</h3>
               <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Std {hw.className}-{hw.section} • {hw.subject}</p>
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-4"><Clock size={10}/> Posted: {hw.createdAt}</p>
               <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm line-clamp-3 mb-6 flex-1 leading-relaxed">{hw.description}</p>
               <div className="flex gap-2 mt-auto pt-4 border-t border-slate-50 dark:border-slate-800 items-center">
                  {hw.attachment && (
                    <button onClick={() => openHomeworkViewer(hw)} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 transition-all border border-indigo-500/50">
                      <Eye size={14} /> <span>View Document</span>
                    </button>
                  )}
                  {canManage && (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingHomework(hw); setFormData(hw); setShowModal(true); }} className="p-3 bg-white dark:bg-slate-800 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white transition-all"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteConfirmationId(hw.id)} className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-900 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                    </div>
                  )}
               </div>
            </div>
          ))}
          {filteredHomeworks.length === 0 && (
            <div className="col-span-full py-40 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
              <PencilRuler className="text-slate-200 mb-4" size={48} />
              <p className="text-xs font-black text-slate-400 uppercase">No assignments found in the vault.</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-1 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Assignment Lab</h3>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-4 sm:space-y-6">
                 <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Assignment Title" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none">
                       {MOCK_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none" />
                 </div>
                 <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detailed Instructions" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-inner" />
                 <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-6 sm:py-8 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 font-black rounded-2xl border-4 border-dashed border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-2 hover:bg-indigo-100 transition-all font-black uppercase text-[9px] sm:text-[10px]">
                    {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                    {tempAttachment ? 'PDF Attached' : 'Attach Guidance PDF'}
                 </button>
                 <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
                 <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest">Finalize & Sync</button>
              </form>
           </div>
        </div>
      )}

      {/* DELETE DIALOG - UPDATED TO COMPACT SIZE */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Purge Homework?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] leading-relaxed uppercase tracking-widest">This task will be erased from all dashboards permanently.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteConfirmationId(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Keep</button>
                 <button onClick={confirmDelete} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Delete</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Homework;
