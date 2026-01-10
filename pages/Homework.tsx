
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
  RefreshCw
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

  const fetchCloudData = async () => {
    try {
      const data = await db.homework.getAll();
      setHomeworks(data.map((h: any) => ({
        id: h.id, title: h.title, description: h.description, subject: h.subject,
        className: h.class_name, section: h.section, dueDate: h.due_date,
        createdAt: new Date(h.created_at).toLocaleString(), createdBy: h.created_by,
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
    if (!formData.title || !formData.subject) return;
    setIsUploading(true);
    try {
      await db.homework.upsert({
        ...formData,
        id: editingHomework?.id || '',
        createdBy: editingHomework?.createdBy || user.name,
        attachment: tempAttachment || editingHomework?.attachment
      });
      createAuditLog(user, editingHomework ? 'UPDATE' : 'CREATE', 'Homework', `Cloud Synced: ${formData.title}`);
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Failed to save to cloud."); }
    finally { setIsUploading(false); }
  };

  const confirmDelete = async () => {
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
      const matchesClass = selectedClassFilter === 'All' || hw.className === selectedClassFilter;
      const matchesSubject = selectedSubjectFilter === 'All' || hw.subject === selectedSubjectFilter;
      if (user.role === 'STUDENT') return matchesSearch && hw.className === '10th';
      return matchesSearch && matchesClass && matchesSubject;
    });
  }, [homeworks, searchQuery, selectedClassFilter, selectedSubjectFilter, user]);

  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Refreshing Assignments...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Sync Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Cloud Database Updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase flex items-center gap-3">Homework Vault <PencilRuler className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Centralized distribution of tasks synced across all student devices.</p>
        </div>
        {canManage && (
          <button onClick={() => { setEditingHomework(null); setTempAttachment(null); setShowModal(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><Plus size={20} /> Post Cloud Task</button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row items-center gap-6">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Search assignments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-16 pr-8 py-4.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
           <Loader2 className="animate-spin text-indigo-600" size={64} />
           <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.3em]">Accessing Cloud Vault...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredHomeworks.map((hw) => (
            <div key={hw.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all group relative hover:-translate-y-2 flex flex-col">
               <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner"><BookOpen size={28} /></div>
                  <span className="px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-amber-50 text-amber-600 border border-amber-100">Due: {hw.dueDate}</span>
               </div>
               <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase truncate">{hw.title}</h3>
               <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Std {hw.className}-{hw.section} • {hw.subject}</p>
               <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 mb-6 flex-1 leading-relaxed">{hw.description}</p>
               <div className="flex gap-2 mt-auto pt-4 border-t border-slate-50 dark:border-slate-800">
                  {hw.attachment && <button onClick={() => { setViewingFile(hw); setShowViewer(true); }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"><Eye size={14} /> Preview</button>}
                  {canManage && (
                    <>
                      <button onClick={() => { setEditingHomework(hw); setFormData(hw); setShowModal(true); }} className="p-3 bg-white dark:bg-slate-800 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => setDeleteConfirmationId(hw.id)} className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-xl border border-rose-100 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                    </>
                  )}
               </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cloud Task Generator</h3>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-6">
                 <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Assignment Title" className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold" />
                 <div className="grid grid-cols-2 gap-6">
                    <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold">
                       {MOCK_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold" />
                 </div>
                 <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detailed Instructions" className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold resize-none" />
                 <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-8 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 rounded-2xl border-4 border-dashed border-indigo-200 flex flex-col items-center justify-center gap-2 hover:bg-indigo-100 transition-all font-black uppercase text-[10px]">
                    {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                    {tempAttachment ? 'PDF Attached' : 'Attach Guidance PDF'}
                 </button>
                 <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
                 <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs">Finalize Cloud Sync</button>
              </form>
           </div>
        </div>
      )}

      {showViewer && viewingFile && viewingFile.attachment && (
        <div className="fixed inset-0 z-[600] bg-slate-950/98 backdrop-blur-2xl flex flex-col p-10 animate-in zoom-in-95">
           <div className="flex justify-between items-center mb-8 text-white">
              <h3 className="text-3xl font-black uppercase tracking-tight">{viewingFile.attachment.name}</h3>
              <button onClick={() => setShowViewer(false)} className="p-4 bg-white/10 hover:bg-rose-600 rounded-2xl transition-all"><X size={32} /></button>
           </div>
           <div className="flex-1 bg-white rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white/10">
              <iframe src={viewingFile.attachment.url} className="w-full h-full border-none" />
           </div>
        </div>
      )}
    </div>
  );
};

export default Homework;
