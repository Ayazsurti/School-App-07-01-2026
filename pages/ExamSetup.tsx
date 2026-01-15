
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Exam, ExamSubject, ExamSchedule } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Trash2, Edit2, X, BookOpen, Save, CheckCircle2, GraduationCap, Loader2, RefreshCw,
  Calendar, Clock, LayoutGrid, MapPin, UserCheck, ShieldCheck, Info, ChevronRight, Globe
} from 'lucide-react';
import { MOCK_SUBJECTS } from '../constants';
import { db, supabase } from '../supabase';

interface ExamSetupProps { user: User; }
const ALL_CLASSES = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const ExamSetup: React.FC<ExamSetupProps> = ({ user }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'SUBJECTS' | 'DATESHEET'>('DETAILS');
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Exam>>({
    name: '', academicYear: '2025-2026', className: '1st', examType: 'WRITTEN', mode: 'OFFLINE', status: 'DRAFT', subjects: [],
    startDate: '', endDate: ''
  });

  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);

  const fetchCloudData = async () => {
    try {
      const data = await db.exams.getAll();
      setExams(data.map((e: any) => ({
        id: e.id, name: e.name, academicYear: e.academic_year, className: e.class_name,
        subjects: e.subjects || [], status: e.status, examType: e.exam_type, mode: e.mode,
        startDate: e.start_date, endDate: e.end_date
      })));
    } catch (err) { console.error("Exam Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-exams-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleOpenEdit = async (exam: Exam) => {
    setEditingExam(exam);
    setFormData(exam);
    setActiveTab('DETAILS');
    const schedData = await db.exams.getSchedules(exam.id);
    setSchedules(schedData);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setIsSyncing(true);
    try {
      const savedExam = await db.exams.upsert({ ...formData, id: editingExam?.id || '' });
      if (editingExam) {
        // Only if schedules were modified
        const schedWithId = schedules.map(s => ({ ...s, exam_id: editingExam.id }));
        await db.exams.upsertSchedules(schedWithId);
      }
      createAuditLog(user, editingExam ? 'UPDATE' : 'CREATE', 'Exams', `Synced: ${formData.name}`);
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Failed to save exam setup."); }
    finally { setIsSyncing(false); }
  };

  const addSubjectToExam = (subName: string) => {
    const current = formData.subjects || [];
    if (current.find(s => s.subjectName === subName)) return;
    setFormData({
      ...formData,
      subjects: [...current, { subjectName: subName, maxTheory: 80, maxPractical: 20 }]
    });
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Exam Registry Syncing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Global Sync Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Exam registry updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Exam Control Hub</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Manage assessment definitions, schedules, and result visibility.</p>
        </div>
        <button onClick={() => { setEditingExam(null); setFormData({ name: '', subjects: [], status: 'DRAFT' }); setSchedules([]); setShowModal(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:-translate-y-1 transition-all uppercase text-xs tracking-widest flex items-center gap-3"><Plus size={20} /> New Exam</button>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
           <Loader2 className="animate-spin text-indigo-600" size={64} />
           <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.3em]">Accessing Assessment Cloud...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity -mr-16 -mt-16 rounded-full ${exam.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                   <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${exam.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : exam.status === 'COMPLETED' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{exam.status}</span>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exam.examType}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase truncate tracking-tight">{exam.name}</h3>
                <div className="mt-2 space-y-1">
                   <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest">Class {exam.className} • {exam.academicYear}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5"><Calendar size={10}/> {exam.startDate} to {exam.endDate}</p>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 grid grid-cols-2 gap-3">
                   <button onClick={() => handleOpenEdit(exam)} className="py-4 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"><Edit2 size={12}/> Manage</button>
                   <button onClick={() => setDeleteId(exam.id)} className="p-4 text-rose-500 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-500 hover:text-white rounded-2xl transition-all flex items-center justify-center"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
          
          {exams.length === 0 && (
            <div className="col-span-full py-40 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
               <Globe size={64} className="text-slate-100 dark:text-slate-800 mb-6" />
               <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tight">No Active Exam Sessions</h3>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-1 shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="flex items-center gap-8">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Exam Designer</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Official Cloud Configuration</p>
                    </div>
                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1">
                       {(['DETAILS', 'SUBJECTS', 'DATESHEET'] as any).map((t: string) => (
                         <button key={t} onClick={() => setActiveTab(t as any)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{t}</button>
                       ))}
                    </div>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={32} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-12 bg-white dark:bg-slate-900">
                 {activeTab === 'DETAILS' && (
                   <div className="space-y-12 animate-in slide-in-from-bottom-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exam Public Identity</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., SA-1 FINAL TERM" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-5 font-black text-xl uppercase outline-none shadow-inner" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Year</label>
                            <input type="text" value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-5 font-bold outline-none" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Class</label>
                            <select value={formData.className} onChange={e => setFormData({...formData, className: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl px-6 py-5 font-bold outline-none">
                               {ALL_CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                            </select>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registry Status</label>
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl px-6 py-5 font-bold outline-none">
                               <option value="DRAFT">DRAFT (HIDDEN)</option>
                               <option value="PUBLISHED">PUBLISHED (VISIBLE TO ALL)</option>
                               <option value="COMPLETED">COMPLETED (ARCHIVED)</option>
                            </select>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exam Methodology</label>
                            <div className="flex gap-3">
                               {(['WRITTEN', 'ORAL', 'PRACTICAL', 'MCQ'] as any).map((m: any) => (
                                 <button key={m} type="button" onClick={() => setFormData({...formData, examType: m})} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${formData.examType === m ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}>{m}</button>
                               ))}
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Execution Mode</label>
                            <div className="flex gap-3">
                               {(['ONLINE', 'OFFLINE'] as any).map((m: any) => (
                                 <button key={m} type="button" onClick={() => setFormData({...formData, mode: m})} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${formData.mode === m ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}>{m}</button>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                 )}

                 {activeTab === 'SUBJECTS' && (
                   <div className="animate-in slide-in-from-right-4 space-y-12">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                         <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-3"><LayoutGrid className="text-indigo-600" /> Available Course Catalog</h4>
                         <div className="flex flex-wrap gap-2">
                            {MOCK_SUBJECTS.map(s => (
                              <button key={s} type="button" onClick={() => addSubjectToExam(s)} className="px-6 py-3 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center gap-2 group shadow-sm"><Plus size={14} className="group-hover:rotate-90 transition-transform" /> {s}</button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-4">
                         <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest ml-1">Active Exam Blueprint</h4>
                         <div className="grid grid-cols-1 gap-4">
                            {formData.subjects?.map((sub, idx) => (
                              <div key={sub.subjectName} className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 group hover:shadow-xl transition-all">
                                 <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center font-black">{idx+1}</div>
                                    <div>
                                       <h5 className="font-black text-xl text-slate-800 dark:text-white uppercase">{sub.subjectName}</h5>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weightage: 100%</p>
                                    </div>
                                 </div>
                                 <div className="flex flex-wrap gap-8">
                                    <div className="space-y-2">
                                       <label className="text-[9px] font-black text-slate-400 uppercase">Theory Max</label>
                                       <input type="number" value={sub.maxTheory} onChange={e => {
                                         const next = [...(formData.subjects || [])];
                                         next[idx].maxTheory = parseInt(e.target.value) || 0;
                                         setFormData({...formData, subjects: next});
                                       }} className="w-24 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-black text-center" />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[9px] font-black text-slate-400 uppercase">Practical Max</label>
                                       <input type="number" value={sub.maxPractical} onChange={e => {
                                         const next = [...(formData.subjects || [])];
                                         next[idx].maxPractical = parseInt(e.target.value) || 0;
                                         setFormData({...formData, subjects: next});
                                       }} className="w-24 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-black text-center" />
                                    </div>
                                    <button type="button" onClick={() => setFormData({...formData, subjects: formData.subjects?.filter(s => s.subjectName !== sub.subjectName)})} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all self-end mb-1"><Trash2 size={18} /></button>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                 )}

                 {activeTab === 'DATESHEET' && (
                   <div className="animate-in slide-in-from-right-4 space-y-12">
                      <div className="p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-[3rem] border border-indigo-100 dark:border-indigo-800 flex items-start gap-4">
                         <Info size={24} className="text-indigo-600 mt-1" />
                         <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300 leading-relaxed uppercase tracking-tight">Assign date and time slots for each subject in the exam cycle. This will be visible on student terminals once published.</p>
                      </div>

                      <div className="overflow-x-auto rounded-[3rem] border border-slate-100 dark:border-slate-800">
                         <table className="w-full min-w-[1000px]">
                            <thead>
                               <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                                  <th className="px-8 py-6 text-left">Subject Identity</th>
                                  <th className="px-8 py-6 text-left">Schedule Date</th>
                                  <th className="px-8 py-6 text-left">Interval</th>
                                  <th className="px-8 py-6 text-left">Infrastructure</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                               {formData.subjects?.map((sub, idx) => {
                                 const sched = schedules.find(s => s.subject === sub.subjectName) || { subject: sub.subjectName, date: '', startTime: '09:00', endTime: '12:00', room: '', invigilator: '' };
                                 return (
                                   <tr key={sub.subjectName} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-8 py-6 font-black text-slate-900 dark:text-white uppercase text-sm">{sub.subjectName}</td>
                                      <td className="px-8 py-6">
                                         <input type="date" value={sched.date} onChange={e => {
                                           const next = [...schedules];
                                           const existing = next.findIndex(ns => ns.subject === sub.subjectName);
                                           if (existing > -1) next[existing].date = e.target.value;
                                           else next.push({ ...sched, date: e.target.value } as any);
                                           setSchedules(next);
                                         }} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-bold outline-none" />
                                      </td>
                                      <td className="px-8 py-6">
                                         <div className="flex items-center gap-2">
                                            <input type="time" value={sched.startTime} onChange={e => {
                                              const next = [...schedules];
                                              const existing = next.findIndex(ns => ns.subject === sub.subjectName);
                                              if (existing > -1) next[existing].startTime = e.target.value;
                                              else next.push({ ...sched, startTime: e.target.value } as any);
                                              setSchedules(next);
                                            }} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-2 py-2 font-bold text-xs" />
                                            <span className="text-slate-400 font-black">-</span>
                                            <input type="time" value={sched.endTime} onChange={e => {
                                              const next = [...schedules];
                                              const existing = next.findIndex(ns => ns.subject === sub.subjectName);
                                              if (existing > -1) next[existing].endTime = e.target.value;
                                              else next.push({ ...sched, endTime: e.target.value } as any);
                                              setSchedules(next);
                                            }} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-2 py-2 font-bold text-xs" />
                                         </div>
                                      </td>
                                      <td className="px-8 py-6">
                                         <input type="text" value={sched.room} onChange={e => {
                                           const next = [...schedules];
                                           const existing = next.findIndex(ns => ns.subject === sub.subjectName);
                                           if (existing > -1) next[existing].room = e.target.value;
                                           else next.push({ ...sched, room: e.target.value } as any);
                                           setSchedules(next);
                                         }} placeholder="Room No" className="w-24 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-bold outline-none uppercase placeholder:text-slate-400" />
                                      </td>
                                   </tr>
                                 );
                               })}
                            </tbody>
                         </table>
                      </div>
                   </div>
                 )}
              </div>

              <div className="p-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex gap-4">
                 <button onClick={() => setShowModal(false)} className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-400 font-black rounded-3xl uppercase text-[10px] tracking-widest border border-slate-200 dark:border-slate-700">Discard Prototype</button>
                 <button onClick={handleSave} disabled={isSyncing} className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                    Finalize Cloud Session
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* DELETE DIALOG */}
      {deleteId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 max-sm w-full shadow-2xl text-center border border-rose-100 dark:border-rose-900/50 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-inner border border-rose-100">
                 <Trash2 size={48} strokeWidth={2.5} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Purge Exam?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium text-xs leading-relaxed uppercase tracking-widest">All schedules and marks associated with this exam will be permanently erased.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeleteId(null)} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-3xl uppercase text-[10px] tracking-widest">Keep</button>
                 <button onClick={async () => { await db.exams.delete(deleteId); setDeleteId(null); fetchCloudData(); }} className="py-5 bg-rose-600 text-white font-black rounded-3xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Confirm Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ExamSetup;
