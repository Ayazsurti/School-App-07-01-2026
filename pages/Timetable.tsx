
import React, { useState, useMemo } from 'react';
import { User, TimetableEntry } from '../types';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  BookOpen, 
  User as UserIcon,
  Printer,
  CheckCircle2,
  CalendarDays,
  LayoutGrid,
  Save
} from 'lucide-react';
import { MOCK_SUBJECTS, MOCK_TEACHERS, MOCK_TIMETABLE } from '../constants';

interface TimetableProps {
  user: User;
}

const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const TIME_SLOTS = [
  '08:00 - 08:45',
  '08:45 - 09:30',
  '09:30 - 10:15',
  '10:15 - 11:00',
  '11:00 - 11:30', // Break
  '11:30 - 12:15',
  '12:15 - 13:00',
  '13:00 - 13:45',
];

const COLORS = ['indigo', 'emerald', 'amber', 'rose', 'purple', 'sky', 'pink', 'orange'];

const Timetable: React.FC<TimetableProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const [selectedClass, setSelectedClass] = useState(isStudent ? user.class || '1st' : '1st');
  const [selectedSection, setSelectedSection] = useState(isStudent ? user.section || 'A' : 'A');
  const [entries, setEntries] = useState<TimetableEntry[]>(MOCK_TIMETABLE);
  const [subjects, setSubjects] = useState<string[]>(MOCK_SUBJECTS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [newSubject, setNewSubject] = useState('');
  const [formData, setFormData] = useState<Partial<TimetableEntry>>({
    day: 'Monday',
    startTime: '08:00',
    endTime: '08:45',
    subject: MOCK_SUBJECTS[0],
    teacherId: MOCK_TEACHERS[0].id,
    color: 'indigo'
  });

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const filteredEntries = useMemo(() => {
    if (user.role === 'STUDENT') {
      return entries.filter(e => e.className === user.class && e.section === user.section);
    }
    if (user.role === 'TEACHER') {
      return entries.filter(e => e.className === selectedClass && e.section === selectedSection);
    }
    return entries.filter(e => e.className === selectedClass && e.section === selectedSection);
  }, [entries, user, selectedClass, selectedSection]);

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role !== 'ADMIN') return;
    const teacher = MOCK_TEACHERS.find(t => t.id === formData.teacherId);
    
    if (editingEntry) {
      setEntries(prev => prev.map(entry => entry.id === editingEntry.id ? {
        ...entry,
        ...formData,
        teacherName: teacher?.name || 'Unknown',
        className: selectedClass,
        section: selectedSection,
      } as TimetableEntry : entry));
      triggerSuccess('Schedule entry synchronized');
    } else {
      const newEntry: TimetableEntry = {
        id: Math.random().toString(36).substr(2, 9),
        day: formData.day as any,
        startTime: formData.startTime!,
        endTime: formData.endTime!,
        subject: formData.subject!,
        teacherId: formData.teacherId!,
        teacherName: teacher?.name || 'Unknown',
        className: selectedClass,
        section: selectedSection,
        color: formData.color || 'indigo'
      };
      setEntries(prev => [...prev, newEntry]);
      triggerSuccess('New period assigned successfully');
    }
    setShowAddModal(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = (id: string) => {
    if (user.role !== 'ADMIN') return;
    if (confirm('Permanently remove this period from the timetable?')) {
      setEntries(prev => prev.filter(e => e.id !== id));
      triggerSuccess('Schedule entry purged');
    }
  };

  const handleAddSubject = () => {
    if (user.role !== 'ADMIN') return;
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects(prev => [...prev, newSubject.trim()]);
      setNewSubject('');
      triggerSuccess('Academic subject registered');
    }
  };

  const removeSubject = (sub: string) => {
    if (user.role !== 'ADMIN') return;
    setSubjects(prev => prev.filter(s => s !== sub));
    triggerSuccess('Subject removed from list');
  };

  // Only Admin can add, edit, or delete periods
  const canManage = user.role === 'ADMIN';

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">{successMsg}</p>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Academic Timetable</h1>
          <p className="text-slate-500 font-medium">Weekly schedule for Std {selectedClass}-{selectedSection}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 no-print">
          {user.role === 'ADMIN' && (
            <button 
              onClick={() => setShowSubjectModal(true)}
              className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
            >
              <BookOpen size={18} /> Manage Subjects
            </button>
          )}
          {canManage && (
            <button 
              onClick={() => { setEditingEntry(null); setShowAddModal(true); }}
              className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"
            >
              <Plus size={18} strokeWidth={3} /> Add Period
            </button>
          )}
          <button onClick={() => window.print()} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 rounded-2xl hover:text-slate-600">
            <Printer size={20} />
          </button>
        </div>
      </div>

      {!isStudent && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-6 no-print">
          <div className="flex items-center gap-4 flex-1 w-full">
             <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Class</label>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white">
                  {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                </select>
             </div>
             <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Section</label>
                <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white">
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                </select>
             </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-6 text-left border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-slate-50 dark:bg-slate-800/50 z-20 w-40">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Clock size={14} /> Slot</div>
                </th>
                {DAYS.map(day => (
                  <th key={day} className="p-6 text-center min-w-[160px]"><span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">{day}</span></th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {TIME_SLOTS.map((slot, sIdx) => {
                const isBreak = slot.includes('Break');
                const [start, end] = slot.split(' - ');
                return (
                  <tr key={slot} className={isBreak ? "bg-slate-50/50 dark:bg-slate-800/20" : ""}>
                    <td className="p-6 border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 z-10 font-black text-xs">
                      <div className="flex flex-col"><span className="text-slate-900 dark:text-white">{start}</span><span className="text-slate-400 opacity-50">{end}</span></div>
                    </td>
                    {isBreak ? (
                      <td colSpan={6} className="p-4 text-center">
                        <div className="py-2 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl border border-dashed border-indigo-100 dark:border-indigo-800">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Institutional Break Interval</span>
                        </div>
                      </td>
                    ) : (
                      DAYS.map(day => {
                        const entry = filteredEntries.find(e => e.day === day && e.startTime === start);
                        return (
                          <td key={day} className="p-3">
                            {entry ? (
                              <div className={`relative p-5 rounded-[2rem] h-full group transition-all duration-300 border-2 border-transparent bg-${entry.color || 'indigo'}-50 dark:bg-${entry.color || 'indigo'}-900/20 text-${entry.color || 'indigo'}-700 dark:text-${entry.color || 'indigo'}-300 overflow-hidden`}>
                                <div className="relative z-10">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-black text-sm tracking-tight truncate pr-4">{entry.subject}</h5>
                                    {canManage && (
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingEntry(entry); setFormData(entry); setShowAddModal(true); }} className="p-1 hover:bg-white/50 rounded-lg"><Edit2 size={12} /></button>
                                        <button onClick={() => handleDeleteEntry(entry.id)} className="p-1 hover:bg-white/50 rounded-lg"><Trash2 size={12} /></button>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1"><UserIcon size={10} /> {entry.teacherName}</p>
                                </div>
                              </div>
                            ) : (
                              <div className={`h-24 border-2 border-dashed border-slate-50 dark:border-slate-800 rounded-[2rem] flex items-center justify-center group ${canManage ? 'hover:border-indigo-100 dark:hover:border-indigo-800' : ''}`}>
                                {canManage && (
                                  <button onClick={() => { setEditingEntry(null); setFormData({ ...formData, day: day as any, startTime: start, endTime: end }); setShowAddModal(true); }} className="opacity-0 group-hover:opacity-100 p-3 bg-white text-indigo-600 rounded-full shadow-lg transition-all scale-75 group-hover:scale-100"><Plus size={18} strokeWidth={3} /></button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showSubjectModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Subjects Registry</h3>
                <button onClick={() => setShowSubjectModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
             </div>
             <div className="space-y-6">
                <div className="flex gap-2">
                   <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="New Subject Name..." className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()} />
                   <button onClick={handleAddSubject} className="px-6 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-lg">Add</button>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                   {subjects.map(sub => (
                     <div key={sub} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 group">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{sub}</span>
                        <button onClick={() => removeSubject(sub)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{editingEntry ? 'Modify Period' : 'Schedule Period'}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
             </div>
             <form onSubmit={handleSaveEntry} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Day</label>
                    <select value={formData.day} onChange={(e) => setFormData({...formData, day: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 font-bold dark:text-white">
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Subject</label>
                    <select value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 font-bold dark:text-white">
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Teacher</label>
                  <select value={formData.teacherId} onChange={(e) => setFormData({...formData, teacherId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 font-bold dark:text-white">
                    {MOCK_TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <Save size={18} /> Sync to Timetable
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
