
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student } from '../types';
import { db, supabase } from '../supabase';
import { 
  Calendar, Check, X, Search, Clock, Users, UserCheck, UserX, Save, CheckCircle2, Loader2, CalendarDays, ChevronLeft, ChevronRight, Lock, RefreshCw
} from 'lucide-react';
import { MOCK_STUDENTS } from '../constants';

interface AttendanceProps { user: User; }
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_MARKED';
const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const [selectedClass, setSelectedClass] = useState('1st');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchCloudAttendance = async () => {
    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await db.attendance.getByDate(dateStr);
      const mapped: Record<string, AttendanceStatus> = {};
      data.forEach((r: any) => { mapped[r.student_id] = r.status as AttendanceStatus; });
      setAttendance(mapped);
    } catch (err) { console.error("Attendance Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudAttendance();
    
    const channel = supabase.channel('realtime-attendance-grid')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, (payload) => {
        setIsSyncing(true);
        fetchCloudAttendance().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, selectedClass, selectedSection]);

  const saveAttendance = async () => {
    if (isStudent) return;
    setIsSaving(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const records = Object.entries(attendance).map(([id, status]) => ({
        date: dateStr,
        student_id: id,
        status,
        marked_by: user.name,
        class: selectedClass,
        section: selectedSection
      }));
      await db.attendance.bulkUpsert(records);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Failed to sync with cloud."); }
    finally { setIsSaving(false); }
  };

  const currentList = useMemo(() => {
    if (isStudent) return [MOCK_STUDENTS[0]];
    return (MOCK_STUDENTS as any as Student[]).filter(s => s.class === selectedClass && s.section === selectedSection);
  }, [selectedClass, selectedSection, isStudent]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cloud Update Detected...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Sync Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Global Attendance Updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase flex items-center gap-3">
             Presence Monitor <RefreshCw className={`text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Cloud-synced registry for Session 2026-27.</p>
        </div>
        {!isStudent && (
          <button onClick={saveAttendance} disabled={isSaving} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest disabled:opacity-50">
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Commit to Cloud
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
             <div className="flex items-center gap-3 mb-6">
                <Calendar className="text-indigo-600" />
                <h3 className="text-sm font-black uppercase tracking-widest">Filter Matrix</h3>
             </div>
             <div className="space-y-4">
                <input type="date" value={selectedDate.toISOString().split('T')[0]} onChange={e => setSelectedDate(new Date(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none">
                  {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                </select>
             </div>
          </div>
        </div>

        <div className="lg:col-span-8">
           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px]">
              <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between">
                 <h3 className="font-black text-slate-900 dark:text-white text-xl uppercase">Registry Terminal</h3>
                 {isLoading && <Loader2 className="animate-spin text-indigo-500" size={20}/>}
              </div>
              <div className="p-10 space-y-4">
                 {currentList.map(s => (
                   <div key={s.id} className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 gap-4">
                      <div className="flex items-center gap-5 w-full sm:w-auto">
                         <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                           {s.name.charAt(0)}
                         </div>
                         <div>
                            <p className="font-black text-slate-800 dark:text-white uppercase truncate">{s.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roll: {s.rollNo}</p>
                         </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        {(['PRESENT', 'ABSENT', 'LATE'] as AttendanceStatus[]).map(st => (
                          <button key={st} onClick={() => !isStudent && setAttendance({...attendance, [s.id]: st})} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${attendance[s.id] === st ? (st === 'PRESENT' ? 'bg-emerald-600 text-white' : st === 'ABSENT' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white') : 'bg-white dark:bg-slate-700 text-slate-400'}`}>{st}</button>
                        ))}
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
