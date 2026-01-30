
import React, { useState, useMemo, useEffect } from 'react';
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
  Save,
  Loader2,
  ShieldCheck,
  Shield,
  Lock
} from 'lucide-react';
import { MOCK_SUBJECTS, MOCK_TEACHERS, MOCK_TIMETABLE } from '../constants';
import { supabase } from '../supabase';

interface TimetableProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];
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

const Timetable: React.FC<TimetableProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const isAdmin = user.role === 'ADMIN';
  
  // Use profile values for students, first available for admin/teacher initially
  const [selectedClass, setSelectedClass] = useState(user.class || ALL_CLASSES[0]);
  const [selectedSection, setSelectedSection] = useState(user.section || 'A');
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimetable = async () => {
      // Logic for production: fetch from Supabase
      setTimeout(() => {
        setEntries(MOCK_TIMETABLE);
        setIsLoading(false);
      }, 500);
    };
    fetchTimetable();
  }, []);

  // Strict filtering for students
  const filteredEntries = useMemo(() => {
    const cls = isStudent ? (user.class || '') : selectedClass;
    const sec = isStudent ? (user.section || '') : selectedSection;
    return entries.filter(e => e.className === cls && e.section === sec);
  }, [entries, selectedClass, selectedSection, isStudent, user]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Schedule Node</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.4em]">
             {isStudent ? `Academic Grid: Standard ${user.class}-${user.section}` : 'Institutional Resource Distribution'}
          </p>
        </div>
        <div className="flex items-center gap-4">
           {isStudent && (
             <div className="flex items-center gap-3 px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
                <ShieldCheck size={18} className="text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Active Identity Sync</span>
             </div>
           )}
           <button onClick={() => window.print()} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 rounded-2xl hover:text-indigo-600 shadow-sm transition-all no-print">
             <Printer size={20} />
           </button>
        </div>
      </div>

      {!isStudent && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-6 mx-4 sm:mx-0 no-print">
           <div className="flex-1 w-full">
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Grade Node</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white mt-1">
                {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
              </select>
           </div>
           <div className="flex-1 w-full">
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Section</label>
              <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white mt-1">
                <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
              </select>
           </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mx-4 sm:mx-0 relative">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-6 text-left border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-slate-50 dark:bg-slate-800/50 z-20 w-40">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Clock size={14} /> Time Slot</div>
                </th>
                {DAYS.map(day => (
                  <th key={day} className="p-6 text-center min-w-[160px]"><span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">{day}</span></th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={7} className="py-40 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" size={32}/></td></tr>
              ) : (
                TIME_SLOTS.map((slot) => {
                  const isBreak = slot.includes('11:00');
                  const [start] = slot.split(' - ');
                  return (
                    <tr key={slot} className={isBreak ? "bg-slate-50/50 dark:bg-slate-800/20" : ""}>
                      <td className="p-6 border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 z-10 font-black text-xs">
                        <span className="text-slate-900 dark:text-white">{slot}</span>
                      </td>
                      {isBreak ? (
                        <td colSpan={6} className="p-4 text-center">
                          <div className="py-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl border border-dashed border-indigo-100 dark:border-indigo-800">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">RECESS INTERVAL</span>
                          </div>
                        </td>
                      ) : (
                        DAYS.map(day => {
                          const entry = filteredEntries.find(e => e.day === day && e.startTime === start);
                          return (
                            <td key={day} className="p-3">
                              {entry ? (
                                <div className={`p-6 rounded-[2rem] h-full transition-all duration-300 border-2 border-indigo-50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-900/20 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl`}>
                                   <h5 className="font-black text-sm text-indigo-700 dark:text-indigo-300 uppercase truncate mb-1">{entry.subject}</h5>
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><UserIcon size={12} /> {entry.teacherName}</p>
                                </div>
                              ) : (
                                <div className="h-24 border-2 border-dashed border-slate-50 dark:border-slate-800 rounded-[2rem] opacity-30"></div>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="p-10 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border border-slate-100 dark:border-slate-800 flex items-start gap-4 mx-4 sm:mx-0">
         <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 shrink-0 shadow-sm"><Shield size={24} /></div>
         <div className="flex-1">
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">Schedule Access Token</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed tracking-wider">The schedule terminal is locked for student identity. For class swaps or schedule inquiries, please coordinate with the Academic Registrar via faculty portals.</p>
         </div>
      </div>
    </div>
  );
};

export default Timetable;
