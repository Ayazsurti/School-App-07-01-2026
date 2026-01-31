
import React, { useState, useMemo, useEffect } from 'react';
import { User, Teacher } from '../types';
import { db, supabase, getErrorMessage } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Briefcase, Check, X, Clock, UserCheck, Save, 
  CheckCircle2, Loader2, ChevronLeft, ChevronRight, 
  ArrowLeft, Search, Users, Info, RefreshCw, AlertCircle
} from 'lucide-react';

interface TeacherAttendanceProps { user: User; }
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

const TeacherAttendance: React.FC<TeacherAttendanceProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [viewDate, setViewDate] = useState(new Date());
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRegistry = async () => {
    setIsLoading(true);
    try {
      const [teacherData, attendanceData] = await Promise.all([
        db.teachers.getAll(),
        db.teacherAttendance.getByDate(selectedDate)
      ]);
      
      const activeTeachers = (teacherData || []).filter((t: any) => t.status !== 'INACTIVE' && t.status !== 'BLOCKED');
      setTeachers(activeTeachers as any);
      
      const attendanceMap: Record<string, AttendanceStatus> = {};
      attendanceData.forEach((record: any) => { 
        attendanceMap[record.teacher_id] = record.status as AttendanceStatus; 
      });
      
      // Default unset teachers to PRESENT
      activeTeachers.forEach((t: any) => { 
        if (!attendanceMap[t.id]) attendanceMap[t.id] = 'PRESENT'; 
      });
      
      setAttendance(attendanceMap);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, [selectedDate]);

  const handleStatusChange = (teacherId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [teacherId]: status }));
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      const records = teachers.map(t => ({ 
        teacher_id: t.id, 
        date: selectedDate, 
        status: attendance[t.id] || 'PRESENT', 
        marked_by: user.name
      }));
      
      await db.teacherAttendance.bulkUpsert(records);
      await createAuditLog(user, 'UPDATE', 'Faculty', `Synced Teacher Presence for ${selectedDate}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert("Sync failed: " + getErrorMessage(err));
    } finally { 
      setIsSaving(false); 
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => 
      (t.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.staffId || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teachers, searchQuery]);

  const stats = useMemo(() => {
    const total = teachers.length;
    const present = Object.values(attendance).filter(v => v === 'PRESENT').length;
    const leaves = Object.values(attendance).filter(v => v === 'LEAVE' || v === 'ABSENT').length;
    return { total, present, leaves };
  }, [teachers, attendance]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative text-slate-950">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={20} strokeWidth={3} />
              <p className="font-black text-[10px] uppercase tracking-widest">Faculty Presence Synced</p>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3 leading-none">Teacher Attendance <Briefcase className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-3">Institutional Presence Registry</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700">
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)} 
                className="bg-transparent font-black text-xs uppercase text-indigo-600 dark:text-indigo-400 px-4 py-2 outline-none"
              />
           </div>
           <button onClick={handleSave} disabled={isSaving} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
             {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Sync Cloud
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 sm:px-0">
         <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl flex items-center gap-6">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm"><Users size={28}/></div>
            <div>
               <p className="text-[10px] font-black uppercase opacity-60">Total Faculty</p>
               <h3 className="text-3xl font-black">{stats.total} Nodes</h3>
            </div>
         </div>
         <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-8 rounded-[3rem] flex items-center gap-6 shadow-sm">
            <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Check size={28}/></div>
            <div>
               <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">On Duty</p>
               <h3 className="text-3xl font-black text-emerald-800 dark:text-emerald-300">{stats.present} Presence</h3>
            </div>
         </div>
         <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 p-8 rounded-[3rem] flex items-center gap-6 shadow-sm">
            <div className="w-14 h-14 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><X size={28}/></div>
            <div>
               <p className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">Absent / Leave</p>
               <h3 className="text-3xl font-black text-rose-800 dark:text-rose-300">{stats.leaves} Nodes</h3>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mx-4 sm:mx-0">
         <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
               <input 
                type="text" 
                placeholder="SEARCH FACULTY IDENTITY..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-black uppercase text-xs outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
               />
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                     <th className="px-10 py-6">Faculty Profile</th>
                     <th className="px-8 py-6">Staff ID</th>
                     <th className="px-8 py-6">Presence State</th>
                     <th className="px-10 py-6 text-right">Commit Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                       <td colSpan={4} className="py-40 text-center"><Loader2 size={32} className="animate-spin text-indigo-600 mx-auto" /></td>
                    </tr>
                  ) : filteredTeachers.map(teacher => (
                    <tr key={teacher.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                       <td className="px-10 py-8">
                          <div className="flex items-center gap-5">
                             <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl overflow-hidden shadow-inner border border-indigo-100 dark:border-indigo-800 group-hover:scale-105 transition-transform">
                                {teacher.profileImage ? <img src={teacher.profileImage} className="w-full h-full object-cover" /> : teacher.fullName?.charAt(0)}
                             </div>
                             <div>
                                <p className="font-black text-slate-800 dark:text-white uppercase leading-none">{teacher.fullName}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{teacher.assignedRole?.replace('_', ' ')}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-8 font-black text-slate-400 text-xs uppercase tracking-widest">{teacher.staffId}</td>
                       <td className="px-8 py-8">
                          <div className="flex gap-1">
                             {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as const).map(status => (
                               <button 
                                key={status}
                                onClick={() => handleStatusChange(teacher.id, status)}
                                className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${attendance[teacher.id] === status ? 
                                  (status === 'PRESENT' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 
                                   status === 'ABSENT' ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 
                                   status === 'HALF_DAY' ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 
                                   'bg-indigo-600 border-indigo-600 text-white shadow-lg') : 
                                  'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:bg-slate-50'}`}
                               >
                                  {status.replace('_', ' ')}
                               </button>
                             ))}
                          </div>
                       </td>
                       <td className="px-10 py-8 text-right">
                          <div className={`inline-flex items-center gap-2 font-black text-[9px] uppercase tracking-widest ${attendance[teacher.id] === 'PRESENT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {attendance[teacher.id] === 'PRESENT' ? <CheckCircle2 size={14}/> : <Clock size={14}/>}
                             {attendance[teacher.id]}
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default TeacherAttendance;
