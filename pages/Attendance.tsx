import React, { useState, useMemo, useEffect } from 'react';
import { User, AttendanceRecord, Student } from '../types';
import { 
  Calendar, 
  Check, 
  X, 
  Search, 
  Filter, 
  Clock, 
  Users, 
  UserCheck, 
  UserX, 
  AlertCircle,
  Save,
  CheckCircle2,
  History,
  ArrowRight,
  Zap,
  User as UserIcon,
  GraduationCap,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Target
} from 'lucide-react';
import { MOCK_STUDENTS, MOCK_TEACHERS } from '../constants';

interface AttendanceProps {
  user: User;
}

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_MARKED';
type AttendanceMode = 'STUDENTS' | 'TEACHERS';

const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const [mode, setMode] = useState<AttendanceMode>('STUDENTS');
  const [selectedClass, setSelectedClass] = useState('1st');
  const [selectedSection, setSelectedSection] = useState('A');
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date()); 
  
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [quickEntryValue, setQuickEntryValue] = useState('');
  const [quickStatus, setQuickStatus] = useState<AttendanceStatus>('PRESENT');
  const [lastMarkedInfo, setLastMarkedInfo] = useState<string | null>(null);

  const currentList = useMemo(() => {
    if (mode === 'TEACHERS') return MOCK_TEACHERS;
    return (MOCK_STUDENTS as any as Student[]).filter(s => s.class === selectedClass && s.section === selectedSection);
  }, [mode, selectedClass, selectedSection]);

  const stats = useMemo(() => {
    const total = currentList.length;
    let present = 0;
    let absent = 0;
    let late = 0;

    currentList.forEach(item => {
      const status = attendance[item.id];
      if (status === 'PRESENT') present++;
      else if (status === 'ABSENT') absent++;
      else if (status === 'LATE') late++;
    });

    const markedCount = present + absent + late;
    const unmarked = total - markedCount;
    const completionRate = total > 0 ? (markedCount / total) * 100 : 0;
    
    return { total, present, absent, late, unmarked, completionRate, markedCount };
  }, [attendance, currentList]);

  useEffect(() => {
    setAttendance({});
  }, [mode, selectedClass, selectedSection, selectedDate]);

  const handleQuickMark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEntryValue.trim()) return;

    let target: any = null;
    if (mode === 'STUDENTS') {
      target = MOCK_STUDENTS.find(s => s.rollNo === quickEntryValue.trim());
    } else {
      target = MOCK_TEACHERS.find(t => t.staffId === quickEntryValue.trim() || t.id === quickEntryValue.trim());
    }

    if (target) {
      setAttendance(prev => ({ ...prev, [target.id]: quickStatus }));
      setLastMarkedInfo(`Marked ${target.name} as ${quickStatus}`);
      setQuickEntryValue('');
      setTimeout(() => setLastMarkedInfo(null), 3000);
    } else {
      alert(`${mode === 'STUDENTS' ? 'Roll No' : 'Staff ID'} not found.`);
    }
  };

  const toggleStatus = (id: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [id]: prev[id] === status ? 'NOT_MARKED' : status
    }));
  };

  const markAllPresent = () => {
    const newAttendance: Record<string, AttendanceStatus> = { ...attendance };
    currentList.forEach(s => {
      newAttendance[s.id] = 'PRESENT';
    });
    setAttendance(newAttendance);
  };

  const saveAttendance = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1200);
  };

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
    return days;
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() && 
           date.getMonth() === selectedDate.getMonth() && 
           date.getFullYear() === selectedDate.getFullYear();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-emerald-200/50 flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Records Counted</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Database Synced Successfully</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Attendance Registry</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Real-time tracking and counting for {mode.toLowerCase()}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-200/50 dark:bg-slate-800 p-1.5 rounded-2xl flex items-center gap-1">
            <button onClick={() => setMode('STUDENTS')} className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'STUDENTS' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Students</button>
            <button onClick={() => setMode('TEACHERS')} className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'TEACHERS' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Teachers</button>
          </div>
          <button 
            onClick={saveAttendance}
            disabled={isSaving}
            className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
            Sync & Finalize
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: `Total ${mode}`, value: stats.total, color: 'text-slate-400', icon: <Users size={16}/>, bg: 'bg-white dark:bg-slate-900' },
            { label: 'Present', value: stats.present, color: 'text-emerald-600', icon: <UserCheck size={16}/>, bg: 'bg-emerald-50/30 dark:bg-emerald-900/10' },
            { label: 'Absent', value: stats.absent, color: 'text-rose-600', icon: <UserX size={16}/>, bg: 'bg-rose-50/30 dark:bg-rose-900/10' },
            { label: 'Late', value: stats.late, color: 'text-amber-600', icon: <Clock size={16}/>, bg: 'bg-amber-50/30 dark:bg-amber-900/10' },
            { label: 'Unmarked', value: stats.unmarked, color: 'text-indigo-400', icon: <Target size={16}/>, bg: 'bg-indigo-50/30 dark:bg-indigo-900/10' },
          ].map((s, idx) => (
            <div key={idx} className={`${s.bg} p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300 transform hover:-translate-y-1`}>
              <div className={`flex items-center gap-3 ${s.color} mb-3`}>
                {s.icon}
                <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
              </div>
              <p className={`text-4xl font-black transition-all duration-300 ${s.color}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative group">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-inner">
                    <CheckCircle2 size={20} />
                 </div>
                 <div>
                    <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">Capture Progress</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stats.markedCount} of {stats.total} entities accounted for</p>
                 </div>
              </div>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{Math.round(stats.completionRate)}%</span>
           </div>
           <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner p-1">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all duration-700 ease-out relative"
                style={{ width: `${stats.completionRate}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">Registration Date</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><ChevronLeft size={20}/></button>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><ChevronRight size={20}/></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {DAYS_OF_WEEK.map(d => (
                <span key={d} className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map((day, idx) => (
                <div key={idx} className="aspect-square flex items-center justify-center p-0.5">
                  {day ? (
                    <button 
                      onClick={() => setSelectedDate(day)}
                      className={`w-full h-full rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 relative
                        ${isSelected(day) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}
                        ${isToday(day) && !isSelected(day) ? 'text-indigo-600' : ''}
                      `}
                    >
                      {day.getDate()}
                      {isToday(day) && (
                        <div className={`w-1 h-1 rounded-full ${isSelected(day) ? 'bg-white' : 'bg-indigo-600 animate-ping'}`}></div>
                      )}
                    </button>
                  ) : <div className="w-full h-full" />}
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 text-center">
               <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                 Logging for: {selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
               </span>
            </div>
          </div>

          {mode === 'STUDENTS' && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-inner">
                    <GraduationCap size={20} />
                 </div>
                 <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">Academic Pool</h3>
              </div>
              <div className="space-y-4">
                 <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none">
                    {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                 </select>
                 <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all">
                    <option value="A">Section A</option><option value="B">Section B</option><option value="C">Section C</option>
                 </select>
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight"><Zap className="text-amber-400 animate-pulse" size={24} /> Quick Mark</h3>
            <form onSubmit={handleQuickMark} className="space-y-6">
              <input type="text" value={quickEntryValue} onChange={(e) => setQuickEntryValue(e.target.value)} placeholder={mode === 'STUDENTS' ? "Roll No e.g. 101" : "Staff ID e.g. TEA-101"} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-black text-xl tracking-widest uppercase" />
              <div className="grid grid-cols-3 gap-2">
                {(['PRESENT', 'LATE', 'ABSENT'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setQuickStatus(s)} className={`py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${quickStatus === s ? 'bg-indigo-600 text-white shadow-xl ring-2 ring-white/10' : 'bg-white/5 text-slate-500'}`}>{s}</button>
                ))}
              </div>
              <button type="submit" className="w-full py-5 bg-white text-slate-900 font-black text-xs rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest hover:bg-indigo-500 hover:text-white active:scale-95">Log Entry <ArrowRight size={18} /></button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                 <h3 className="font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tight">Registry Terminal</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{mode === 'STUDENTS' ? `Std ${selectedClass}-${selectedSection}` : 'Faculty Roster'} • Accounted: {stats.markedCount}/{stats.total}</p>
              </div>
              <button onClick={markAllPresent} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 border-2 border-indigo-100 dark:border-indigo-900 px-8 py-3 rounded-2xl transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm">
                <CheckCircle2 size={18} /> Bulk Mark Present
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                    <th className="px-10 py-6 text-left w-24">ID</th>
                    <th className="px-10 py-6 text-left">Identity Profile</th>
                    <th className="px-10 py-6 text-center">Status</th>
                    <th className="px-10 py-6 text-right">Commit Entry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentList.map((item) => {
                    const status = attendance[item.id] || 'NOT_MARKED';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-10 py-8 text-sm font-black text-slate-300 dark:text-slate-700">#{(item as any).rollNo || (item as any).staffId}</td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-lg group-hover:scale-110 transition-transform">
                              {item.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                               <p className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight truncate">{item.name}</p>
                               <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">Verified</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-center">
                            <span className={`inline-block px-5 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all shadow-sm ${
                              status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400' :
                              status === 'ABSENT' ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400' :
                              status === 'LATE' ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400' :
                              'bg-slate-50 text-slate-300 border border-slate-100 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700'
                            }`}>
                              {status === 'NOT_MARKED' ? 'Unaccounted' : status}
                            </span>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="inline-flex items-center gap-2 p-2 bg-slate-100/50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                            <button onClick={() => toggleStatus(item.id, 'PRESENT')} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${status === 'PRESENT' ? 'bg-emerald-500 text-white shadow-lg scale-110' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-emerald-500'}`}><Check size={24} strokeWidth={3} /></button>
                            <button onClick={() => toggleStatus(item.id, 'LATE')} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${status === 'LATE' ? 'bg-amber-500 text-white shadow-lg scale-110' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-amber-500'}`}><Clock size={20} strokeWidth={3} /></button>
                            <button onClick={() => toggleStatus(item.id, 'ABSENT')} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${status === 'ABSENT' ? 'bg-rose-500 text-white shadow-lg scale-110' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-rose-500'}`}><X size={24} strokeWidth={3} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {currentList.length === 0 && (
                 <div className="py-40 text-center">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 text-slate-100 dark:text-slate-700 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-100 dark:border-slate-800"><Users size={48} /></div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Pool Empty</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;