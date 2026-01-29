
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student } from '../types';
import { db, supabase, getErrorMessage } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Search, Trash2, Edit2, X, UserPlus, User as UserIcon, Camera, Upload, 
  CheckCircle2, ShieldCheck, Smartphone, Loader2, RefreshCw,
  GraduationCap, ChevronDown, ChevronUp, Heart, Shield,
  Filter, Grid3X3, RotateCcw, Database, MousePointer2, UserSearch,
  Hash, ArrowUpCircle, Layers, CheckSquare, Square, Save, AlertTriangle, ArrowRightCircle,
  // Added ArrowRight to imports
  Info, Users, ArrowRightLeft, MoveRight, ChevronRight, Wand2, Rocket, ArrowRight
} from 'lucide-react';

interface ClassManagementProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];
const SECTIONS_LIST = ['A', 'B', 'C', 'D'];

const ClassManagement: React.FC<ClassManagementProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'SECTION' | 'ROLL_NO' | 'TRANSFER'>('SECTION');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Source Selection (Currently Assigned)
  const [sourceClass, setSourceClass] = useState(ALL_CLASSES[0]);
  const [sourceSection, setSourceSection] = useState('A');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Target Selection (New Assignment)
  const [targetClass, setTargetClass] = useState(ALL_CLASSES[0]);
  const [targetSection, setTargetSection] = useState('A');

  // Tab 2: Roll Number specific
  const [rollNumbers, setRollNumbers] = useState<Record<string, string>>({});
  const [rollClass, setRollClass] = useState(ALL_CLASSES[0]);
  const [rollSection, setRollSection] = useState('A');
  const [localSortedStudents, setLocalSortedStudents] = useState<Student[]>([]);

  const fetchStudents = async () => {
    try {
      const data = await db.students.getAll();
      const mapped = data.filter((s: any) => s.status !== 'CANCELLED').map((s: any) => ({
        id: s.id, fullName: s.full_name, grNumber: s.gr_number,
        class: s.class, section: s.section, rollNo: s.roll_no || ''
      }));
      setStudents(mapped as Student[]);
      
      const rollMap: Record<string, string> = {};
      mapped.forEach((s: any) => { rollMap[s.id] = s.rollNo; });
      setRollNumbers(rollMap);
    } catch (err) { console.error("Fetch Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchStudents();
    const channel = supabase.channel('class-mgmt-sync-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchStudents().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Update local sorted list for Roll No Tab
  useEffect(() => {
    const list = students.filter(s => s.class === rollClass && s.section === rollSection)
      .sort((a, b) => (parseInt(a.rollNo) || 999) - (parseInt(b.rollNo) || 999));
    setLocalSortedStudents(list);
  }, [students, rollClass, rollSection]);

  const sourceStudents = useMemo(() => {
    return students.filter(s => s.class === sourceClass && s.section === sourceSection)
      .sort((a, b) => (parseInt(a.rollNo) || 999) - (parseInt(b.rollNo) || 999));
  }, [students, sourceClass, sourceSection]);

  const filteredSourceStudents = useMemo(() => {
    if (!searchQuery) return sourceStudents;
    return sourceStudents.filter(s => 
      (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.grNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sourceStudents, searchQuery]);

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // ACTION: Move Students between Sections/Classes
  const handleMigration = async () => {
    if (selectedStudentIds.length === 0) return;
    if (sourceClass === targetClass && sourceSection === targetSection) {
      alert("Source and Target nodes are identical.");
      return;
    }

    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ 
          class: targetClass, 
          section: targetSection,
          roll_no: null // Reset roll numbers as they move to a new pool
        })
        .in('id', selectedStudentIds);
      if (error) throw error;
      
      await createAuditLog(user, 'UPDATE', 'Class Management', `Moved ${selectedStudentIds.length} students from ${sourceClass}-${sourceSection} to ${targetClass}-${targetSection}`);
      setShowSuccess(true);
      setSelectedStudentIds([]);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchStudents();
    } catch (e: any) { alert(getErrorMessage(e)); }
    finally { setIsSyncing(false); }
  };

  // ACTION: Batch Update Roll Numbers
  const handleUpdateRollNumbers = async () => {
    setIsSyncing(true);
    try {
      // In a real high-perf app, use a RPC or single statement, 
      // but for standard classes, single updates in Promise.all are robust.
      const updates = localSortedStudents.map(student => 
        supabase.from('students').update({ roll_no: rollNumbers[student.id] }).eq('id', student.id)
      );
      
      await Promise.all(updates);
      
      await createAuditLog(user, 'UPDATE', 'Class Management', `Updated roll numbers for ${rollClass}-${rollSection}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchStudents();
    } catch (e: any) { alert(getErrorMessage(e)); }
    finally { setIsSyncing(false); }
  };

  const autoGenerateRollNumbers = () => {
    const nextRollMap = { ...rollNumbers };
    localSortedStudents.forEach((s, idx) => {
      nextRollMap[s.id] = (idx + 1).toString();
    });
    setRollNumbers(nextRollMap);
  };

  const moveStudent = (index: number, direction: 'UP' | 'DOWN') => {
    const newList = [...localSortedStudents];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;
    
    setLocalSortedStudents(newList);
  };

  // TAB 3: PROMOTION ENGINE LOGIC
  const nextPromotionGrade = useMemo(() => {
    const currentNumMatch = sourceClass.match(/\d+/);
    if (!currentNumMatch) return sourceClass;
    const currentNum = parseInt(currentNumMatch[0]);
    if (currentNum >= 12) return "GRADUATED";
    
    const wingSuffix = sourceClass.includes('GIRLS') ? 'GIRLS' : 'BOYS';
    return `${currentNum + 1} - ${wingSuffix}`;
  }, [sourceClass]);

  const handlePromote = async () => {
    if (selectedStudentIds.length === 0) return;
    if (nextPromotionGrade === "GRADUATED") {
      alert("Identity pool already at terminal grade (12th).");
      return;
    }

    if (!window.confirm(`PROMOTE ${selectedStudentIds.length} STUDENTS TO ${nextPromotionGrade}?`)) return;

    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ 
          class: nextPromotionGrade,
          roll_no: null // Reset for new session
        })
        .in('id', selectedStudentIds);
      if (error) throw error;
      
      await createAuditLog(user, 'UPDATE', 'Promotion', `Promoted ${selectedStudentIds.length} students to ${nextPromotionGrade}`);
      setShowSuccess(true);
      setSelectedStudentIds([]);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchStudents();
    } catch (e: any) { alert(getErrorMessage(e)); }
    finally { setIsSyncing(false); }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce no-print">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Cloud Synced...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Protocol Success</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Database Sync Complete</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3 leading-none">Class Management <Layers className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-3">Identity Node Configuration & Academic Promotion</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
           {(['SECTION', 'ROLL_NO', 'TRANSFER'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedStudentIds([]); }}
                className={`whitespace-nowrap px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                 {tab === 'SECTION' ? 'Section Migration' : tab === 'ROLL_NO' ? 'Roll Number Manager' : 'Academic Promotion'}
              </button>
           ))}
        </div>
      </div>

      {(activeTab === 'SECTION' || activeTab === 'TRANSFER') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-4 sm:px-0">
           
           {/* LEFT PANEL: SOURCE SELECTION */}
           <div className="space-y-6 animate-in slide-in-from-left-4">
              <div className="flex items-center gap-4 mb-2">
                 <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100">
                    <Database size={20} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Source Identity Node</h2>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Grade Selection</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-print">
                       {ALL_CLASSES.map(cls => (
                          <button 
                            key={cls} 
                            onClick={() => { setSourceClass(cls); setSelectedStudentIds([]); }}
                            className={`whitespace-nowrap px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${sourceClass === cls ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400 hover:border-slate-200'}`}
                          >
                             {cls}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Section Node</label>
                    <div className="flex gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl">
                       {SECTIONS_LIST.map(sec => (
                          <button 
                            key={sec} 
                            onClick={() => { setSourceSection(sec); setSelectedStudentIds([]); }}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${sourceSection === sec ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                             Section {sec}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                       type="text" 
                       placeholder="FILTER NODES (NAME / GR NO)..." 
                       value={searchQuery}
                       onChange={e => setSearchQuery(e.target.value)}
                       className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" 
                    />
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-6 min-h-[350px] flex flex-col shadow-inner">
                    <div className="flex justify-between items-center mb-6 px-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Roster</span>
                       <button onClick={() => setSelectedStudentIds(selectedStudentIds.length === filteredSourceStudents.length ? [] : filteredSourceStudents.map(s => s.id))} className="text-[9px] font-black text-indigo-600 uppercase">Select All</button>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                       {filteredSourceStudents.map(student => (
                          <div 
                             key={student.id} 
                             onClick={() => toggleStudentSelection(student.id)}
                             className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedStudentIds.includes(student.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-transparent hover:border-slate-100'}`}
                          >
                             <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${selectedStudentIds.includes(student.id) ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800 text-indigo-600'}`}>{student.rollNo || '0'}</div>
                                <div className="min-w-0">
                                   <p className="font-black text-[11px] uppercase truncate">{student.fullName}</p>
                                   <p className={`text-[8px] font-bold uppercase tracking-widest ${selectedStudentIds.includes(student.id) ? 'text-indigo-100' : 'text-slate-400'}`}>GR: {student.grNumber}</p>
                                </div>
                             </div>
                             {selectedStudentIds.includes(student.id) ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-200" />}
                          </div>
                       ))}
                       {filteredSourceStudents.length === 0 && (
                          <div className="h-[250px] flex flex-col items-center justify-center opacity-20">
                             <UserSearch size={48} className="mb-4" />
                             <p className="text-[10px] font-black uppercase tracking-[0.3em]">No nodes found</p>
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="pt-2 flex justify-between items-center px-4">
                    <div className="flex items-center gap-3">
                       <Users size={16} className="text-slate-400" />
                       <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Count: {sourceStudents.length}</span>
                    </div>
                    <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">Queued: {selectedStudentIds.length}</span>
                 </div>
              </div>
           </div>

           {/* RIGHT PANEL: ACTION ENGINE */}
           <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-2">
                 <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm border border-emerald-100">
                    <Rocket size={20} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Execution Protocol</h2>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-8 h-full flex flex-col">
                 
                 {activeTab === 'SECTION' ? (
                   <div className="space-y-8 animate-in fade-in">
                      <div className="space-y-3">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Grade Node</label>
                         <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-print">
                            {ALL_CLASSES.map(cls => (
                               <button 
                                 key={cls} 
                                 onClick={() => setTargetClass(cls)}
                                 className={`whitespace-nowrap px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${targetClass === cls ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400 hover:border-slate-200'}`}
                               >
                                  {cls}
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-3">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Section Node</label>
                         <div className="flex gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl">
                            {SECTIONS_LIST.map(sec => (
                               <button 
                                 key={sec} 
                                 onClick={() => setTargetSection(sec)}
                                 className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${targetSection === sec ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                               >
                                  Section {sec}
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="bg-slate-950 rounded-[2.5rem] p-10 flex-1 flex flex-col relative overflow-hidden border border-white/5 shadow-2xl">
                         <div className="absolute inset-0 neural-grid-white opacity-5"></div>
                         <div className="relative z-10 flex flex-col items-center justify-center text-center h-full gap-6">
                            <div className="flex items-center gap-6 w-full justify-center">
                               <div className="text-center">
                                  <span className="text-[7px] text-slate-500 uppercase block mb-1">From</span>
                                  <p className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-black text-indigo-400 uppercase">{sourceClass}-{sourceSection}</p>
                               </div>
                               <ArrowRight className="text-slate-600" size={24} />
                               <div className="text-center">
                                  <span className="text-[7px] text-slate-500 uppercase block mb-1">To</span>
                                  <p className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-black text-emerald-400 uppercase">{targetClass}-{targetSection}</p>
                               </div>
                            </div>
                            <h4 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Migration Sync</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase max-w-[250px] leading-relaxed">Commit selected identities to the target node. Current roll numbers will be reset.</p>
                            
                            <button 
                               onClick={handleMigration} 
                               disabled={selectedStudentIds.length === 0 || isSyncing}
                               className="w-full mt-6 py-6 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-3"
                            >
                               {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />} 
                               Process Bulk Migration
                            </button>
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-8 animate-in fade-in h-full flex flex-col">
                      <div className="p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800 space-y-4">
                         <div className="flex items-center gap-4">
                            <ArrowUpCircle size={32} className="text-indigo-600" />
                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Promotion Terminal</h4>
                         </div>
                         <p className="text-[10px] font-bold text-indigo-700/60 dark:text-indigo-400/60 uppercase leading-relaxed">Select students from the left registry to promote to the next grade node automatically.</p>
                      </div>

                      <div className="bg-slate-950 rounded-[2.5rem] p-10 flex-1 flex flex-col relative overflow-hidden border border-white/5 shadow-2xl">
                         <div className="absolute inset-0 neural-grid-white opacity-5"></div>
                         <div className="relative z-10 flex flex-col items-center justify-center text-center h-full gap-8">
                            <div className="grid grid-cols-3 items-center w-full gap-4">
                               <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10">
                                  <p className="text-[7px] text-slate-500 uppercase mb-2">Active Cycle</p>
                                  <p className="text-xs font-black text-white">{sourceClass}</p>
                               </div>
                               <div className="flex items-center justify-center">
                                  <ChevronRight className="text-indigo-500 animate-pulse" size={32} />
                               </div>
                               <div className="text-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                  <p className="text-[7px] text-emerald-500 uppercase mb-2">Promotion Node</p>
                                  <p className="text-xs font-black text-emerald-400">{nextPromotionGrade}</p>
                               </div>
                            </div>
                            
                            {nextPromotionGrade === 'GRADUATED' ? (
                              <div className="p-6 bg-rose-900/20 border border-rose-500/30 rounded-2xl text-rose-500 text-[10px] font-black uppercase">
                                Grade 12 Node Completed. Identitites will be archived as alumni.
                              </div>
                            ) : (
                              <>
                                <h4 className="text-3xl font-black text-white uppercase tracking-tighter">Academic Leap</h4>
                                <button 
                                  onClick={handlePromote}
                                  disabled={selectedStudentIds.length === 0 || isSyncing}
                                  className="w-full py-8 bg-emerald-600 text-white font-black rounded-3xl shadow-2xl shadow-emerald-900/20 hover:bg-emerald-700 active:scale-95 disabled:opacity-30 transition-all flex flex-col items-center justify-center gap-2"
                                >
                                  {isSyncing ? <Loader2 className="animate-spin" size={24} /> : (
                                    <>
                                       <span className="text-sm uppercase tracking-[0.3em]">Publish Promotion</span>
                                       <span className="text-[8px] opacity-60">Syncing {selectedStudentIds.length} Student Profiles to {nextPromotionGrade}</span>
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                         </div>
                      </div>
                   </div>
                 )}

              </div>
           </div>

        </div>
      )}

      {activeTab === 'ROLL_NO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 sm:px-0">
          <div className="lg:col-span-3 space-y-6">
             <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Filter size={12}/> View Config</label>
                    <div className="space-y-4">
                       <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Standard Node</span>
                          <select value={rollClass} onChange={e => setRollClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 font-black text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500 mt-1 cursor-pointer">
                             {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                       </div>
                       <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Section Node</span>
                          <select value={rollSection} onChange={e => setRollSection(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 font-black text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500 mt-1 cursor-pointer">
                             {SECTIONS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </div>
                    </div>
                </div>
                <div className="pt-6 border-t border-slate-50 dark:border-slate-800 space-y-3">
                   <button onClick={autoGenerateRollNumbers} className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase rounded-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-sm"><Hash size={14}/> Auto-Assign (1,2,3...)</button>
                   <button onClick={handleUpdateRollNumbers} disabled={isSyncing} className="w-full px-8 py-5 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl hover:bg-indigo-700 shadow-xl transition-all flex items-center justify-center gap-3">
                      {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} Synchronize Roll Matrix
                   </button>
                </div>
                <div className="p-6 bg-amber-50 dark:bg-amber-950/20 rounded-[2rem] border border-amber-100 dark:border-amber-900/50 flex items-start gap-4">
                   <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                   <p className="text-[8px] font-bold text-amber-700 dark:text-amber-400 uppercase leading-relaxed tracking-wider">Drag nodes or use the auto-sequencer to re-order. Click Sync to publish changes to Supabase.</p>
                </div>
             </div>
          </div>

          <div className="lg:col-span-9">
             <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[550px]">
                <div className="overflow-x-auto">
                   <table className="w-full">
                      <thead>
                         <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <th className="px-6 py-6 text-center w-24">Sequence</th>
                            <th className="px-10 py-6 text-center w-32">Official Roll</th>
                            <th className="px-8 py-6 text-left">Identity Profile</th>
                            <th className="px-8 py-6 text-left">GR Unique Key</th>
                            <th className="px-8 py-6 text-right">Academic Node</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                         {localSortedStudents.map((student, index) => (
                           <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                              <td className="px-6 py-6">
                                 <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => moveStudent(index, 'UP')} 
                                      disabled={index === 0}
                                      className="p-1.5 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-lg transition-all disabled:opacity-0"
                                    >
                                       <ChevronUp size={14} strokeWidth={4}/>
                                    </button>
                                    <button 
                                      onClick={() => moveStudent(index, 'DOWN')} 
                                      disabled={index === localSortedStudents.length - 1}
                                      className="p-1.5 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-lg transition-all disabled:opacity-0"
                                    >
                                       <ChevronDown size={14} strokeWidth={4}/>
                                    </button>
                                 </div>
                              </td>
                              <td className="px-10 py-6 text-center">
                                 <input 
                                   type="text" 
                                   value={rollNumbers[student.id] || ''} 
                                   onChange={e => setRollNumbers({...rollNumbers, [student.id]: e.target.value})}
                                   className="w-20 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-3 py-3 font-black text-center text-xs text-indigo-600 outline-none shadow-inner"
                                 />
                              </td>
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-400 font-black shadow-inner uppercase overflow-hidden border border-indigo-100 dark:border-indigo-800 group-hover:scale-110 transition-transform">
                                       {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" /> : student.fullName?.charAt(0)}
                                    </div>
                                    <div>
                                       <p className="font-black text-slate-800 dark:text-white text-base uppercase leading-tight">{student.fullName}</p>
                                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Current Index: #{index + 1}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <span className="font-black text-slate-500 dark:text-slate-400 text-[10px] tracking-[0.2em] uppercase">{student.grNumber}</span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl font-black text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">NODE {student.class}</span>
                              </td>
                           </tr>
                         ))}
                         {localSortedStudents.length === 0 && !isLoading && (
                            <tr>
                               <td colSpan={5} className="py-40 text-center opacity-30 flex flex-col items-center justify-center">
                                  <UserSearch size={64} className="mb-4 text-slate-200" />
                                  <p className="font-black text-sm uppercase tracking-[0.4em]">Empty Identity Archive</p>
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

// SVG Target Icon
const Target = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);

export default ClassManagement;
