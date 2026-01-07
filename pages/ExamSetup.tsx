
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Exam, ExamSubject } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  ClipboardList, 
  BookOpen, 
  Save, 
  AlertCircle,
  GraduationCap,
  CheckCircle2,
  Settings2,
  CalendarDays,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { MOCK_SUBJECTS } from '../constants';

interface ExamSetupProps {
  user: User;
}

const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const ExamSetup: React.FC<ExamSetupProps> = ({ user }) => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem('school_exams_db');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'e1',
        name: 'First Terminal 2026',
        academicYear: '2025-2026',
        className: '10th',
        status: 'ACTIVE',
        subjects: [
          { subjectName: 'Mathematics', maxTheory: 70, maxPractical: 30 },
          { subjectName: 'Science', maxTheory: 70, maxPractical: 30 },
          { subjectName: 'English', maxTheory: 100, maxPractical: 0 }
        ]
      }
    ];
  });

  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Exam>>({
    name: '',
    academicYear: '2025-2026',
    className: '1st',
    status: 'DRAFT',
    subjects: []
  });

  useEffect(() => {
    localStorage.setItem('school_exams_db', JSON.stringify(exams));
  }, [exams]);

  const handleOpenAdd = () => {
    setEditingExam(null);
    setFormData({
      name: '',
      academicYear: '2025-2026',
      className: '1st',
      status: 'DRAFT',
      subjects: []
    });
    setShowModal(true);
  };

  const handleOpenEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormData(exam);
    setShowModal(true);
  };

  const addSubjectToExam = () => {
    const available = MOCK_SUBJECTS.filter(s => !formData.subjects?.some(es => es.subjectName === s));
    if (available.length > 0) {
      setFormData({
        ...formData,
        subjects: [
          ...(formData.subjects || []),
          { subjectName: available[0], maxTheory: 70, maxPractical: 30 }
        ]
      });
    }
  };

  const removeSubjectFromExam = (index: number) => {
    setFormData({
      ...formData,
      subjects: formData.subjects?.filter((_, i) => i !== index)
    });
  };

  const updateSubjectField = (index: number, field: keyof ExamSubject, value: any) => {
    const updated = [...(formData.subjects || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, subjects: updated });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || (formData.subjects?.length || 0) === 0) {
      alert("Please provide an exam name and at least one subject.");
      return;
    }

    if (editingExam) {
      setExams(prev => prev.map(ex => ex.id === editingExam.id ? { ...ex, ...formData } as Exam : ex));
    } else {
      const newExam: Exam = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
      } as Exam;
      setExams(prev => [newExam, ...prev]);
    }
    setShowModal(false);
    
    // Show success notification
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const confirmDelete = () => {
    if (deleteId) {
      setExams(prev => prev.filter(e => e.id !== deleteId));
      setDeleteId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const generateMarksheets = (exam: Exam) => {
    // Navigate to marksheets with the exam context
    navigate(`/${user.role.toLowerCase()}/marksheet?examId=${exam.id}&className=${exam.className}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-emerald-200/50 flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Success</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Database synchronized</p>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl text-center border border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                 <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Purge Exam Setup?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">This action will erase the exam template. Existing marksheet records are preserved but the configuration will be lost.</p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase text-[10px] tracking-widest">Cancel</button>
                 <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-100 dark:shadow-rose-900/20 hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Delete</button>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Exam Configuration</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Define examination structures and weightage for marks entry.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20 flex items-center gap-3 hover:-translate-y-1 transition-all"
        >
          <Plus size={20} strokeWidth={3} /> Create Exam Setup
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-1 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30 sticky top-0 z-20 backdrop-blur-md">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{editingExam ? 'Modify Exam Structure' : 'New Exam Setup'}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">Educational Assessment Template</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={24} /></button>
            </div>

            <form onSubmit={handleSave} className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Exam Title</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="e.g., Mid-Term Examination 2026"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Academic Year</label>
                  <input 
                    type="text" 
                    required
                    value={formData.academicYear}
                    onChange={e => setFormData({...formData, academicYear: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="2025-2026"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Class / Grade</label>
                  <select 
                    value={formData.className}
                    onChange={e => setFormData({...formData, className: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    {ALL_CLASSES.map(c => <option key={c} value={c}>{c} Std</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Setup Status</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="DRAFT">DRAFT (Locked)</option>
                    <option value="ACTIVE">ACTIVE (Accepting Marks)</option>
                    <option value="COMPLETED">COMPLETED (Archived)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-l-4 border-indigo-600 pl-4 py-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Examination Subjects & Weightage</h4>
                  <button 
                    type="button" 
                    onClick={addSubjectToExam}
                    className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors uppercase tracking-widest border border-indigo-100 dark:border-indigo-800"
                  >
                    Add Subject
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.subjects?.map((sub, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-6 animate-in slide-in-from-top-2">
                      <div className="flex-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Subject</label>
                        <select 
                          value={sub.subjectName}
                          onChange={e => updateSubjectField(idx, 'subjectName', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white"
                        >
                          {MOCK_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Max Theory</label>
                        <input 
                          type="number"
                          value={sub.maxTheory}
                          onChange={e => updateSubjectField(idx, 'maxTheory', parseInt(e.target.value) || 0)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white"
                        />
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Max Practical</label>
                        <input 
                          type="number"
                          value={sub.maxPractical}
                          onChange={e => updateSubjectField(idx, 'maxPractical', parseInt(e.target.value) || 0)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white"
                        />
                      </div>
                      <div className="flex items-end">
                        <button 
                          type="button"
                          onClick={() => removeSubjectFromExam(idx)}
                          className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-900/50 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!formData.subjects || formData.subjects.length === 0) && (
                    <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-center bg-slate-50/30 dark:bg-slate-800/20">
                      <BookOpen className="mx-auto text-slate-200 dark:text-slate-700 mb-4" size={40} />
                      <p className="text-slate-400 dark:text-slate-600 font-bold text-xs uppercase tracking-widest">No subjects assigned to this exam</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest rounded-[1.5rem] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancel</button>
                <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-all">
                  {editingExam ? 'Sync Configuration' : 'Establish Exam Setup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {exams.map((exam) => (
          <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-indigo-100/30 dark:hover:shadow-indigo-900/20 transition-all group flex flex-col">
            <div className="p-8 pb-4">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                  exam.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 
                  exam.status === 'COMPLETED' ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700' :
                  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800'
                }`}>
                  {exam.status}
                </span>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{exam.academicYear}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{exam.name}</h3>
              <p className="text-sm font-bold text-indigo-500 dark:text-indigo-400 mb-6 flex items-center gap-2">
                <GraduationCap size={16} /> Std {exam.className}
              </p>
            </div>

            <div className="flex-1 px-8 space-y-3">
               <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <BookOpen size={14} /> Subject Breakdown
               </div>
               <div className="flex flex-wrap gap-2">
                 {exam.subjects.map(s => (
                   <div key={s.subjectName} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-400">
                     {s.subjectName} ({s.maxTheory + s.maxPractical})
                   </div>
                 ))}
               </div>
            </div>

            <div className="p-8 pt-8 flex flex-col gap-3 mt-auto">
               <button 
                onClick={() => generateMarksheets(exam)}
                className="w-full py-4 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.15em] rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20"
               >
                 <FileSpreadsheet size={18} strokeWidth={2.5} /> Generate Marksheets
               </button>
               
               <div className="flex gap-3">
                 <button 
                  onClick={() => handleOpenEdit(exam)}
                  className="flex-1 py-3 bg-slate-900 dark:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                 >
                   <Edit2 size={14} /> Modify
                 </button>
                 <button 
                  onClick={() => setDeleteId(exam.id)}
                  className="p-3 bg-white dark:bg-slate-800 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-xl hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                 >
                   <Trash2 size={16} />
                 </button>
               </div>
            </div>
          </div>
        ))}

        <div 
          onClick={handleOpenAdd}
          className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-all group min-h-[300px]"
        >
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-700 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-700 mb-6 group-hover:scale-110 transition-transform">
            <Plus size={32} strokeWidth={3} />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Setup New Exam</h3>
          <p className="text-slate-400 dark:text-slate-500 font-medium text-sm mt-1 max-w-[180px]">Define subjects and mark limits for a new term.</p>
        </div>
      </div>
    </div>
  );
};

export default ExamSetup;
