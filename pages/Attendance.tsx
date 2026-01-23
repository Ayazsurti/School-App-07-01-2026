
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student } from '../types';
import { db, supabase } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Calendar as CalendarIcon, Check, X, Clock, UserCheck, Save, 
  CheckCircle2, Loader2, ChevronLeft, ChevronRight, 
  ArrowLeft, ArrowRight, RefreshCcw, LayoutGrid,
  ShieldCheck, AlertCircle, Hash, Zap, CornerDownLeft, Users, UserX, ChevronDown, Layers, Globe,
  Info, Square, CheckSquare
} from 'lucide-react';

interface AttendanceProps { user: User; }
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'NOT_MARKED';

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];

// Added missing Attendance component and default export
const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const [selectedClass, setSelectedClass] = useState('1 - GIRLS');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [studentData, attendanceData] = await Promise.all([
        db.students.getAll(),
        db.attendance.getByDate(selectedDate)
      ]);

      const filteredStudents = studentData.filter((s: any) => s.class === selectedClass && s.section === selectedSection);
      setStudents(filteredStudents as any);

      const attendanceMap: Record<string, AttendanceStatus> = {};
      filteredStudents.forEach((s: any) => {
        const record = attendanceData.find((a: any) => a.student_id === s.id);
        attendanceMap[s.id] = record ? record.status : 'NOT_MARKED';
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
  }, [selectedClass, selectedSection, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const records = Object.entries(attendance)
        .filter(([_, status]) => status !== 'NOT_MARKED')
        .map(([studentId, status]) => ({
          student_id: studentId,
          date: selectedDate,
          status,
          marked_by: user.name
        }));

      await db.attendance.bulkUpsert(records);
      await createAuditLog(user, 'UPDATE', 'Attendance', `Marked attendance for Std ${selectedClass}-${selectedSection} on ${selectedDate}`);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert("Failed to sync attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(() => {
    const total = students.length;
    const present = Object.values(attendance).filter(s => s === 'PRESENT').length;
    const absent = Object.values(attendance).filter(s => s === 'ABSENT').length;
    const unmarked = total - (present + absent);
    return { total, present, absent, unmarked };
  }, [students, attendance]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
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
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Attendance Terminal</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-2 uppercase tracking-tight">Real-time daily presence registry.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving || students.length === 0}
          className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center gap-3 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
          Sync Attendance
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8">
         <div className="flex-1 w-full space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Configuration Scope</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase ml-1">Select Grade</span>
                  <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl px-4 py-3 font-bold uppercase text-xs">
                     {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
               <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase ml-1">Select Section</span>
                  <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl px-4 py-3 font-bold uppercase text-xs">
                     <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
               </div>
               <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase ml-1">Date Registry</span>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl px-4 py-3 font-bold text-xs" />
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner"><Users size={24}/></div>
            <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Strength</p>
               <h4 className="text-3xl font-black text-slate-900 dark:text-white">{stats.total}</h4>
            </div>
         </div>
         <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-5">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><UserCheck size={24}/></div>
            <div>
               <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Present Pool</p>
               <h4 className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{stats.present}</h4>
            </div>
         </div>
         <div className="bg-rose-50 dark:bg-rose-950/20 p-8 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/50 flex items-center gap-5">
            <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><UserX size={24}/></div>
            <div>
               <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Absent Registry</p>
               <h4 className="text-3xl font-black text-rose-700 dark:text-rose-400">{stats.absent}</h4>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
         {isLoading ? (
           <div className="py-40 flex flex-col items-center justify-center animate-pulse">
              <Loader2 size={64} className="animate-spin text-indigo-600" />
              <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pinging Registry Cloud...</p>
           </div>
         ) : students.length > 0 ? (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                       <th className="px-10 py-6">Student Identity</th>
                       <th className="px-10 py-6 text-center">Identity Verification</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {students.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group">
                         <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center text-slate-400 font-black border border-slate-200 dark:border-slate-700">
                                  {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" /> : student.fullName.charAt(0)}
                               </div>
                               <div>
                                  <p className="font-black text-slate-800 dark:text-white text-base uppercase leading-tight">{student.fullName}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Roll No: {student.rollNo} • GR: {student.grNumber}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-10 py-6">
                            <div className="flex items-center justify-center gap-3">
                               <button 
                                onClick={() => handleStatusChange(student.id, 'PRESENT')}
                                className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${attendance[student.id] === 'PRESENT' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 hover:bg-emerald-50'}`}
                               >
                                  Present
                               </button>
                               <button 
                                onClick={() => handleStatusChange(student.id, 'ABSENT')}
                                className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${attendance[student.id] === 'ABSENT' ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-900/30 text-rose-600 hover:bg-rose-50'}`}
                               >
                                  Absent
                               </button>
                               <button 
                                onClick={() => handleStatusChange(student.id, 'NOT_MARKED')}
                                className={`p-3 rounded-xl border transition-all ${attendance[student.id] === 'NOT_MARKED' ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-300 border-slate-100 hover:text-rose-500'}`}
                                title="Reset"
                               >
                                  <RefreshCcw size={16} className={attendance[student.id] === 'NOT_MARKED' ? 'animate-spin-slow' : ''} />
                               </button>
                            </div>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
         ) : (
           <div className="py-40 text-center flex flex-col items-center justify-center">
              <Users size={64} className="text-slate-100 dark:text-slate-800 mb-6" />
              <h3 className="text-2xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter leading-none">No active enrollments in scope</h3>
              <p className="text-slate-400 font-bold uppercase text-xs mt-3 tracking-widest">Verify class and section parameters.</p>
           </div>
         )}
      </div>

      <div className="p-8 bg-indigo-50 dark:bg-indigo-950/20 rounded-[3rem] border border-indigo-100 dark:border-indigo-800 flex items-start gap-4">
         <Info size={24} className="text-indigo-400 shrink-0 mt-0.5" />
         <div className="space-y-1">
            <p className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-tight">Institutional Compliance</p>
            <p className="text-[10px] font-bold text-indigo-700/60 dark:text-indigo-400/60 leading-relaxed uppercase">Attendance data is synchronized with the central cloud node. Parents are notified via SMS broadcast once the daily registry is committed.</p>
         </div>
      </div>
    </div>
  );
};

export default Attendance;
