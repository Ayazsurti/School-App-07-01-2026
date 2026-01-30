
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Homework as HomeworkType, NoticeMedia } from '../types';
import { 
  PencilRuler, Plus, Search, Trash2, Edit2, X, FileText, Upload, Calendar, Clock, CheckCircle2, 
  Eye, Save, BookOpen, Loader2, RefreshCw, AlertTriangle, ShieldCheck, Database, CheckSquare, 
  Square, Layers, Lock, Shield
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
  const isStudent = user.role === 'STUDENT';
  const isTeacher = user.role === 'TEACHER';
  
  const authorizedClasses = useMemo(() => {
    if (user.role === 'ADMIN') return ALL_CLASSES;
    const teacherClasses = (user as any).classes || (user.class ? [user.class] : []);
    return ALL_CLASSES.filter(c => teacherClasses.includes(c));
  }, [user]);

  const [homeworks, setHomeworks] = useState<HomeworkType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewingFile, setViewingFile] = useState<HomeworkType | null>(null);
  const [editingHomework, setEditingHomework] = useState<HomeworkType | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState(isStudent ? user.class || 'All' : 'All');

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
    const channel = supabase.channel('realtime-hw-sync-v13')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStudent || targetClasses.length === 0) return;
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
      setShowModal(false);
      fetchCloudData();
    } catch (err) { alert("Sync failed."); }
    finally { setIsUploading(false); }
  };

  const filteredHomeworks = useMemo(() => {
    return homeworks.filter(hw => {
      const matchesSearch = (hw.title + ' ' + hw.description).toLowerCase().includes(searchQuery.toLowerCase());
      if (isStudent) {
        const targets = hw.className.split(', ');
        const sections = hw.section.split(', ');
        return matchesSearch && targets.includes(user.class || '') && sections.includes(user.section || '');
      }
      const matchesClass = selectedClassFilter === 'All' || hw.className.includes(selectedClassFilter);
      return matchesSearch && matchesClass;
    });
  }, [homeworks, searchQuery, selectedClassFilter, isStudent, user]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase flex items-center gap-3">
             Academic Missions <PencilRuler className="text-indigo-600" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.4em]">
             {isStudent ? 'Daily Institutional Task Archive' : 'Multi-Target Task Distribution Console'}
          </p>
        </div>
        {!isStudent && (
          <button onClick={() => { setEditingHomework(null); setTargetClasses([]); setTargetSections(['A']); setShowModal(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center gap-2">
            <Plus size={20} strokeWidth={3} /> Post Task
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 mx-4 sm:mx-0">
          <Search className="text-slate-300 ml-2" size={20} />
          <input type="text" placeholder="Search daily tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none font-bold outline-none dark:text-white uppercase text-xs tracking-widest" />
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={48} className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-0">
          {filteredHomeworks.map((hw) => (
            <div key={hw.id} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all group flex flex-col relative hover:-translate-y-1">
               <div className="flex items-center justify-between mb-8">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all"><BookOpen size={24} /></div>
                  <span className="px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-rose-50 text-rose-600 border border-rose-100">Due: {hw.dueDate}</span>
               </div>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase truncate">{hw.title}</h3>
               <div className="flex flex-col gap-1 mb-6">
                  {!isStudent && <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 truncate"><Layers size={12}/> Target: {hw.className}</p>}
                  <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><CheckCircle2 size={12}/> {hw.subject}</p>
               </div>
               <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 mb-8 flex-1 italic leading-relaxed">"{hw.description}"</p>
               <div className="flex gap-2 mt-auto pt-6 border-t border-slate-50 dark:border-slate-800">
                  <button onClick={() => setViewingFile(hw)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg border border-indigo-500/50">
                    <Eye size={16} /> Open Document
                  </button>
                  {!isStudent && (
                    <button onClick={() => setDeleteConfirmationId(hw.id)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                  )}
               </div>
            </div>
          ))}
          {filteredHomeworks.length === 0 && (
            <div className="col-span-full py-40 text-center opacity-30">
               <PencilRuler size={80} className="mx-auto mb-6 text-slate-200" />
               <h3 className="text-2xl font-black uppercase tracking-tight">Assignment Pool Empty</h3>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4">No tasks currently assigned to your academic node</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODAL (View-Only for Students) */}
      {viewingFile && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20"><FileText size={24}/></div>
                    <div>
                       <h3 className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white truncate max-w-[200px] md:max-w-md leading-none">{viewingFile.title}</h3>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">DEADLINE NODE: {viewingFile.dueDate}</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingFile(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={28} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 bg-white dark:bg-slate-900">
                 <div className="mb-10 p-10 bg-slate-50 dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-inner text-center">
                    <p className="text-slate-700 dark:text-slate-300 text-xl leading-relaxed italic font-medium">"{viewingFile.description}"</p>
                 </div>
                 {viewingFile.attachment ? (
                   <div className="h-[600px] border-8 border-slate-50 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                      <iframe src={viewingFile.attachment.url} className="w-full h-full border-none" title="Homework Viewer" />
                   </div>
                 ) : (
                   <div className="py-24 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] opacity-30 flex flex-col items-center">
                      <FileText size={64} className="mb-4 text-slate-200" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">No digital asset attached</p>
                   </div>
                 )}
              </div>
              <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-center">
                 <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <Lock size={14} className="text-slate-300" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authenticated Institutional View Only</span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Homework;
