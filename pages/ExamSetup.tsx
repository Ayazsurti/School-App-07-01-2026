
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Exam, ExamSubject } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Trash2, Edit2, X, BookOpen, Save, CheckCircle2, GraduationCap, Loader2, RefreshCw
} from 'lucide-react';
import { MOCK_SUBJECTS } from '../constants';
import { db, supabase } from '../supabase';

interface ExamSetupProps { user: User; }
const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const ExamSetup: React.FC<ExamSetupProps> = ({ user }) => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Exam>>({
    name: '', academicYear: '2025-2026', className: '1st', status: 'DRAFT', subjects: []
  });

  const fetchCloudData = async () => {
    try {
      const data = await db.exams.getAll();
      setExams(data.map((e: any) => ({
        id: e.id, name: e.name, academicYear: e.academic_year, className: e.class_name,
        subjects: e.subjects, status: e.status
      })));
    } catch (err) { console.error("Exam Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-exams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setIsLoading(true);
    try {
      await db.exams.upsert({ ...formData, id: editingExam?.id || '' });
      createAuditLog(user, editingExam ? 'UPDATE' : 'CREATE', 'Exams', `Cloud Sync Exam: ${formData.name}`);
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Failed to save exam setup."); }
    finally { setIsLoading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await db.exams.delete(deleteId);
      setDeleteId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Delete failed."); }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Refreshing Templates...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Sync Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Global Registry Updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Exam Setup Hub</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Define real-time assessment structures for the entire school.</p>
        </div>
        <button onClick={() => { setEditingExam(null); setShowModal(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><Plus size={20} /> Create Cloud Exam</button>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
           <Loader2 className="animate-spin text-indigo-600" size={64} />
           <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.3em]">Accessing Assessment Cloud...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group flex flex-col">
              <div className="p-8">
                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border mb-4 inline-block ${exam.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{exam.status}</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase truncate">{exam.name}</h3>
                <p className="text-indigo-600 font-bold text-sm mt-1">Std {exam.className} • {exam.academicYear}</p>
                <div className="mt-8 flex gap-2">
                   <button onClick={() => { setEditingExam(exam); setFormData(exam); setShowModal(true); }} className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 font-black text-[10px] uppercase rounded-xl hover:bg-indigo-600 hover:text-white transition-all">Modify</button>
                   <button onClick={() => setDeleteId(exam.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cloud Exam Designer</h3>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-6">
                 <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Exam Name (e.g. SA-1)" className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold" />
                 <div className="grid grid-cols-2 gap-6">
                    <select value={formData.className} onChange={e => setFormData({...formData, className: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold">
                       {ALL_CLASSES.map(c => <option key={c} value={c}>{c} Std</option>)}
                    </select>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold">
                       <option value="DRAFT">DRAFT</option>
                       <option value="ACTIVE">ACTIVE</option>
                       <option value="COMPLETED">COMPLETED</option>
                    </select>
                 </div>
                 <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs">Finalize Cloud Sync</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ExamSetup;
