
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student } from '../types';
import { db, supabase, getErrorMessage } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Search, Trash2, Edit2, X, UserPlus, User as UserIcon, Camera, Upload, 
  CheckCircle2, ShieldCheck, Smartphone, Loader2, RefreshCw,
  GraduationCap, ChevronDown, Heart, Shield,
  Filter, Grid3X3, RotateCcw, Database, MousePointer2, UserSearch,
  Hash, ArrowUpCircle, Layers, CheckSquare, Square, Save, AlertTriangle, ArrowRightCircle,
  Info, Users, ArrowRightLeft, MoveRight
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
    } catch (err) { console.error(err); }
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

  const sourceStudents = useMemo(() => {
    return students.filter(s => s.class === sourceClass && s.section === sourceSection)
      .sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
  }, [students, sourceClass, sourceSection]);

  const filteredSourceStudents = useMemo(() => {
    if (!searchQuery) return sourceStudents;
    return sourceStudents.filter(s => 
      (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.grNumber || '').includes(searchQuery)
    );
  }, [sourceStudents, searchQuery]);

  const rollStudents = useMemo(() => {
    return students.filter(s => s.class === rollClass && s.section === rollSection)
      .sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
  }, [students, rollClass, rollSection]);

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

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
          roll_no: null // Reset roll numbers for new environment
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

  const handleUpdateRollNumbers = async () => {
    setIsSyncing(true);
    try {
      for (const student of rollStudents) {
         if (rollNumbers[student.id] !== student.rollNo) {
            await supabase.from('students').update({ roll_no: rollNumbers[student.id] }).eq('id', student.id);
         }
      }
      await createAuditLog(user, 'UPDATE', 'Class Management', `Updated roll numbers for ${rollClass}-${rollSection}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchStudents();
    } catch (e: any) { alert(getErrorMessage(e)); }
    finally { setIsSyncing(false); }
  };

  const autoGenerateRollNumbers = () => {
    const sortedByName = [...rollStudents].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    const nextRollMap = { ...rollNumbers };
    sortedByName.forEach((s, idx) => {
      nextRollMap[s.id] = (idx + 1).toString();
    });
    setRollNumbers(nextRollMap);
  };

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
              <p className="font-black text-xs uppercase tracking-widest">Database Updated</p>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">Class Management <Layers className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-3">Identity Node Configuration & Bulk Migration</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
           {(['SECTION', 'ROLL_NO', 'TRANSFER'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedStudentIds([]); }}
                className={`whitespace-nowrap px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                 {tab === 'SECTION' ? 'Add Student to Section' : tab === 'ROLL_NO' ? 'Roll Number Manager' : 'Academic Transfer'}
              </button>
           ))}
        </div>
      </div>

      {activeTab === 'SECTION' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-4 sm:px-0">
           
           {/* LEFT PANEL: CURRENT ASSIGNMENT */}
           <div className="space-y-6 animate-in slide-in-from-left-4">
              <div className="flex items-center gap-4 mb-2">
                 <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100">
                    <Database size={20} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Currently Assign Class Section</h2>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
                 {/* CLASS TABS */}
                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Current Grade Node</label>
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

                 {/* SECTION TABS */}
                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Current Section Node</label>
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

                 {/* SEARCH FIELD */}
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                       type="text" 
                       placeholder="FILTER SOURCE NODES (NAME / GR NO)..." 
                       value={searchQuery}
                       onChange={e => setSearchQuery(e.target.value)}
                       className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" 
                    />
                 </div>

                 {/* STUDENT LIST BOX */}
                 <div className="bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-6 min-h-[350px] flex flex-col shadow-inner">
                    <div className="flex justify-between items-center mb-6 px-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identify Nodes</span>
                       <button onClick={() => setSelectedStudentIds(selectedStudentIds.length === filteredSourceStudents.length ? [] : filteredSourceStudents.map(s => s.id))} className="text-[9px] font-black text-indigo-600 uppercase">Toggle All</button>
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

                 {/* FOOTER COUNT */}
                 <div className="pt-2 flex justify-between items-center px-4">
                    <div className="flex items-center gap-3">
                       <Users size={16} className="text-slate-400" />
                       <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Total Students: {sourceStudents.length}</span>
                    </div>
                    <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">Selected: {selectedStudentIds.length}</span>
                 </div>
              </div>
           </div>

           {/* RIGHT PANEL: NEW ASSIGNMENT */}
           <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-2">
                 <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm border border-emerald-100">
                    <MoveRight size={20} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">New Assign Class Section</h2>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
                 {/* TARGET CLASS TABS */}
                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Target Grade Node</label>
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

                 {/* TARGET SECTION TABS */}
                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Target Section Node</label>
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

                 {/* MIGRATION SUMMARY PREVIEW BOX */}
                 <div className="bg-slate-950 rounded-[2.5rem] p-8 min-h-[420px] flex flex-col relative overflow-hidden border border-white/5">
                    <div className="absolute inset-0 neural-grid-white opacity-5"></div>
                    <div className="relative z-10 flex flex-col h-full">
                       <div className="flex items-center justify-between mb-8">
                          <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em]">Migration Sequence</h4>
                          <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Ready to Sync</span>
                       </div>

                       <div className="flex-1 space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Source Node</p>
                                <p className="text-sm font-black text-white uppercase">{sourceClass}-{sourceSection}</p>
                             </div>
                             <div className="p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Target Node</p>
                                <p className="text-sm font-black text-white uppercase">{targetClass}-{targetSection}</p>
                             </div>
                          </div>

                          <div className="p-8 bg-indigo-600 rounded-3xl shadow-2xl border border-indigo-500 flex flex-col items-center text-center gap-4 group">
                             <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-2 group-hover:scale-110 transition-transform">
                                <ArrowRightLeft size={32} />
                             </div>
                             <h5 className="text-2xl font-black text-white tracking-tighter">COMMIT MIGRATION</h5>
                             <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest leading-relaxed">Publish selected identities to the target academic node.</p>
                             <button 
                                onClick={handleMigration} 
                                disabled={selectedStudentIds.length === 0 || isSyncing}
                                className="w-full mt-4 py-4 bg-white text-indigo-600 font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all"
                             >
                                {isSyncing ? <Loader2 className="animate-spin mx-auto" /> : 'Synchronize Node'}
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* TARGET FOOTER COUNT */}
                 <div className="pt-2 flex justify-between items-center px-4">
                    <div className="flex items-center gap-3">
                       <Target size={16} className="text-slate-400" />
                       <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Total Student: {students.filter(s => s.class === targetClass && s.section === targetSection).length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black text-slate-400 uppercase">QUEUED MIGRANTS:</span>
                       <span className="text-xs font-black text-emerald-600">{selectedStudentIds.length}</span>
                    </div>
                 </div>
              </div>
           </div>

        </div>
      )}

      {activeTab === 'ROLL_NO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 sm:px-0">
          {/* ROLL NO FILTERS */}
          <div className="lg:col-span-3 space-y-6">
             <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Filter size={12}/> View Config</label>
                    <div className="space-y-4">
                       <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Standard</span>
                          <select value={rollClass} onChange={e => setRollClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 font-black text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500 mt-1">
                             {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                       </div>
                       <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Section</span>
                          <select value={rollSection} onChange={e => setRollSection(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 font-black text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500 mt-1">
                             {SECTIONS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </div>
                    </div>
                </div>
                <div className="pt-6 border-t border-slate-50 dark:border-slate-800 space-y-3">
                   <button onClick={autoGenerateRollNumbers} className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase rounded-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"><Hash size={14}/> Auto-Sort List</button>
                   <button onClick={handleUpdateRollNumbers} disabled={isSyncing} className="w-full px-8 py-4 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl hover:bg-indigo-700 shadow-xl transition-all flex items-center justify-center gap-2">
                      {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} Sync Matrix
                   </button>
                </div>
             </div>
          </div>

          {/* ROLL NO GRID */}
          <div className="lg:col-span-9">
             <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                   <table className="w-full">
                      <thead>
                         <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <th className="px-10 py-6 text-center w-32">Roll ID</th>
                            <th className="px-8 py-6 text-left">Full Identity</th>
                            <th className="px-8 py-6 text-left">GR Node Key</th>
                            <th className="px-8 py-6 text-right">Academic Node</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                         {rollStudents.map(student => (
                           <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                              <td className="px-10 py-6 text-center">
                                 <input 
                                   type="text" 
                                   value={rollNumbers[student.id] || ''} 
                                   onChange={e => setRollNumbers({...rollNumbers, [student.id]: e.target.value})}
                                   className="w-20 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-black text-center text-xs text-indigo-600 outline-none focus:border-indigo-500 shadow-inner"
                                 />
                              </td>
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-black shadow-inner uppercase overflow-hidden border border-slate-200">{student.fullName?.charAt(0)}</div>
                                    <p className="font-black text-slate-800 dark:text-white text-sm uppercase leading-tight">{student.fullName}</p>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <span className="font-black text-slate-400 text-[10px] tracking-widest uppercase">{student.grNumber}</span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg font-black text-[9px] uppercase tracking-widest text-indigo-600 border border-indigo-100 dark:border-indigo-800">SEC {student.section}</span>
                              </td>
                           </tr>
                         ))}
                         {rollStudents.length === 0 && (
                            <tr>
                               <td colSpan={4} className="py-40 text-center opacity-30 flex flex-col items-center justify-center">
                                  <UserSearch size={48} className="mb-4" />
                                  <p className="font-black text-xs uppercase tracking-[0.3em]">Identity Archive Empty</p>
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

      {activeTab === 'TRANSFER' && (
        <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800 mx-4 sm:mx-0">
           <ArrowUpCircle size={64} className="text-slate-200 dark:text-slate-800 mb-6" />
           <h3 className="text-2xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter leading-none mb-4">Academic Promotion Protocol</h3>
           <p className="text-slate-400 font-medium max-w-sm mx-auto text-sm leading-relaxed text-center uppercase tracking-widest">Promotion module is typically active during session transitions (March/June).</p>
        </div>
      )}
    </div>
  );
};

// Local component for Target SVG, not imported from lucide-react to avoid conflict
const Target = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);

export default ClassManagement;
