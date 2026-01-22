
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Homework as HomeworkType, NoticeMedia } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  PencilRuler, Plus, Search, Trash2, Edit2, X, FileText, Upload, Calendar, Clock, CheckCircle2, 
  Eye, Save, BookOpen, Loader2, RefreshCw, AlertTriangle, ShieldCheck, Database, CheckSquare, 
  Square, Layers
} from 'lucide-react';
import { MOCK_SUBJECTS } from '../constants';
import { db, supabase } from '../supabase';

interface HomeworkProps { user: User; }
const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];
const SECTIONS = ['A', 'B', 'C', 'D'];

const Homework: React.FC<HomeworkProps> = ({ user }) => {
  const [homeworks, setHomeworks] = useState<HomeworkType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewingFile, setViewingFile] = useState<HomeworkType | null>(null);
  const [editingHomework, setEditingHomework] = useState<HomeworkType | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('All');

  // Multi-select targeting state
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [targetSections, setTargetSections] = useState<string[]>(['A']);

  const [formData, setFormData] = useState<Partial<HomeworkType>>({
    title: '', description: '', subject: MOCK_SUBJECTS[0],
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  const [tempAttachment, setTempAttachment] = useState<NoticeMedia | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCloudData = async () => {
    try {
      const data = await db.homework.getAll();
      setHomeworks(data.map((h: any) => ({
        id: h.id, title: h.title, description: h.description, subject: h.subject,
        className: h.class_name, section: h.section, dueDate: h.due_date,
        createdAt: new Date(h.created_at).toLocaleString().toUpperCase(), createdBy: h.created_by,
        attachment: h.attachment
      })));
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-hw-sync-v12')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleClass = (cls: string) => {
    setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
  };

  const toggleSection = (sec: string) => {
    setTargetSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role === 'STUDENT' || targetClasses.length === 0) {
      if(targetClasses.length === 0) alert("Select at least one class target.");
      return;
    }
    
    setIsUploading(true);
    try {
      const payload = {
        ...formData,
        className: targetClasses.join(', '),
        section: targetSections.join(', '),
        id: editingHomework?.id || '',
        createdBy: user.name,
        attachment: tempAttachment || editingHomework?.attachment
      };
      await db.homework.upsert(payload);
      createAuditLog(user, 'CREATE', 'Homework', `Multi-Target Sync: ${formData.title} to ${targetClasses.length} classes`);
      setShowModal(false);
      setFormData({ title: '', description: '', subject: MOCK_SUBJECTS[0] });
      setTargetClasses([]);
      fetchCloudData();
    } catch (err) { alert("Sync failed."); }
    finally { setIsUploading(false); }
  };

  const filteredHomeworks = useMemo(() => {
    return homeworks.filter(hw => {
      const matchesSearch = (hw.title + ' ' + hw.description).toLowerCase().includes(searchQuery.toLowerCase());
      if (user.role === 'STUDENT') {
        const targets = hw.className.split(', ');
        const sections = hw.section.split(', ');
        return matchesSearch && targets.includes(user.class || '') && sections.includes(user.section || '');
      }
      const matchesClass = selectedClassFilter === 'All' || hw.className.includes(selectedClassFilter);
      return matchesSearch && matchesClass;
    });
  }, [homeworks, searchQuery, selectedClassFilter, user]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">Homework <PencilRuler className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional multi-target distribution hub.</p>
        </div>
        {user.role !== 'STUDENT' && (
          <button onClick={() => { setEditingHomework(null); setTargetClasses([]); setTargetSections(['A']); setShowModal(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center gap-2">
            <Plus size={20} strokeWidth={3} /> Post Task
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center mx-4 sm:mx-0">
          <div className="relative group w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Search archives..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner dark:text-white uppercase text-xs" />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full pb-2 custom-scrollbar">
              <button onClick={() => setSelectedClassFilter('All')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedClassFilter === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>All Archive</button>
              {ALL_CLASSES.map(c => (
                <button key={c} onClick={() => setSelectedClassFilter(c)} className={`whitespace-nowrap px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${selectedClassFilter === c ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{c}</button>
              ))}
          </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={48} className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-0">
          {filteredHomeworks.map((hw) => (
            <div key={hw.id} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all group flex flex-col relative hover:-translate-y-1">
               <div className="flex items-center justify-between mb-8">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all"><BookOpen size={24} /></div>
                  <span className="px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-amber-50 text-amber-600 border border-amber-100">Due: {hw.dueDate}</span>
               </div>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase truncate">{hw.title}</h3>
               <div className="flex flex-col gap-1 mb-6">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 line-clamp-1"><Layers size={12}/> Target: {hw.className}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><CheckCircle2 size={12}/> Subject: {hw.subject}</p>
               </div>
               <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 mb-8 flex-1 italic leading-relaxed">"{hw.description}"</p>
               <div className="flex gap-2 mt-auto pt-6 border-t border-slate-50 dark:border-slate-800">
                  {hw.attachment && (
                    <button onClick={() => setViewingFile(hw)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg border border-indigo-500/50"><Eye size={16} /> Open Document</button>
                  )}
                  {user.role !== 'STUDENT' && (
                    <button onClick={() => setDeleteConfirmationId(hw.id)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                  )}
               </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Post Assignment</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-Target Distribution Module</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={28} /></button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 custom-scrollbar flex flex-col md:flex-row gap-10">
                 <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Task Title</label>
                       <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value.toUpperCase()})} placeholder="E.G. CHAPTER 4 EXERCISE" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                          <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase outline-none shadow-inner">
                             {MOCK_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deadline</label>
                          <input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black outline-none shadow-inner" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instructions</label>
                       <textarea rows={4} required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value.toUpperCase()})} placeholder="DETAILED STEPS FOR STUDENTS..." className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-[2rem] px-8 py-6 font-medium outline-none resize-none shadow-inner" />
                    </div>
                    <div className="pt-2">
                       <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full py-8 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all ${tempAttachment ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-300 hover:bg-slate-100'}`}>
                          <Upload size={32} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{tempAttachment ? tempAttachment.name : 'Attach PDF Document'}</span>
                       </button>
                       <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                             const reader = new FileReader();
                             reader.onload = (ev) => setTempAttachment({ url: ev.target?.result as string, type: 'pdf', name: file.name });
                             reader.readAsDataURL(file);
                          }
                       }} />
                    </div>
                 </div>

                 <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] p-8 space-y-8 border border-slate-100 dark:border-slate-800 shadow-inner">
                    <div className="space-y-4">
                       <div className="flex justify-between items-center px-1">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={14}/> Standards</h4>
                          <button type="button" onClick={() => setTargetClasses(targetClasses.length === ALL_CLASSES.length ? [] : [...ALL_CLASSES])} className="text-[9px] font-black text-slate-400 uppercase hover:text-indigo-600">Toggle All</button>
                       </div>
                       <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                          {ALL_CLASSES.map(cls => (
                             <button key={cls} type="button" onClick={() => toggleClass(cls)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-100'}`}>
                                {targetClasses.includes(cls) ? <CheckSquare size={14} /> : <Square size={14} />}
                                <span className="text-[9px] font-black uppercase truncate">{cls}</span>
                             </button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 px-1"><Layers size={14}/> Sections</h4>
                       <div className="grid grid-cols-2 gap-2">
                          {SECTIONS.map(sec => (
                             <button key={sec} type="button" onClick={() => toggleSection(sec)} className={`py-3 rounded-xl border font-black text-[10px] transition-all ${targetSections.includes(sec) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-100'}`}>
                                SEC {sec}
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </form>
              <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                 <button onClick={handleSave} disabled={isUploading || targetClasses.length === 0} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-sm tracking-[0.3em] flex items-center justify-center gap-4">
                    {isUploading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={24} />} Synchronize Task to Vault
                 </button>
              </div>
           </div>
        </div>
      )}

      {viewingFile && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FileText size={20}/></div>
                    <div>
                       <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white truncate max-w-[200px] md:max-w-md">{viewingFile.title}</h3>
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ASSIGNMENT DOCUMENT NODE</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingFile(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-hidden bg-white">
                 <iframe src={viewingFile.attachment?.url} className="w-full h-full border-none" title="Homework Viewer" />
              </div>
           </div>
        </div>
      )}

      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-xs w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Purge Homework?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] leading-relaxed uppercase tracking-widest">This task will be permanently erased from all student dashboards.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteConfirmationId(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={async () => { await db.homework.delete(deleteConfirmationId!); setDeleteConfirmationId(null); fetchCloudData(); }} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Homework;
