
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student } from '../types';
import { db, supabase } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Calendar, Check, X, Search, Clock, Users, UserCheck, UserX, Save, 
  CheckCircle2, Loader2, CalendarDays, ChevronLeft, ChevronRight, 
  ArrowLeft, ArrowRight, Hash, Filter, RefreshCw, Zap, GraduationCap, LayoutGrid,
  Globe, BookOpen, Calendar as CalendarIcon, ListChecks, AlertTriangle,
  History, TrendingUp, AlertCircle
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

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('PRIMARY_GIRLS');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (isStudent) {
        // Fetch ALL records for this specific student
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', user.id)
          .order('date', { ascending: false });
        if (error) throw error;
        setStudentRecords(data || []);
      } else {
        // Teacher/Admin View: Fetch students and attendance for selected date
        const [studentData, attendanceData] = await Promise.all([
          db.students.getAll(),
          db.attendance.getByDate(selectedDate)
        ]);

        const mappedStudents = studentData.map((s: any) => ({
          id: s.id, fullName: s.full_name, name: s.full_name, grNumber: s.gr_number,
          class: s.class, section: s.section, rollNo: s.roll_no, gender: s.gender
        }));
        setStudents(mappedStudents as Student[]);

        const attendanceMap: Record<string, AttendanceStatus> = {};
        attendanceData.forEach((record: any) => {
          attendanceMap[record.student_id] = record.status as AttendanceStatus;
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
  }, [selectedDate, user.id]);

  const filteredStudents = useMemo(() => {
    if (isStudent) return [];
    const grades = CATEGORY_MAP[selectedCategory].grades;
    return students.filter(s => grades.includes(s.class));
  }, [students, selectedCategory, isStudent]);

  // Student specific stats
  const studentStats = useMemo(() => {
    if (!isStudent) return null;
    const present = studentRecords.filter(r => r.status === 'PRESENT').length;
    const absent = studentRecords.filter(r => r.status === 'ABSENT').length;
    const late = studentRecords.filter(r => r.status === 'LATE').length;
    return { total: studentRecords.length, present: present + late, absent };
  }, [studentRecords, isStudent]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (isStudent) return;
    setIsSaving(true);
    try {
      const records = filteredStudents.map(s => ({
        student_id: s.id,
        date: selectedDate,
        status: attendance[s.id] || 'NOT_MARKED',
        marked_by: user.name
      }));
      await db.attendance.bulkUpsert(records);
      await createAuditLog(user, 'CREATE', 'Attendance', `Marked attendance for ${CATEGORY_MAP[selectedCategory].label} on ${selectedDate}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert("Attendance Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (isStudent) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">Presence Diary <CalendarIcon className="text-indigo-600" /></h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Personalized attendance tracking records.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
        ) : (
          <div className="space-y-10">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-6 group hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[1.8rem] flex items-center justify-center group-hover:scale-110 transition-transform"><BookOpen size={32} /></div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
                   <h3 className="text-4xl font-black text-slate-900 dark:text-white">{studentStats?.total}</h3>
                </div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-[3rem] border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-6 group hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-white dark:bg-emerald-600 text-emerald-600 dark:text-white rounded-[1.8rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><UserCheck size={32} /></div>
                <div>
                   <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Present Count</p>
                   <h3 className="text-4xl font-black text-emerald-800 dark:text-emerald-100">{studentStats?.present}</h3>
                </div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 p-8 rounded-[3rem] border border-rose-100 dark:border-rose-800/50 flex items-center gap-6 group hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-white dark:bg-rose-600 text-rose-600 dark:text-white rounded-[1.8rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><UserX size={32} /></div>
                <div>
                   <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Absent Count</p>
                   <h3 className="text-4xl font-black text-rose-800 dark:text-rose-100">{studentStats?.absent}</h3>
                </div>
              </div>
            </div>

            {/* List of Absences */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="bg-white dark:bg-slate-900 rounded-[4rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
                  <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between">
                     <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <AlertTriangle className="text-rose-500" /> Absence Ledger
                     </h3>
                     <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-200 dark:border-rose-800">{studentStats?.absent} Dates</span>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[600px] p-8 space-y-4 custom-scrollbar">
                     {studentRecords.filter(r => r.status === 'ABSENT').length > 0 ? (
                       studentRecords.filter(r => r.status === 'ABSENT').map(record => (
                         <div key={record.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] flex items-center justify-between group border border-transparent hover:border-rose-200 transition-all">
                            <div className="flex items-center gap-5">
                               <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl flex items-center justify-center font-black"><CalendarIcon size={20} /></div>
                               <div>
                                  <p className="font-black text-slate-800 dark:text-white text-base uppercase">{new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Marked By: {record.marked_by || 'Registrar'}</p>
                               </div>
                            </div>
                            <span className="px-4 py-2 bg-rose-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg shadow-rose-200 dark:shadow-none">ABSENT</span>
                         </div>
                       ))
                     ) : (
                       <div className="py-20 text-center opacity-30">
                          <CheckCircle2 size={64} className="mx-auto mb-6 text-emerald-500" />
                          <h4 className="text-xl font-black uppercase tracking-widest">Perfect Attendance</h4>
                          <p className="text-xs mt-2 uppercase font-bold">Zero absence records found in cloud vault.</p>
                       </div>
                     )}
                  </div>
               </div>

               {/* Full History Timeline */}
               <div className="bg-slate-900 rounded-[4rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                  <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 mb-10"><History className="text-indigo-400" /> Recent Timeline</h3>
                  <div className="space-y-6 relative z-10 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                     {studentRecords.slice(0, 15).map(record => (
                       <div key={record.id} className="flex items-start gap-5 group/item">
                          <div className="pt-1">
                             <div className={`w-3 h-3 rounded-full border-2 border-white ${record.status === 'PRESENT' ? 'bg-emerald-500' : 'bg-rose-500'} transition-transform group-hover/item:scale-150 shadow-[0_0_10px_rgba(255,255,255,0.3)]`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center justify-between mb-1">
                                <p className="font-black text-sm uppercase tracking-tight">{new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })}</p>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${record.status === 'PRESENT' ? 'text-emerald-400' : 'text-rose-400'}`}>{record.status}</span>
                             </div>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Registry Sync • {record.status === 'PRESENT' ? 'Verified Entry' : 'Manual Exception'}</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Attendance Synced</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Cloud Records Updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">Attendance Terminal <UserCheck className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Real-time presence tracking synced across campus.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center gap-3 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Sync All
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {(Object.keys(CATEGORY_MAP) as CategoryKey[]).map(key => (
            <button 
              key={key} 
              onClick={() => setSelectedCategory(key)}
              className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === key ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
            >
              {CATEGORY_MAP[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center animate-pulse">
            <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
            <p className="font-black text-xs uppercase tracking-widest text-slate-400">Accessing Attendance Cloud...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-10 py-6 text-left">Student Profile</th>
                  <th className="px-8 py-6 text-left">Identity Details</th>
                  <th className="px-8 py-6 text-center">Status Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border border-indigo-100 dark:border-indigo-800">
                          {student.rollNo || student.fullName.charAt(0)}
                        </div>
                        <p className="font-black text-slate-800 dark:text-white text-sm uppercase">{student.fullName}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">GR: {student.grNumber}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Std {student.class}-{student.section}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2">
                        {(['PRESENT', 'ABSENT', 'LATE'] as AttendanceStatus[]).map(status => (
                          <button 
                            key={status}
                            onClick={() => handleStatusChange(student.id, status)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                              attendance[student.id] === status 
                                ? status === 'PRESENT' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' 
                                : status === 'ABSENT' ? 'bg-rose-600 border-rose-600 text-white shadow-lg'
                                : 'bg-amber-50 border-amber-50 text-white shadow-lg'
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
