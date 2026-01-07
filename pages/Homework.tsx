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
  FileIcon
} from 'lucide-react';
import { MOCK_SUBJECTS } from '../constants';

interface HomeworkProps {
  user: User;
}

const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const Homework: React.FC<HomeworkProps> = ({ user }) => {
  const [homeworks, setHomeworks] = useState<HomeworkType[]>(() => {
    const saved = localStorage.getItem('school_homework_vault_v1');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [showModal, setShowModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewingFile, setViewingFile] = useState<HomeworkType | null>(null);
  const [editingHomework, setEditingHomework] = useState<HomeworkType | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('All');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('All');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');

  const [formData, setFormData] = useState<Partial<HomeworkType>>({
    title: '',
    description: '',
    subject: MOCK_SUBJECTS[0],
    className: '10th',
    section: 'A',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  const [tempAttachment, setTempAttachment] = useState<NoticeMedia | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    localStorage.setItem('school_homework_vault_v1', JSON.stringify(homeworks));
  }, [homeworks]);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const formatTimestamp = () => {
    return new Date().toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    }).replace(',', ' at');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTempAttachment({
        url: ev.target?.result as string,
        type: 'pdf',
        name: file.name
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.subject) return;

    const homeworkToSave: HomeworkType = {
      id: editingHomework?.id || Math.random().toString(36).substr(2, 9),
      title: formData.title!,
      description: formData.description || '',
      subject: formData.subject!,
      className: formData.className!,
      section: formData.section!,
      dueDate: formData.dueDate!,
      createdAt: editingHomework?.createdAt || formatTimestamp(),
      createdBy: editingHomework?.createdBy || user.name,
      attachment: tempAttachment || editingHomework?.attachment
    };

    if (editingHomework) {
      setHomeworks(prev => prev.map(h => h.id === editingHomework.id ? homeworkToSave : h));
      createAuditLog(user, 'UPDATE', 'Homework', `Modified assignment: "${homeworkToSave.title}" for ${homeworkToSave.className}-${homeworkToSave.section}`);
      triggerSuccess('Assignment synchronized');
    } else {
      setHomeworks(prev => [homeworkToSave, ...prev]);
      createAuditLog(user, 'CREATE', 'Homework', `Published assignment: "${homeworkToSave.title}" for ${homeworkToSave.className}-${homeworkToSave.section}`);
      triggerSuccess('Assignment published');
    }

    setShowModal(false);
    setEditingHomework(null);
    setTempAttachment(null);
    setFormData({ title: '', description: '', subject: MOCK_SUBJECTS[0], className: '10th', section: 'A', dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0] });
  };

  const confirmDelete = () => {
    if (!deleteConfirmationId) return;
    const target = homeworks.find(h => h.id === deleteConfirmationId);
    setHomeworks(prev => prev.filter(h => h.id !== deleteConfirmationId));
    setDeleteConfirmationId(null);
    createAuditLog(user, 'DELETE', 'Homework', `Purged assignment: "${target?.title}"`);
    triggerSuccess('Assignment purged from registry');
  };

  const openInBrowser = (hw: HomeworkType) => {
    if (hw.attachment?.url) {
      const win = window.open();
      if (win) {
        win.document.title = hw.title;
        win.document.write(`<iframe src="${hw.attachment.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        win.document.close();
      }
    }
  };

  const filteredHomeworks = useMemo(() => {
    return homeworks.filter(hw => {
      const matchesSearch = (hw.title + ' ' + hw.description).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = selectedClassFilter === 'All' || hw.className === selectedClassFilter;
      const matchesSection = selectedSectionFilter === 'All' || hw.section === selectedSectionFilter;
      const matchesSubject = selectedSubjectFilter === 'All' || hw.subject === selectedSubjectFilter;
      
      if (user.role === 'STUDENT') {
        return matchesSearch && hw.className === '10th' && hw.section === 'A';
      }
      
      return matchesSearch && matchesClass && matchesSection && matchesSubject;
    });
  }, [homeworks, searchQuery, selectedClassFilter, selectedSectionFilter, selectedSubjectFilter, user]);

  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
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

      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-sm w-full shadow-2xl animate-in zoom-in-95 text-center border border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2rem] flex items-center justify-center mb-6 mx-auto border border-rose-100 dark:border-rose-900/50 shadow-inner">
                 <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Confirm Erasure?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                 This assignment and any attached instructional PDF will be permanently removed for all students.
              </p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteConfirmationId(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors uppercase text-[10px] tracking-widest">Cancel</button>
                 <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Confirm Delete</button>
              </div>
           </div>
        </div>
      )}

      {showViewer && viewingFile && viewingFile.attachment && (
        <div className="fixed inset-0 z-[600] bg-slate-950/98 backdrop-blur-2xl flex flex-col p-4 lg:p-10 animate-in zoom-in-95 duration-300">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 text-white px-2">
              <div className="flex items-center gap-5">
                 <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <FileText size={28} />
                 </div>
                 <div>
                    <h3 className="text-2xl lg:text-3xl font-black tracking-tight uppercase leading-none">{viewingFile.attachment.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                       <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                         <Clock size={12} className="text-indigo-400" /> Issued: {viewingFile.createdAt}
                       </p>
                       <div className="hidden sm:block w-1 h-1 bg-white/20 rounded-full"></div>
                       <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest truncate">Assignment Context: {viewingFile.title}</p>
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
              {viewingFile.attachment.url ? (
                <iframe src={viewingFile.attachment.url} className="w-full h-full border-none" title={viewingFile.attachment.name} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                   <AlertCircle size={64} />
                   <p className="font-bold text-xl uppercase tracking-widest">Document Corrupted</p>
                </div>
              )}
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-8">
                 <div>
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{editingHomework ? 'Update Assignment' : 'Post New Homework'}</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Task Distribution</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-all shadow-sm"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleSave} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Homework Title</label>
                       <input 
                        type="text" 
                        required
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g., Quadratic Equations Worksheet"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Subject</label>
                       <select 
                        value={formData.subject}
                        onChange={e => setFormData({...formData, subject: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                       >
                         {MOCK_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Submission Deadline</label>
                       <input 
                        type="date" 
                        required
                        value={formData.dueDate}
                        onChange={e => setFormData({...formData, dueDate: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Class</label>
                       <select 
                        value={formData.className}
                        onChange={e => setFormData({...formData, className: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                       >
                         {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Section</label>
                       <select 
                        value={formData.section}
                        onChange={e => setFormData({...formData, section: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                       >
                         <option value="A">Section A</option>
                         <option value="B">Section B</option>
                         <option value="C">Section C</option>
                       </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Instructions / Description</label>
                    <textarea 
                      rows={4}
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Enter assignment details or instructions for students..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-medium text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner"
                    />
                 </div>

                 <div className="flex flex-col gap-2">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Instructional PDF Attachment</label>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 font-black rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all group"
                    >
                      {isUploading ? (
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Upload size={28} className="group-hover:-translate-y-1 transition-transform" />
                      )}
                      <span className="text-[10px] uppercase tracking-widest">{tempAttachment || editingHomework?.attachment ? 'Swap PDF Document' : 'Select Homework PDF'}</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
                 </div>

                 {(tempAttachment || editingHomework?.attachment) && (
                   <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shadow-sm">
                        <FileIcon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none mb-1">Authenticated Document</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{tempAttachment?.name || editingHomework?.attachment?.name}</p>
                      </div>
                      <button type="button" onClick={() => setTempAttachment(null)} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg transition-colors"><X size={16} /></button>
                   </div>
                 )}

                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-200 transition-colors uppercase text-[10px] tracking-widest">Discard</button>
                    <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest">
                      {editingHomework ? 'Finalize Changes' : 'Publish Assignment'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Homework Registry</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Centralized distribution of academic tasks and assignments.</p>
        </div>
        {canManage && (
          <button 
            onClick={() => { setEditingHomework(null); setTempAttachment(null); setShowModal(true); }}
            className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"
          >
            <Plus size={20} strokeWidth={3} /> Post Assignment
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row items-center gap-6">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search assignments by title or instructions..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-16 pr-8 py-4.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" 
          />
        </div>
        
        {user.role !== 'STUDENT' && (
          <div className="flex flex-wrap gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-700">
               <span className="pl-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Class:</span>
               <select 
                value={selectedClassFilter} 
                onChange={e => setSelectedClassFilter(e.target.value)}
                className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs font-black text-slate-700 dark:text-white outline-none"
               >
                  <option value="All">All Grades</option>
                  {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-700">
               <span className="pl-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Subject:</span>
               <select 
                value={selectedSubjectFilter} 
                onChange={e => setSelectedSubjectFilter(e.target.value)}
                className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs font-black text-slate-700 dark:text-white outline-none"
               >
                  <option value="All">All Subjects</option>
                  {MOCK_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredHomeworks.length > 0 ? (
          filteredHomeworks.map((hw) => (
            <div 
              key={hw.id} 
              className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-indigo-100/30 dark:hover:shadow-indigo-900/30 transition-all group relative hover:-translate-y-2 overflow-hidden flex flex-col"
            >
               <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/10 rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-all duration-700 blur-2xl"></div>
               
               <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-inner">
                    <BookOpen size={28} />
                  </div>
                  <div className="text-right">
                     <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800`}>
                       Due: {hw.dueDate}
                     </span>
                  </div>
               </div>

               <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight relative z-10">{hw.title}</h3>
               <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                 {hw.subject} • Std {hw.className}-{hw.section}
               </p>
               
               <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 mb-6 font-medium leading-relaxed flex-1">
                 {hw.description || 'No specific instructions provided. Check the attached document for details.'}
               </p>

               <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-5 mt-auto">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Assigned By</span>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate uppercase">
                        {hw.createdBy}
                      </span>
                    </div>
                    <div className="text-right flex flex-col items-end flex-shrink-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Date</span>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        {hw.createdAt.split(' at')[0]}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                     {hw.attachment ? (
                        <>
                           <button 
                            onClick={() => { setViewingFile(hw); setShowViewer(true); }}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20"
                           >
                              <Eye size={14} /> Quick Preview
                           </button>
                           <button 
                            onClick={() => openInBrowser(hw)}
                            className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 dark:border-emerald-800"
                            title="Open in Browser Tab"
                           >
                              <ExternalLink size={16} />
                           </button>
                        </>
                     ) : (
                        <div className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 cursor-not-allowed">
                           <FileText size={14} /> No Document
                        </div>
                     )}

                     {canManage && (
                        <div className="flex gap-2">
                           <button 
                            onClick={() => { setEditingHomework(hw); setFormData(hw); setShowModal(true); }}
                            className="p-3 bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                           >
                              <Edit2 size={16} />
                           </button>
                           <button 
                            onClick={() => setDeleteConfirmationId(hw.id)}
                            className="p-3 bg-white dark:bg-slate-700 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                           >
                              <Trash2 size={16} />
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 bg-white dark:bg-slate-900 rounded-[4rem] text-center border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 text-slate-100 dark:text-slate-700 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-100 dark:border-slate-800">
              <PencilRuler size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">No Assignments Found</h3>
            <p className="text-slate-400 dark:text-slate-600 font-medium max-w-xs mx-auto mt-2">Clear logs matching your current filters or search query.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Homework;