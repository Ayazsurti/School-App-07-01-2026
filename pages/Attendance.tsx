
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student } from '../types';
import { db, supabase, getErrorMessage } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Calendar as CalendarIcon, Check, X, Clock, UserCheck, Save, 
  CheckCircle2, Loader2, ChevronLeft, ChevronRight, 
  ChevronDown,
  ArrowLeft, ArrowRight, LayoutGrid,
  AlertCircle, Zap, CornerDownLeft, Plus, Trash2, Edit3,
  Square, CheckSquare, Layers, Users, Info, RefreshCw
} from 'lucide-react';

interface AttendanceProps { user: User; }
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];

/**
 * Attendance component for marking daily presence of students.
 * Supports class-wise filtering and historical record viewing.
 */
const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  // Fix: Default to user's assigned class if available, otherwise first class in list
  const [selectedClass, setSelectedClass] = useState(user.class || ALL_CLASSES[0]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch student and attendance data from Supabase
  const fetchAttendanceData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Students for the selected class
      const studentData = await db.students.getAll();
      const classStudents = studentData.filter((s: any) => s.class === selectedClass).map((s: any) => ({
        id: s.id,
        fullName: s.full_name,
        rollNo: s.roll_no,
        grNumber: s.gr_number,
        class: s.class,
        section: s.section
      }));
      setStudents(classStudents as any);

      // 2. Fetch existing attendance records for the selected date
      const records = await db.attendance.getByDate(selectedDate);
      const attendanceMap: Record<string, AttendanceStatus> = {};
      records.forEach((r: any) => {
        // We only care about records for the current class in focus
        const isStudentInClass = classStudents.some(s => s.id === r.student_id);
        if (isStudentInClass) {
          attendanceMap[r.student_id] = r.status as AttendanceStatus;
        }
      });
      setAttendance(attendanceMap);
    } catch (err) {
      console.error("Attendance Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    // Real-time synchronization for attendance updates
    const channel = supabase.channel('realtime-attendance-v1')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        setIsSyncing(true);
        fetchAttendanceData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedClass, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        date: selectedDate,
        status: attendance[s.id] || 'ABSENT', // Default to absent if not marked
        marked_by: user.name,
        class: selectedClass
      }));

      await db.attendance.bulkUpsert(records);
      await createAuditLog(user, 'UPDATE', 'Attendance', `Marked attendance for ${selectedClass} on ${selectedDate}`);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      alert(`Save failed: ${getErrorMessage(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(() => {
    const total = students.length;
    const present = students.filter(s => attendance[s.id] === 'PRESENT').length;
    const absent = students.filter(s => attendance[s.id] === 'ABSENT').length;
    const leave = students.filter(s => attendance[s.id] === 'LEAVE').length;
    const late = students.filter(s => attendance[s.id] === 'LATE').length;
    return { total, present, absent, leave, late };
  }, [students, attendance]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Syncing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Attendance Synced</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Cloud Ledger Updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Attendance Node <UserCheck className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional presence tracking and daily reporting terminal.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving || students.length === 0} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Sync All Changes
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8 no-print">
          <div className="flex-1 w-full space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Grade</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner uppercase text-sm">
                {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
          </div>
          <div className="flex-1 w-full space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registry Date</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
          </div>
          <div className="flex-1 w-full flex justify-around items-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
             <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">Present</p>
                <p className="text-xl font-black text-emerald-600">{stats.present}</p>
             </div>
             <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
             <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">Absent</p>
                <p className="text-xl font-black text-rose-600">{stats.absent}</p>
             </div>
             <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
             <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">Total</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</p>
             </div>
          </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-10 py-6 text-left">Roll</th>
                  <th className="px-8 py-6 text-left">Student Profile</th>
                  <th className="px-8 py-6 text-center">Identity Trace</th>
                  <th className="px-10 py-6 text-right">Status Terminal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-10 py-8">
                       <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black text-sm border border-indigo-100 dark:border-indigo-800">
                         {student.rollNo || '-'}
                       </div>
                    </td>
                    <td className="px-8 py-8">
                       <p className="font-black text-slate-800 dark:text-white text-base uppercase leading-tight">{student.fullName}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">GR: {student.grNumber}</p>
                    </td>
                    <td className="px-8 py-8 text-center">
                       <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{student.class}-{student.section}</p>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex justify-end gap-3">
                          {[
                            { status: 'PRESENT', label: 'P', color: 'bg-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' },
                            { status: 'ABSENT', label: 'A', color: 'bg-rose-600', light: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600' },
                            { status: 'LATE', label: 'L', color: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' },
                            { status: 'LEAVE', label: 'V', color: 'bg-sky-500', light: 'bg-sky-50 dark:bg-sky-950/20 text-sky-600' }
                          ].map(item => (
                            <button 
                              key={item.status}
                              onClick={() => handleStatusChange(student.id, item.status as any)}
                              className={`w-12 h-12 rounded-2xl font-black transition-all flex items-center justify-center text-sm shadow-sm ${attendance[student.id] === item.status ? `${item.color} text-white shadow-lg scale-110 ring-4 ring-white dark:ring-slate-800` : `${item.light} opacity-40 hover:opacity-100`}`}
                            >
                               {item.label}
                            </button>
                          ))}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-40 text-center opacity-30 flex flex-col items-center">
             <Users size={64} className="mb-6" />
             <p className="font-black text-sm uppercase tracking-[0.4em]">Class registry empty</p>
          </div>
        )}
      </div>

      <div className="p-10 bg-indigo-50 dark:bg-indigo-900/10 rounded-[3.5rem] border border-indigo-100 dark:border-indigo-800 flex items-start gap-6">
         <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0 border border-indigo-50 dark:border-indigo-700">
            <Info size={28} />
         </div>
         <div className="space-y-2">
            <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-widest">Protocol Intelligence</h4>
            <p className="text-[11px] font-bold text-indigo-700/60 dark:text-indigo-400/60 leading-relaxed uppercase tracking-wider">
               Manual attendance marking updates the cloud identity node in real-time. Parents receive push updates via institutional data links once records are synchronized. High-fidelity logging enabled for auditing.
            </p>
         </div>
      </div>
    </div>
  );
};

export default Attendance;
