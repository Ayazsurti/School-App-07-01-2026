import React, { useState, useMemo, useEffect } from 'react';
import { User, Student } from '../types';
import { db, supabase, getErrorMessage } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Calendar as CalendarIcon, Check, X, Clock, UserCheck, Save, 
  CheckCircle2, Loader2, ChevronLeft, ChevronRight, 
  ChevronDown,
  ArrowLeft, ArrowRight, LayoutGrid,
  AlertCircle, Zap, CornerDownLeft, Umbrella, Plus, Trash2, Edit3,
  Square, CheckSquare, Layers, Users, Info, Search, Target
} from 'lucide-react';

interface AttendanceProps { user: User; }
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'NOT_MARKED';
type HolidayType = 'PUBLIC' | 'WEEK_OFF' | 'OTHER';

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];

const SECTIONS = ['A', 'B', 'C', 'D'];
const MEDIUMS = ['ENGLISH MEDIUM'];
const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const HOLIDAY_RANGES = [
  '1 to 8 girls', '9 to 10 girls', '11 to 12 girls',
  '1 to 8 boys', '9 to 10 boys', '11 to 12 boys'
];

const isClassInHolidayRange = (cls: string, range: string) => {
  if (range === 'ALL') return true;
  const clsLower = cls.toLowerCase();
  const rangeLower = range.toLowerCase();
  const isGirls = clsLower.includes('girls');
  const isBoys = clsLower.includes('boys');
  const rangeIsGirls = rangeLower.includes('girls');
  const rangeIsBoys = rangeLower.includes('boys');
  if (isGirls && !rangeIsGirls) return false;
  if (isBoys && !rangeIsBoys) return false;
  const classNumMatch = cls.match(/\d+/);
  if (!classNumMatch) return false;
  const classNum = parseInt(classNumMatch[0]);
  if (rangeLower.includes('1 to 8')) return classNum >= 1 && classNum <= 8;
  if (rangeLower.includes('9 to 10')) return classNum >= 9 && classNum <= 10;
  if (rangeLower.includes('11 to 12')) return classNum >= 11 && classNum <= 12;
  return false;
};

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const isTeacher = user.role === 'TEACHER';
  const isAdmin = user.role === 'ADMIN';
  
  const authorizedClasses = useMemo(() => {
    if (user.role === 'ADMIN') return ALL_CLASSES;
    const teacherClasses = (user as any).classes || (user.class ? [user.class] : []);
    return ALL_CLASSES.filter(c => teacherClasses.includes(c));
  }, [user]);

  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedMedium, setSelectedMedium] = useState(MEDIUMS[0]);
  const [selectedClass, setSelectedClass] = useState(authorizedClasses[0] || ALL_CLASSES[0]);
  const [selectedSection, setSelectedSection] = useState(isTeacher && user.section ? user.section : 'A');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [recordIds, setRecordIds] = useState<Record<string, string>>({}); 
  const [monthlyMarkedDates, setMonthlyMarkedDates] = useState<Set<string>>(new Set());
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quickAbsentInput, setQuickAbsentInput] = useState('');

  const [holidayReason, setHolidayReason] = useState('');
  const [holidayStartDate, setHolidayStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidayEndDate, setHolidayEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidayType, setHolidayType] = useState<HolidayType>('PUBLIC');
  const [holidayTargetClass, setHolidayTargetClass] = useState<string>('ALL');
  const [selectedHolidaysForDeletion, setSelectedHolidaysForDeletion] = useState<number[]>([]);
  const [editingHolidayId, setEditingHolidayId] = useState<number | null>(null);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) { days.push(null); }
    for (let i = 1; i <= daysInMonth; i++) { days.push(new Date(year, month, i)); }
    return days;
  }, [viewDate]);

  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('key', 'institutional_holidays').single();
      if (!error && data) { setHolidays(JSON.parse(data.value || '[]')); }
    } catch (e) {}
  };

  const fetchMonthlyStatus = async () => {
    try {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      const { data, error } = await supabase.from('attendance').select('date').gte('date', startDate).lte('date', endDate);
      if (!error && data) { setMonthlyMarkedDates(new Set<string>(data.map((item: any) => String(item.date)))); }
    } catch (e) {}
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [studentData, attendanceData] = await Promise.all([db.students.getAll(), db.attendance.getByDate(selectedDate)]);
      const mappedStudents = (studentData || []).map((s: any) => ({
        id: s.id, fullName: s.full_name, name: s.full_name, grNumber: s.gr_number, class: s.class, section: s.section, rollNo: s.roll_no, gender: s.gender, medium: s.medium, status: s.status
      }));
      const activeStudents = mappedStudents.filter(s => s.status !== 'CANCELLED');
      setStudents(activeStudents as any);
      const attendanceMap: Record<string, AttendanceStatus> = {};
      const idMap: Record<string, string> = {};
      attendanceData.forEach((record: any) => { attendanceMap[record.student_id] = record.status as AttendanceStatus; idMap[record.student_id] = record.id; });
      const currentSet = activeStudents.filter((s: any) => s.class === selectedClass && s.section === selectedSection && s.medium === selectedMedium);
      currentSet.forEach((s: any) => { if (!attendanceMap[s.id]) attendanceMap[s.id] = 'PRESENT'; });
      setAttendance(attendanceMap);
      setRecordIds(idMap);
      fetchMonthlyStatus();
      fetchHolidays();
    } catch (err) {} finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime-attendance-v37')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        setIsSyncing(true);
        fetchData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.institutional_holidays' }, () => { fetchHolidays(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, user.id, selectedClass, selectedSection, selectedMedium, viewDate]);

  const isHoliday = useMemo(() => {
    return holidays.some(h => {
      const dateMatch = selectedDate >= h.startDate && selectedDate <= h.endDate;
      const classMatch = isClassInHolidayRange(selectedClass, h.targetClass);
      return dateMatch && classMatch;
    });
  }, [holidays, selectedDate, selectedClass]);

  const currentHoliday = useMemo(() => {
    return holidays.find(h => {
      const dateMatch = selectedDate >= h.startDate && selectedDate <= h.endDate;
      const classMatch = isClassInHolidayRange(selectedClass, h.targetClass);
      return dateMatch && classMatch;
    });
  }, [holidays, selectedDate, selectedClass]);

  const baseList = useMemo(() => students.filter(s => s.class === selectedClass && s.section === selectedSection && s.medium === selectedMedium).sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0)), [students, selectedClass, selectedSection, selectedMedium]);
  const { presentPool, absentRegistry } = useMemo(() => isStudent ? { presentPool: [], absentRegistry: [] } : { presentPool: baseList.filter(s => attendance[s.id] !== 'ABSENT'), absentRegistry: baseList.filter(s => attendance[s.id] === 'ABSENT') }, [baseList, attendance, isStudent]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => setAttendance(prev => ({ ...prev, [studentId]: prev[studentId] === status ? (status === 'PRESENT' ? 'ABSENT' : 'PRESENT') : status }));

  const handleQuickAbsent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAbsentInput.trim() || isHoliday) return;
    
    const target = presentPool.find(s => 
      s.rollNo === quickAbsentInput.trim() || 
      s.fullName.toLowerCase().includes(quickAbsentInput.toLowerCase())
    );
    
    if (target) {
      handleStatusChange(target.id, 'ABSENT');
      setQuickAbsentInput('');
    } else {
      alert("Student not found in the current presence pool.");
    }
  };

  const handleSave = async () => {
    setShowConfirmModal(false);
    if (isStudent) return;
    setIsSaving(true);
    try {
      const records = baseList.map(s => ({ student_id: s.id, date: selectedDate, status: attendance[s.id] || 'PRESENT', marked_by: user.name, ...(recordIds[s.id] ? { id: recordIds[s.id] } : {}) }));
      const savedData = await db.attendance.bulkUpsert(records);
      const nextIds = { ...recordIds };
      savedData?.forEach((r: any) => { nextIds[r.student_id] = r.id; });
      setRecordIds(nextIds);
      await createAuditLog(user, 'UPDATE', 'Attendance', `Synced: ${selectedClass} on ${selectedDate}`);
      setMonthlyMarkedDates(prev => new Set(prev).add(selectedDate));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {} finally { setIsSaving(false); }
  };

  const addOrUpdateHoliday = async () => {
    if (!holidayReason.trim()) return;
    setIsSyncing(true);
    try {
      let nextHolidays;
      const payload = { id: editingHolidayId || Date.now(), reason: holidayReason.toUpperCase(), startDate: holidayStartDate, endDate: holidayEndDate, type: holidayType, targetClass: holidayTargetClass, targetSection: 'ALL' };
      if (editingHolidayId) { nextHolidays = holidays.map(h => h.id === editingHolidayId ? payload : h); } 
      else { nextHolidays = [...holidays, payload]; }
      await db.settings.update('institutional_holidays', JSON.stringify(nextHolidays));
      setHolidays(nextHolidays);
      resetHolidayForm();
    } catch (e) {} finally { setIsSyncing(false); }
  };

  const executeDeleteHolidays = async () => {
    if (selectedHolidaysForDeletion.length === 0) return;
    setIsSyncing(true);
    try {
      const nextHolidays = holidays.filter(h => !selectedHolidaysForDeletion.includes(h.id));
      await db.settings.update('institutional_holidays', JSON.stringify(nextHolidays));
      setHolidays(nextHolidays);
      setSelectedHolidaysForDeletion([]);
      setShowDeleteConfirm(false);
    } catch (e) {} finally { setIsSyncing(false); }
  };

  const resetHolidayForm = () => {
    setHolidayReason(''); setHolidayStartDate(new Date().toISOString().split('T')[0]);
    setHolidayEndDate(new Date().toISOString().split('T')[0]); setHolidayType('PUBLIC');
    setHolidayTargetClass('ALL'); setEditingHolidayId(null); setSelectedHolidaysForDeletion([]);
  };

  const getRangeDisplay = (start: string, end: string) => {
    const s = new Date(start).getDate(); const e = new Date(end).getDate();
    return s === e ? `${s}` : `${s} - ${e}`;
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative text-slate-950">
      {/* SUCCESS POPUP */}
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={20} strokeWidth={3} />
              <p className="font-black text-[10px] uppercase tracking-widest">Recorded Successfully</p>
           </div>
        </div>
      )}

      {/* HOLIDAY MODAL & DELETE CONFIRMATION (Same as previous implementation) */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-[440px] w-full border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[95vh]">
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-indigo-50 dark:bg-indigo-900/10 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <Umbrella size={24} className="text-indigo-600" />
                    <div>
                       <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Holiday Profile</h3>
                       <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Grouped Academic Range Setup</p>
                    </div>
                 </div>
                 <button onClick={() => setShowHolidayModal(false)} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all text-slate-400"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                 <div className="space-y-4">
                    <label className="text-[8px] font-black text-slate-950 dark:text-white uppercase tracking-widest ml-1 block">Target Academic Node Range</label>
                    <div className="flex flex-wrap gap-2">
                       {HOLIDAY_RANGES.map(cls => (
                          <button key={cls} onClick={() => setHolidayTargetClass(cls === holidayTargetClass ? 'ALL' : cls)} className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all flex-1 min-w-[150px] ${holidayTargetClass === cls ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`}>
                             {holidayTargetClass === cls ? <CheckSquare size={14} strokeWidth={3} /> : <Square size={14} />}
                             <span className="text-[9px] font-black uppercase whitespace-nowrap">{cls}</span>
                          </button>
                       ))}
                       <button onClick={() => setHolidayTargetClass('ALL')} className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all flex-1 min-w-[150px] ${holidayTargetClass === 'ALL' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`}>
                          {holidayTargetClass === 'ALL' ? <CheckSquare size={14} strokeWidth={3} /> : <Square size={14} />}
                          <span className="text-[9px] font-black uppercase whitespace-nowrap">Global (All)</span>
                       </button>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-950 dark:text-white uppercase tracking-widest ml-1">Start</label>
                       <input type="date" value={holidayStartDate} onChange={e => setHolidayStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-black text-xs outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-950 dark:text-white uppercase tracking-widest ml-1">End</label>
                       <input type="date" value={holidayEndDate} onChange={e => setHolidayEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-black text-xs outline-none" />
                    </div>
                 </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    <div className="flex items-center justify-between mb-4">
                       <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth()-1)))} className="p-1 hover:bg-white rounded text-slate-400"><ChevronLeft size={16}/></button>
                       <h4 className="text-[9px] font-black uppercase tracking-widest">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                       <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth()+1)))} className="p-1 hover:bg-white rounded text-slate-400"><ChevronRight size={16}/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                       {WEEKDAYS.map(d => <div key={d} className="text-center"><span className="text-[7px] font-black uppercase">{d.charAt(0)}</span></div>)}
                       {calendarDays.map((day, idx) => {
                          if (!day) return <div key={idx} />;
                          const dStr = day.toISOString().split('T')[0];
                          const isInRange = dStr >= holidayStartDate && dStr <= holidayEndDate;
                          return <div key={dStr} className={`aspect-square rounded-md flex items-center justify-center text-[8px] font-black transition-all ${isInRange ? 'bg-indigo-600 text-white' : 'opacity-20'}`}>{day.getDate()}</div>;
                       })}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-950 dark:text-white uppercase tracking-widest ml-1">Reason</label>
                    <textarea value={holidayReason} onChange={e => setHolidayReason(e.target.value)} placeholder="..." className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-black uppercase text-[10px] outline-none h-16" />
                 </div>
                 <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100">
                    <button onClick={resetHolidayForm} className="py-3 bg-slate-100 text-slate-950 font-black rounded-xl text-[8px] uppercase tracking-widest transition-all">Add</button>
                    <button onClick={addOrUpdateHoliday} disabled={!holidayReason.trim()} className="col-span-2 py-3 bg-indigo-600 text-white font-black rounded-xl text-[8px] uppercase tracking-widest shadow-lg">Sync Entry</button>
                    <button onClick={() => setShowDeleteConfirm(true)} disabled={selectedHolidaysForDeletion.length === 0} className={`py-3 rounded-xl font-black uppercase text-[8px] ${selectedHolidaysForDeletion.length > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-300'}`}><Trash2 size={12}/></button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto"><AlertCircle size={32} /></div>
              <h3 className="text-xl font-black mb-2 uppercase">Purge Data?</h3>
              <p className="text-slate-500 mb-8 text-[10px] uppercase tracking-widest leading-relaxed">Delete {selectedHolidaysForDeletion.length} selected entries permanently?</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowDeleteConfirm(false)} className="py-4 bg-slate-100 rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={executeDeleteHolidays} className="py-4 bg-rose-600 text-white font-black rounded-2xl uppercase text-[10px]">Purge</button>
              </div>
           </div>
        </div>
      )}

      {/* MAIN HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print px-4 sm:px-0">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3 leading-none">Attendance Node <UserCheck className="text-indigo-600" /></h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Centralized Registry Uplink</p>
          </div>
          {isAdmin && (
            <button onClick={() => { resetHolidayForm(); setShowHolidayModal(true); }} className="px-6 py-3.5 bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-900 rounded-2xl text-indigo-600 dark:text-indigo-400 font-black text-[9px] uppercase tracking-[0.2em] shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-3">
               <Umbrella size={16} /> Holiday Setup Profile
            </button>
          )}
        </div>
        {!isStudent && (
          <button onClick={() => setShowConfirmModal(true)} disabled={isSaving || isHoliday} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Attendance
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 px-4 sm:px-0">
        <div className="xl:col-span-3 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 flex items-center justify-between">
                 <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth()-1)))} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><ChevronLeft size={14}/></button>
                 <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                    {viewDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
                 </h3>
                 <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth()+1)))} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><ChevronRight size={14}/></button>
              </div>
              <div className="p-4">
                 <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map(day => <div key={day} className="text-center"><span className="text-[7px] font-black text-slate-400 uppercase">{day.charAt(0)}</span></div>)}
                    {calendarDays.map((day, idx) => {
                      if (!day) return <div key={idx} />;
                      const dateStr = day.toLocaleDateString('en-CA');
                      const isSelected = selectedDate === dateStr;
                      const isToday = new Date().toLocaleDateString('en-CA') === dateStr;
                      const isMarked = monthlyMarkedDates.has(dateStr);
                      const isThisHoliday = holidays.some(h => {
                         const match = dateStr >= h.startDate && dateStr <= h.endDate;
                         const classMatch = isClassInHolidayRange(selectedClass, h.targetClass);
                         return match && classMatch;
                      });
                      return (
                        <button key={dateStr} onClick={() => setSelectedDate(dateStr)} className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all border relative ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg z-10 scale-110' : isThisHoliday ? 'bg-rose-500 border-rose-600 text-white shadow-md font-black' : isMarked ? 'bg-emerald-50 text-emerald-700 font-black' : isToday ? 'bg-slate-100 border-indigo-200 text-indigo-600 font-black' : 'bg-slate-50 border-transparent text-slate-500 hover:border-indigo-100'}`}>
                           <span className="text-[10px]">{day.getDate()}</span>
                        </button>
                      );
                    })}
                 </div>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
              <div className="space-y-3 pt-4">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 block">Active Grade</label>
                 <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {authorizedClasses.map(cls => (
                      <button key={cls} onClick={() => setSelectedClass(cls)} className={`py-2.5 px-2 rounded-xl text-[8px] font-black uppercase transition-all border ${selectedClass === cls ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400 hover:border-indigo-100'}`}>{cls}</button>
                    ))}
                 </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 block">Active Section</label>
                 <div className="grid grid-cols-4 gap-2">
                    {SECTIONS.map(sec => (
                      <button key={sec} onClick={() => setSelectedSection(sec)} className={`py-2 px-1 rounded-xl text-[9px] font-black transition-all border ${selectedSection === sec ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400 hover:border-indigo-100'}`}>{sec}</button>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        <div className="xl:col-span-9 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md"><LayoutGrid size={20} /></div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">{selectedClass}-{selectedSection} Registry</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedMedium} • {new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                 </div>
              </div>
              
              {isHoliday ? (
                <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-100 dark:border-rose-900/50 px-8 py-4 rounded-[1.8rem] flex items-center gap-4">
                   <Umbrella size={24} className="text-rose-600" />
                   <div>
                      <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Holiday In Effect</p>
                      <p className="text-sm font-black text-rose-700 dark:text-rose-300 uppercase mt-1.5">{currentHoliday?.reason || 'INSTITUTIONAL BREAK'}</p>
                   </div>
                </div>
              ) : (
                <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-6 py-4 rounded-3xl flex items-center gap-4">
                   <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm"><Users size={20}/></div>
                   <div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase">Class Strength</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white leading-none mt-1">{baseList.length} Active Nodes</p>
                   </div>
                </div>
              )}
           </div>

           {/* QUICK ABSENT ENTRY BAR */}
           {!isHoliday && !isStudent && (
             <form onSubmit={handleQuickAbsent} className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-rose-100 dark:border-rose-950/30 flex items-center gap-4 animate-in slide-in-from-top-2">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                   <Target size={24} />
                </div>
                <div className="flex-1 relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input 
                    type="text" 
                    value={quickAbsentInput}
                    onChange={e => setQuickAbsentInput(e.target.value)}
                    placeholder="QUICK ABSENT ENTRY: TYPE ROLL NO OR NAME & PRESS ENTER..." 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 font-black uppercase text-xs text-rose-600 dark:text-rose-400 outline-none focus:ring-2 focus:ring-rose-500 shadow-inner placeholder:text-slate-300"
                   />
                </div>
                <button type="submit" className="px-8 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest hidden md:block">
                   Register Absence
                </button>
             </form>
           )}

           {/* ATTENDANCE LISTS */}
           <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[600px] transition-all duration-700 ${isHoliday ? 'opacity-25 grayscale pointer-events-none' : ''}`}>
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                 <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/10 flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-widest">Presence Pool</h4>
                    <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-[9px] font-black uppercase">{presentPool.length} Marked</span>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2 bg-slate-50/30 dark:bg-slate-950/20">
                    {presentPool.length > 0 ? presentPool.map(student => (
                      <div key={student.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group transition-all hover:border-emerald-200">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm">{student.rollNo}</div>
                            <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px]">{student.fullName}</h5>
                         </div>
                         <button onClick={() => handleStatusChange(student.id, 'ABSENT')} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><ArrowRight size={16} /></button>
                      </div>
                    )) : <div className="h-full flex flex-col items-center justify-center opacity-20 py-20"><CheckCircle2 size={40} className="mb-2" /><p className="text-[10px] font-black uppercase tracking-widest text-center">Identity Pool Neutral</p></div>}
                 </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                 <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-rose-50/30 dark:bg-rose-950/10 flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-rose-700 dark:text-rose-400 tracking-widest">Absent Registry</h4>
                    <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full text-[9px] font-black uppercase">{absentRegistry.length} Registered</span>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2 bg-rose-50/10 dark:bg-rose-950/10">
                    {absentRegistry.length > 0 ? absentRegistry.map(student => (
                      <div key={student.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-md flex items-center justify-between group animate-in slide-in-from-left-4">
                         <div className="flex items-center gap-4">
                            <button onClick={() => handleStatusChange(student.id, 'PRESENT')} className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><ArrowLeft size={16} /></button>
                            <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px]">#{student.rollNo} {student.fullName}</h5>
                         </div>
                         <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/40 text-rose-600 rounded-xl flex items-center justify-center font-black">X</div>
                      </div>
                    )) : <div className="h-full flex flex-col items-center justify-center opacity-10 py-20"><AlertCircle size={40} className="mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">Archive Empty</p></div>}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-md w-full border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 overflow-hidden">
              <div className="p-8 border-b border-slate-50 text-center bg-indigo-50">
                 <div className="w-16 h-16 bg-indigo-600 text-white rounded-xl flex items-center justify-center mx-auto mb-4"><Save size={32} /></div>
                 <h3 className="text-2xl font-black uppercase">Sync Registry?</h3>
              </div>
              <div className="p-10 space-y-6">
                 <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Class Node</span><span className="text-xs font-black uppercase">{selectedClass}-{selectedSection}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Registry Date</span><span className="text-xs font-black">{selectedDate}</span></div>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                    <button onClick={handleSave} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px]">Sync Terminal</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
