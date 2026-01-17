
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Student } from '../types';
import { db, supabase } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Calendar, Check, X, Search, Clock, Users, UserCheck, UserX, Save, 
  CheckCircle2, Loader2, CalendarDays, ChevronLeft, ChevronRight, 
  ArrowLeft, ArrowRight, Hash, Filter, RefreshCw, Zap, GraduationCap, LayoutGrid,
  Globe, BookOpen, Calendar as CalendarIcon, ListChecks
} from 'lucide-react';

interface AttendanceProps { user: User; }
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_MARKED';

type CategoryKey = 
  | 'PRIMARY_GIRLS' | 'SECONDARY_GIRLS' | 'HIGHER_SECONDARY_GIRLS'
  | 'PRIMARY_BOYS' | 'SECONDARY_BOYS' | 'HIGHER_SECONDARY_BOYS'
  | 'GUJ_PRIMARY_GIRLS' | 'GUJ_SECONDARY_GIRLS' | 'GUJ_HIGHER_SECONDARY_GIRLS'
  | 'GUJ_PRIMARY_BOYS' | 'GUJ_SECONDARY_BOYS' | 'GUJ_HIGHER_SECONDARY_BOYS';

const GRADE_RANGES = {
  PRIMARY: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'],
  SECONDARY: ['9th', '10th'],
  HIGHER: ['11th', '12th']
};

const CATEGORY_MAP: Record<CategoryKey, { label: string, grades: string[], color: string }> = {
  PRIMARY_GIRLS: { label: 'Primary Girls (1-8)', grades: GRADE_RANGES.PRIMARY, color: 'text-pink-500' },
  SECONDARY_GIRLS: { label: 'Secondary Girls (9-10)', grades: GRADE_RANGES.SECONDARY, color: 'text-pink-600' },
  HIGHER_SECONDARY_GIRLS: { label: 'Higher Sec Girls (11-12)', grades: GRADE_RANGES.HIGHER, color: 'text-pink-700' },
  PRIMARY_BOYS: { label: 'Primary Boys (1-8)', grades: GRADE_RANGES.PRIMARY, color: 'text-blue-500' },
  SECONDARY_BOYS: { label: 'Secondary Boys (9-10)', grades: GRADE_RANGES.SECONDARY, color: 'text-blue-600' },
  HIGHER_SECONDARY_BOYS: { label: 'Higher Sec Boys (11-12)', grades: GRADE_RANGES.HIGHER, color: 'text-blue-700' },
  GUJ_PRIMARY_GIRLS: { label: 'GUJ Primary Girls (1-8)', grades: GRADE_RANGES.PRIMARY, color: 'text-orange-500' },
  GUJ_PRIMARY_BOYS: { label: 'GUJ Primary Boys (1-8)', grades: GRADE_RANGES.PRIMARY, color: 'text-emerald-500' },
  GUJ_SECONDARY_GIRLS: { label: 'GUJ Secondary Girls (9-10)', grades: GRADE_RANGES.SECONDARY, color: 'text-orange-600' },
  GUJ_SECONDARY_BOYS: { label: 'GUJ Secondary Boys (9-10)', grades: GRADE_RANGES.SECONDARY, color: 'text-emerald-600' },
  GUJ_HIGHER_SECONDARY_GIRLS: { label: 'GUJ Higher Sec Girls (11-12)', grades: GRADE_RANGES.HIGHER, color: 'text-orange-700' },
  GUJ_HIGHER_SECONDARY_BOYS: { label: 'GUJ Higher Sec Boys (11-12)', grades: GRADE_RANGES.HIGHER, color: 'text-emerald-700' }
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('PRIMARY_GIRLS');
  const [selectedClass, setSelectedClass] = useState('1st');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [quickRoll, setQuickRoll] = useState('');
  const rollInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const available = CATEGORY_MAP[selectedCategory].grades;
    if (!available.includes(selectedClass)) {
      setSelectedClass(available[0]);
    }
  }, [selectedCategory]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const [studentData, attendanceData] = await Promise.all([
        db.students.getAll(),
        db.attendance.getByDate(dateStr)
      ]);

      const mappedStudents = studentData.map((s: any) => ({
        id: s.id, fullName: s.full_name, name: s.full_name, rollNo: s.roll_no,
        class: s.class, section: s.section
      })) as Student[];

      setStudents(mappedStudents);

      const attendanceMap: Record<string, AttendanceStatus> = {};
      attendanceData.forEach((r: any) => {
        attendanceMap[r.student_id] = r.status as AttendanceStatus;
      });
      setAttendance(attendanceMap);
    } catch (err) {
      console.error("Attendance Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime-attendance-v85')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, selectedClass, selectedSection]);

  const currentList = useMemo(() => {
    return students
      .filter(s => s.class === selectedClass && s.section === selectedSection)
      .sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
  }, [students, selectedClass, selectedSection]);

  const markAllPresent = () => {
    const newAttendance = { ...attendance };
    currentList.forEach(s => {
      newAttendance[s.id] = 'PRESENT';
    });
    setAttendance(newAttendance);
  };

  const handleQuickMark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRoll) return;
    const student = currentList.find(s => s.rollNo === quickRoll);
    if (student) {
      setAttendance(prev => ({ ...prev, [student.id]: 'ABSENT' })); 
      setQuickRoll('');
      rollInputRef.current?.focus();
    } else {
      alert(`Roll No ${quickRoll} not found in this class.`);
      setQuickRoll('');
    }
  };

  const handleSaveAttendance = async () => {
    if (isStudent) return;
    setIsSaving(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const records = currentList.map(s => ({
        date: dateStr,
        student_id: s.id,
        status: attendance[s.id] || 'PRESENT',
        marked_by: user.name,
        class: selectedClass,
        section: selectedSection
      }));

      await db.attendance.bulkUpsert(records);
      createAuditLog(user, 'UPDATE', 'Attendance', `Registry Synced: ${CATEGORY_MAP[selectedCategory].label}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert("Sync Failure.");
    } finally {
      setIsSaving(false);
    }
  };

  const markStatus = (studentId: string, status: AttendanceStatus) => {
    if (isStudent) return;
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const calendarData = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    
    return days;
  }, [selectedDate.getMonth(), selectedDate.getFullYear()]);

  const changeMonth = (offset: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setMonth(nextDate.getMonth() + offset);
    setSelectedDate(nextDate);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest leading-none">Global Sync Success</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-1.5">Attendance records committed</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">
             Attendance terminal <Zap className="text-indigo-600" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional Registry Matrix</p>
        </div>
        {!isStudent && (
          <div className="flex gap-3">
            <button 
              onClick={markAllPresent} 
              className="px-8 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 font-black rounded-2xl shadow-sm hover:bg-indigo-50 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center gap-3"
            >
              <ListChecks size={20} /> Mark All Present
            </button>
            <button 
              onClick={handleSaveAttendance} 
              disabled={isSaving || currentList.length === 0} 
              className="px-10 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Sync Terminal
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar: COMPACT WHITE GRID CALENDAR */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
              {/* Financial Year Month Navigator */}
              <div className="flex items-center justify-between mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                 <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-400 hover:text-indigo-600">
                    <ChevronLeft size={20} />
                 </button>
                 <div className="text-center">
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                       {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-[6px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Financial Cycle</p>
                 </div>
                 <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-400 hover:text-indigo-600">
                    <ChevronRight size={20} />
                 </button>
              </div>

              {/* GRID CALENDAR - COMPACT HEIGHT */}
              <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-700 shadow-lg relative overflow-hidden flex flex-col">
                 <div className="grid grid-cols-7 gap-1.5 mb-4">
                    {WEEKDAYS.map(w => (
                      <div key={w} className="text-center text-[9px] font-black text-slate-300 uppercase">{w}</div>
                    ))}
                 </div>
                 
                 <div className="grid grid-cols-7 gap-1.5">
                    {calendarData.map((d, idx) => {
                       if (!d) return <div key={`empty-${idx}`} className="aspect-square" />;
                       
                       const isSelected = d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth();
                       const isToday = new Date().toDateString() === d.toDateString();
                       
                       return (
                         <button 
                           key={d.getTime()}
                           onClick={() => setSelectedDate(d)}
                           className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all duration-200 border-2 ${
                             isSelected ? 'bg-indigo-600 border-indigo-400 text-white shadow-md scale-105 z-10' : 
                             isToday ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-100 dark:border-indigo-900 text-indigo-600 font-black' :
                             'bg-slate-50/50 dark:bg-slate-900/50 border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xs'
                           }`}
                         >
                           <span className="font-black tracking-tighter leading-none">{d.getDate()}</span>
                           {isToday && !isSelected && <div className="w-1 h-1 bg-indigo-500 rounded-full mt-1 animate-pulse" />}
                         </button>
                       );
                    })}
                 </div>
              </div>
              
              <div className="space-y-4 pt-6 mt-6 border-t border-slate-50 dark:border-slate-800">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Medium & Wing</label>
                    <select 
                      value={selectedCategory} 
                      onChange={e => setSelectedCategory(e.target.value as CategoryKey)} 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all text-[10px]"
                    >
                      <optgroup label="English Medium">
                        <option value="PRIMARY_GIRLS">Primary Girls (1-8)</option>
                        <option value="PRIMARY_BOYS">Primary Boys (1-8)</option>
                        <option value="SECONDARY_GIRLS">Secondary Girls (9-10)</option>
                        <option value="SECONDARY_BOYS">Secondary Boys (9-10)</option>
                        <option value="HIGHER_SECONDARY_GIRLS">Higher Sec Girls (11-12)</option>
                        <option value="HIGHER_SECONDARY_BOYS">Higher Sec Boys (11-12)</option>
                      </optgroup>
                      <optgroup label="Gujarati Medium">
                        <option value="GUJ_PRIMARY_GIRLS">GUJ Primary Girls (1-8)</option>
                        <option value="GUJ_PRIMARY_BOYS">GUJ Primary Boys (1-8)</option>
                        <option value="GUJ_SECONDARY_GIRLS">GUJ Secondary Girls (9-10)</option>
                        <option value="GUJ_SECONDARY_BOYS">GUJ Secondary Boys (9-10)</option>
                        <option value="GUJ_HIGHER_SECONDARY_GIRLS">GUJ Higher Sec Girls (11-12)</option>
                        <option value="GUJ_HIGHER_SECONDARY_BOYS">GUJ Higher Sec Boys (11-12)</option>
                      </optgroup>
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Standard</label>
                       <select 
                         value={selectedClass} 
                         onChange={e => setSelectedClass(e.target.value)} 
                         className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white outline-none text-[10px]"
                       >
                         {CATEGORY_MAP[selectedCategory].grades.map(c => <option key={c} value={c}>Std {c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Section</label>
                       <select 
                         value={selectedSection} 
                         onChange={e => setSelectedSection(e.target.value)} 
                         className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white outline-none text-[10px]"
                       >
                         <option value="A">A</option>
                         <option value="B">B</option>
                         <option value="C">C</option>
                       </select>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Main Panel: Student List & Quick Mark */}
        <div className="lg:col-span-8 space-y-6">
           {!isStudent && (
             <div className="bg-white dark:bg-slate-900 p-5 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                <div className="w-full max-w-sm">
                   <form onSubmit={handleQuickMark} className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-rose-500">
                         <UserX size={18} />
                      </div>
                      <input 
                        ref={rollInputRef}
                        type="text" 
                        value={quickRoll}
                        onChange={e => setQuickRoll(e.target.value)}
                        placeholder="ROLL NO (ABSENT)" 
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-rose-500 rounded-2xl font-black text-base outline-none transition-all shadow-inner dark:text-white placeholder:text-slate-300 uppercase text-center" 
                      />
                      <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-rose-600 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                         <Check size={16} strokeWidth={4} />
                      </button>
                   </form>
                </div>
             </div>
           )}

           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[500px]">
              <div className="px-10 py-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex items-center gap-5">
                    <GraduationCap size={32} className="text-indigo-600" />
                    <div>
                       <h3 className="font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tight leading-none">Std {selectedClass} Ledger</h3>
                       <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${CATEGORY_MAP[selectedCategory].color}`}>{CATEGORY_MAP[selectedCategory].label}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attendance Stats</p>
                       <p className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                          {Object.values(attendance).filter(v => v === 'PRESENT').length} Present • {Object.values(attendance).filter(v => v === 'ABSENT').length} Absent
                       </p>
                    </div>
                    {isLoading && <Loader2 className="animate-spin text-indigo-500" size={32}/>}
                 </div>
              </div>

              <div className="p-6 sm:p-10 space-y-4">
                 {currentList.length > 0 ? currentList.map((student) => {
                   const status = attendance[student.id] || 'NOT_MARKED';
                   return (
                     <div key={student.id} className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[3rem] border border-transparent hover:border-indigo-100 hover:bg-white dark:hover:bg-slate-800 transition-all group gap-6">
                        <div className="flex items-center gap-8 w-full sm:w-auto">
                           <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center font-black text-2xl shadow-xl group-hover:scale-110 transition-transform ${status === 'PRESENT' ? 'bg-emerald-600 text-white shadow-emerald-100' : status === 'ABSENT' ? 'bg-rose-600 text-white shadow-rose-100' : 'bg-white dark:bg-slate-700 text-slate-400 shadow-sm'}`}>
                             {student.rollNo}
                           </div>
                           <div className="min-w-0">
                              <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm leading-tight truncate max-w-[200px]">{student.fullName}</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Profile Verified Registry</p>
                           </div>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-center bg-white/50 dark:bg-slate-900/50 p-3 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                           {!isStudent && (
                             <button 
                               onClick={() => markStatus(student.id, 'PRESENT')}
                               className={`p-4 rounded-2xl transition-all ${status === 'PRESENT' ? 'bg-emerald-600 text-white shadow-xl' : 'bg-white dark:bg-slate-700 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                               title="Mark Present"
                             >
                               <ArrowLeft size={28} strokeWidth={3} />
                             </button>
                           )}
                           
                           <div className={`px-12 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border transition-all min-w-[160px] text-center ${status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : status === 'ABSENT' ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                              {status === 'NOT_MARKED' ? 'PENDING' : status.replace('_', ' ')}
                           </div>

                           {!isStudent && (
                             <button 
                               onClick={() => markStatus(student.id, 'ABSENT')}
                               className={`p-4 rounded-2xl transition-all ${status === 'ABSENT' ? 'bg-rose-600 text-white shadow-xl' : 'bg-white dark:bg-slate-700 text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
                               title="Mark Absent"
                             >
                               <ArrowRight size={28} strokeWidth={3} />
                             </button>
                           )}
                        </div>
                     </div>
                   );
                 }) : !isLoading && (
                   <div className="py-40 text-center flex flex-col items-center">
                      <LayoutGrid size={80} className="text-slate-100 dark:text-slate-800 mb-8" />
                      <h3 className="text-3xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter">No Records Found</h3>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Adjust Grade or Section to load registry.</p>
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
