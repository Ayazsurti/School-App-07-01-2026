
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
  const [selectedClass, setSelectedClass] = useState('1st');
  const [selectedSection, setSelectedSection] = useState('A');
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
      return entries.filter(e => e.className === '10th' && e.section === 'A');
    }
    if (user.role === 'TEACHER') {
      return entries.filter(e => e.teacherId === user.id);
    }
    return entries.filter(e => e.className === selectedClass && e.section === selectedSection);
  }, [entries, user, selectedClass, selectedSection]);

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
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
    if (confirm('Permanently remove this period from the timetable?')) {
      setEntries(prev => prev.filter(e => e.id !== id));
      triggerSuccess('Schedule entry purged');
    }
  };

  const handleAddSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects(prev => [...prev, newSubject.trim()]);
      setNewSubject('');
      triggerSuccess('Academic subject registered');
    }
  };

  const removeSubject = (sub: string) => {
    setSubjects(prev => prev.filter(s => s !== sub));
    triggerSuccess('Subject removed from list');
  };

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
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Success</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">{successMsg}</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Academic Timetable</h1>
          <p className="text-slate-500 font-medium">Manage and view the weekly schedule for all classes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user.role === 'ADMIN' && (
            <button 
              onClick={() => setShowSubjectModal(true)}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
            >
              <BookOpen size={18} /> Manage Subjects
            </button>
          )}
          {canManage && (
            <button 
              onClick={() => { setEditingEntry(null); setShowAddModal(true); }}
              className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all hover:-translate-y-0.5"
            >
              <Plus size={18} strokeWidth={3} /> Add Period
            </button>
          )}
          <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-slate-600 transition-colors">
            <Printer size={20} />
          </button>
        </div>
      </div>

      {user.role !== 'STUDENT' && (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4 flex-1 w-full">
             <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Class</label>
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                </select>
             </div>
             <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Section</label>
                <select 
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
             </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <LayoutGrid size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Schedule</p>
                <p className="text-sm font-black text-slate-800">Class {selectedClass} - {selectedSection}</p>
             </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-6 text-left border-r border-slate-100 sticky left-0 bg-slate-50 z-20 w-40">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Clock size={14} /> Time Slot
                  </div>
                </th>
                {DAYS.map(day => (
                  <th key={day} className="p-6 text-center min-w-[160px]">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-widest">{day}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TIME_SLOTS.map((slot, sIdx) => {
                const isBreak = slot.includes('Break');
                const [start, end] = slot.split(' - ');
                
                return (
                  <tr key={slot} className={isBreak ? "bg-slate-50/50" : ""}>
                    <td className="p-6 border-r border-slate-100 sticky left-0 bg-white z-10 font-black text-xs text-slate-400">
                      <div className="flex flex-col">
                        <span className="text-slate-900">{start}</span>
                        <span className="opacity-50">{end}</span>
                      </div>
                    </td>
                    
                    {isBreak ? (
                      <td colSpan={6} className="p-4 text-center">
                        <div className="py-2 bg-indigo-50/30 rounded-2xl border border-dashed border-indigo-100">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Institutional Break Interval</span>
                        </div>
                      </td>
                    ) : (
                      DAYS.map(day => {
                        const entry = filteredEntries.find(e => e.day === day && e.startTime === start);
                        
                        return (
                          <td key={day} className="p-3">
                            {entry ? (
                              <div className={`relative p-5 rounded-[2rem] h-full group transition-all duration-300 border-2 border-transparent hover:border-white hover:shadow-xl hover:-translate-y-1 bg-${entry.color || 'indigo'}-50 text-${entry.color || 'indigo'}-700 overflow-hidden`}>
                                <div className={`absolute top-0 right-0 w-16 h-16 bg-${entry.color || 'indigo'}-100/50 rounded-full -mr-8 -mt-8 opacity-40`}></div>
                                
                                <div className="relative z-10">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-black text-sm tracking-tight truncate pr-4">{entry.subject}</h5>
                                    {canManage && (
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => { setEditingEntry(entry); setFormData(entry); setShowAddModal(true); }}
                                          className="p-1.5 hover:bg-white/50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteEntry(entry.id)}
                                          className="p-1.5 hover:bg-white/50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1 flex items-center gap-1">
                                    <UserIcon size={10} /> {entry.teacherName}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="h-24 border-2 border-dashed border-slate-50 rounded-[2rem] flex items-center justify-center group hover:border-indigo-100 transition-all">
                                {canManage && (
                                  <button 
                                    onClick={() => { 
                                      setEditingEntry(null); 
                                      setFormData({ ...formData, day: day as any, startTime: start, endTime: end }); 
                                      setShowAddModal(true); 
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-3 bg-white text-indigo-600 rounded-full shadow-lg border border-indigo-50 transition-all scale-75 group-hover:scale-100"
                                  >
                                    <Plus size={18} strokeWidth={3} />
                                  </button>
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
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Manage Subjects</h3>
                <button onClick={() => setShowSubjectModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
             </div>
             
             <div className="space-y-6">
                <div className="flex gap-2">
                   <input 
                    type="text" 
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="New Subject Name..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                   />
                   <button 
                    onClick={handleAddSubject}
                    className="px-6 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                   >
                    Add
                   </button>
                </div>
                
                <div className="max-h-80 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                   {subjects.map(sub => (
                     <div key={sub} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                        <span className="text-sm font-black text-slate-700 uppercase tracking-widest">{sub}</span>
                        <button 
                          onClick={() => removeSubject(sub)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                   ))}
                </div>
             </div>
             <button 
              onClick={() => setShowSubjectModal(false)}
              className="w-full mt-8 py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
             >
              Done
             </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editingEntry ? 'Modify Schedule' : 'Schedule Period'}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
             </div>
             
             <form onSubmit={handleSaveEntry} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Day</label>
                    <select 
                      value={formData.day}
                      onChange={(e) => setFormData({...formData, day: e.target.value as any})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Subject</label>
                    <select 
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Start</label>
                    <input 
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">End</label>
                    <input 
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Teacher</label>
                  <select 
                    value={formData.teacherId}
                    onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    {MOCK_TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Theme</label>
                  <div className="flex gap-2.5">
                    {COLORS.map(c => (
                      <button 
                        key={c}
                        type="button"
                        onClick={() => setFormData({...formData, color: c})}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c ? 'border-slate-900 scale-125' : 'border-transparent'} bg-${c}-500`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-xs uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    <Save size={18} /> Confirm Schedule
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
