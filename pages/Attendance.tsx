
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student } from '../types';
import { db, supabase } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Calendar as CalendarIcon, Check, X, Clock, UserCheck, Save, 
  CheckCircle2, Loader2, ChevronLeft, ChevronRight, 
  ArrowLeft, ArrowRight, RefreshCcw, LayoutGrid,
  ShieldCheck, AlertCircle, Hash, Zap, CornerDownLeft, Users, UserX, ChevronDown, Layers, Globe
} from 'lucide-react';

interface AttendanceProps { user: User; }
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'NOT_MARKED';

// Synchronized with StudentsManager.tsx
const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];

const ALL_SECTIONS = ['A', 'B', 'C', 'D'];
const MEDIUMS = ['ENGLISH MEDIUM', 'GUJRATI MEDIUM'];

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [viewDate, setViewDate] = useState(new Date());
  
  // Selection States
  const [selectedMedium, setSelectedMedium] = useState(MEDIUMS[0]);
  const [selectedClass, setSelectedClass] = useState(ALL_CLASSES[0]);
  const [selectedSection, setSelectedSection] = useState('A');
  
  const [absentRollInput, setAbsentRollInput] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (isStudent) {
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', user.id)
          .order('date', { ascending: false });
        if (error) throw error;
        setStudentRecords(data || []);
      } else {
        const [studentData, attendanceData] = await Promise.all([
          db.students.getAll(),
          db.attendance.getByDate(selectedDate)
        ]);

        const mappedStudents = studentData.map((s: any) => ({
          id: s.id, 
          fullName: s.full_name, 
          name: s.full_name, 
          grNumber: s.gr_number,
          class: s.class, 
          section: s.section, 
          rollNo: s.roll_no, 
          gender: s.gender,
          medium: s.medium,
          status: s.status
        }));
        
        // Filter out cancelled students
        const activeStudents = mappedStudents.filter(s => s.status !== 'CANCELLED');
        setStudents(activeStudents as Student[]);

        const attendanceMap: Record<string, AttendanceStatus> = {};
        attendanceData.forEach((record: any) => {
          attendanceMap[record.student_id] = record.status as AttendanceStatus;
        });
        
        // Auto-fill PRESENT for current filtered set if no record exists
        const currentSet = activeStudents.filter((s: any) => 
          s.class === selectedClass && 
          s.section === selectedSection && 
          s.medium === selectedMedium
        );
          
        currentSet.forEach((s: any) => {
          if (!attendanceMap[s.id]) attendanceMap[s.id] = 'PRESENT';
        });

        setAttendance(attendanceMap);
      }
    } catch (err) {
      console.error("Attendance Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime-attendance-v24')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        setIsSyncing(true);
        fetchData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, user.id, selectedClass, selectedSection, selectedMedium]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [viewDate]);

  const { presentPool, absentRegistry } = useMemo(() => {
    if (isStudent) return { presentPool: [], absentRegistry: [] };
    const baseList = students.filter(s => 
      s.class === selectedClass && 
      s.section === selectedSection && 
      s.medium === selectedMedium
    );
    const sorted = baseList.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
    
    return {
      presentPool: sorted.filter(s => attendance[s.id] !== 'ABSENT'),
      absentRegistry: sorted.filter(s => attendance[s.id] === 'ABSENT')
    };
  }, [students, attendance, selectedClass, selectedSection, selectedMedium, isStudent]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleAbsentRollSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && absentRollInput.trim()) {
      const studentToMark = presentPool.find(s => s.rollNo === absentRollInput.trim());
      if (studentToMark) {
        handleStatusChange(studentToMark.id, 'ABSENT');
        setAbsentRollInput('');
      } else {
        if (absentRegistry.find(s => s.rollNo === absentRollInput.trim())) {
           setAbsentRollInput('');
        } else {
           alert(`Roll No ${absentRollInput} not found in current list.`);
        }
      }
    }
  };

  const handleSave = async () => {
    if (isStudent) return;
    setIsSaving(true);
    try {
      const currentList = students.filter(s => 
        s.class === selectedClass && 
        s.section === selectedSection && 
        s.medium === selectedMedium
      );
      
      const records = currentList.map(s => ({
        student_id: s.id,
        date: selectedDate,
        status: attendance[s.id] || 'PRESENT',
        marked_by: user.name
      }));
      
      await db.attendance.bulkUpsert(records);
      await createAuditLog(user, 'CREATE', 'Attendance', `Synced: Std ${selectedClass}-${selectedSection} (${selectedMedium}) on ${selectedDate}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert("Failed to sync records.");
    } finally {
      setIsSaving(false);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  if (isStudent) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-500">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">Attendance History <CalendarIcon className="text-indigo-600" /></h1>
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Checked</p>
               <h3 className="text-4xl font-black text-slate-900 dark:text-white">{studentRecords.length}</h3>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-800">
               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Present Count</p>
               <h3 className="text-4xl font-black text-emerald-800 dark:text-emerald-100">{studentRecords.filter(r => r.status === 'PRESENT').length}</h3>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-indigo-400">
              {/* DO add comment above each fix. Fixed: Use RefreshCcw instead of RefreshCw */}
              <RefreshCcw size={12} className="animate-spin" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white">Registry Resync...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={20} strokeWidth={3} />
              <p className="font-black text-[10px] uppercase tracking-widest">Attendance Recorded</p>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3 leading-none">Attendance Terminal <UserCheck className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Institutional Presence Registry</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Attendance
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* LEFT SIDEBAR: WING & STANDARD SELECTORS */}
        <div className="xl:col-span-3 space-y-6">
           {/* Calendar */}
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                 <button onClick={() => changeMonth(-1)} className="p-1.5 bg-white dark:bg-slate-900 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><ChevronLeft size={14}/></button>
                 <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                    {viewDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
                 </h3>
                 <button onClick={() => changeMonth(1)} className="p-1.5 bg-white dark:bg-slate-900 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><ChevronRight size={14}/></button>
              </div>
              <div className="p-4">
                 <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} />;
                      const dateStr = day.toLocaleDateString('en-CA');
                      const isSelected = selectedDate === dateStr;
                      const isToday = new Date().toLocaleDateString('en-CA') === dateStr;
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`aspect-square rounded-lg flex items-center justify-center transition-all border ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg z-10 scale-110' : 
                            isToday ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 font-black' : 
                            'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-500 text-[10px] font-bold hover:border-indigo-100'
                          }`}
                        >
                           {day.getDate()}
                        </button>
                      );
                    })}
                 </div>
              </div>
           </div>

           {/* Granular Selection */}
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
              {/* Medium Selection (Side-by-side) */}
              <div className="space-y-3">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Academic Medium</label>
                 <div className="flex gap-2">
                    {MEDIUMS.map(m => (
                      <button 
                        key={m}
                        onClick={() => setSelectedMedium(m)} 
                        className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase transition-all border ${selectedMedium === m ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}
                      >
                        {m.split(' ')[0]}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Standard Selection */}
              <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Select Class (Std)</label>
                 <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {ALL_CLASSES.map(cls => (
                      <button 
                        key={cls} 
                        onClick={() => setSelectedClass(cls)} 
                        className={`py-2.5 px-2 rounded-xl text-[8px] font-black uppercase transition-all border ${selectedClass === cls ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-indigo-100'}`}
                      >
                        {cls}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Section Selection */}
              <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 block">Assigned Section</label>
                 <div className="flex gap-1.5">
                    {ALL_SECTIONS.map(sec => (
                      <button key={sec} onClick={() => setSelectedSection(sec)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${selectedSection === sec ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-indigo-100'}`}>
                        {sec}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* RIGHT: MAIN TERMINAL (DUAL PANE) */}
        <div className="xl:col-span-9 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md"><LayoutGrid size={20} /></div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">{selectedClass}-{selectedSection}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedMedium} • {new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                 </div>
              </div>

              <div className="relative w-full sm:w-80 group">
                 <div className="relative">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" size={14} />
                    <input 
                      type="number" 
                      placeholder="ENTER ROLL NO TO MARK ABSENT..." 
                      value={absentRollInput}
                      onChange={e => setAbsentRollInput(e.target.value)}
                      onKeyDown={handleAbsentRollSubmit}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-12 pr-12 py-3.5 text-xs font-black text-slate-800 dark:text-white outline-none focus:border-rose-500 shadow-inner"
                    />
                    <CornerDownLeft className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[600px]">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                 <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Users className="text-emerald-600" size={18} />
                       <h4 className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-widest">Presence Pool</h4>
                    </div>
                    <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-[9px] font-black uppercase">{presentPool.length} Active</span>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2 bg-slate-50/30 dark:bg-slate-950/20">
                    {presentPool.length > 0 ? presentPool.map(student => (
                      <div key={student.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group transition-all hover:border-emerald-200">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm">{student.rollNo}</div>
                            <div>
                               <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px]">{student.fullName}</h5>
                               <p className="text-[8px] font-bold text-slate-400 uppercase">GR: {student.grNumber}</p>
                            </div>
                         </div>
                         <button 
                           onClick={() => handleStatusChange(student.id, 'ABSENT')}
                           className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                         >
                            <ArrowRight size={16} />
                         </button>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                         {isLoading ? <Loader2 size={32} className="animate-spin text-indigo-500" /> : (
                           <>
                             <CheckCircle2 size={40} className="mb-2" />
                             <p className="text-[10px] font-black uppercase tracking-widest text-center">Empty Pool for Class<br/>Register Students in Management</p>
                           </>
                         )}
                      </div>
                    )}
                 </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                 <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-rose-50/30 dark:bg-rose-950/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <UserX className="text-rose-600" size={18} />
                       <h4 className="text-xs font-black uppercase text-rose-700 dark:text-rose-400 tracking-widest">Absent Registry</h4>
                    </div>
                    <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full text-[9px] font-black uppercase">{absentRegistry.length} Registered</span>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2 bg-rose-50/10 dark:bg-rose-950/10">
                    {absentRegistry.length > 0 ? absentRegistry.map(student => (
                      <div key={student.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-md flex items-center justify-between group animate-in slide-in-from-left-4">
                         <div className="flex items-center gap-4">
                            <button 
                              onClick={() => handleStatusChange(student.id, 'PRESENT')}
                              className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            >
                               <ArrowLeft size={16} />
                            </button>
                            <div>
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/40 px-2 py-0.5 rounded">#{student.rollNo}</span>
                                  <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px]">{student.fullName}</h5>
                               </div>
                               <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Registry Sync Pending</p>
                            </div>
                         </div>
                         <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/40 text-rose-600 rounded-xl flex items-center justify-center font-black">X</div>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
                         <AlertCircle size={40} className="mb-2" />
                         <p className="text-[10px] font-black uppercase tracking-widest">Registry Empty</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
