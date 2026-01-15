import React, { useState, useEffect, useMemo } from 'react';
import { User, Student } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  FileBarChart, GraduationCap, Users, TrendingUp, Filter, Search, Download, FileText, 
  Trophy, AlertTriangle, Calendar, Printer, ChevronRight, PieChart as PieIcon,
  Activity, Star, History, LayoutGrid, Settings, Plus, Trash2, Edit2, X, MoveHorizontal, 
  Settings2, Save, CheckCircle2, ChevronDown, ChevronUp, Layers, Columns, Fingerprint,
  Info, ShieldCheck, Loader2, FolderPlus, Tags, RefreshCw
} from 'lucide-react';
import { db, supabase } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';

interface StudentReportsProps { user: User; }

interface ReportColumn {
  key: string;
  label: string;
  width: string;
  visible: boolean;
}

interface SchoolStructure {
  classes: string[];
  sections: string[];
  categories: string[];
}

const MASTER_FIELDS = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'grNumber', label: 'GR Number' },
  { key: 'rollNo', label: 'Roll No' },
  { key: 'class', label: 'Class' },
  { key: 'section', label: 'Section' },
  { key: 'gender', label: 'Gender' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'admissionDate', label: 'Admission Date' },
  { key: 'aadharNo', label: 'Aadhar No' },
  { key: 'penNo', label: 'PEN No' },
  { key: 'uidId', label: 'UID ID' },
  { key: 'fatherName', label: 'Father Name' },
  { key: 'fatherMobile', label: 'Father Mobile' },
  { key: 'motherName', label: 'Mother Name' },
  { key: 'motherMobile', label: 'Mother Mobile' },
  { key: 'residenceAddress', label: 'Address' },
];

const StudentReports: React.FC<StudentReportsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'VIEW' | 'DESIGNER' | 'STRUCTURE'>('VIEW');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Dynamic Structure States
  const [structure, setStructure] = useState<SchoolStructure>(() => {
    const saved = localStorage.getItem('school_structure_v3');
    return saved ? JSON.parse(saved) : {
      classes: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'],
      sections: ['A', 'B', 'C'],
      categories: ['General', 'Scholarship', 'Hostel', 'EWS']
    };
  });

  // Dynamic Column States
  const [columns, setColumns] = useState<ReportColumn[]>(() => {
    const saved = localStorage.getItem('report_columns_config_v2');
    return saved ? JSON.parse(saved) : [
      { key: 'fullName', label: 'Student Name', width: '250px', visible: true },
      { key: 'grNumber', label: 'GR No', width: '120px', visible: true },
      { key: 'class', label: 'Class', width: '100px', visible: true },
      { key: 'rollNo', label: 'Roll No', width: '100px', visible: true },
      { key: 'fatherMobile', label: 'Contact', width: '150px', visible: true }
    ];
  });

  const [filterClass, setFilterClass] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('reports-sync-final')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    try {
      const data = await db.students.getAll();
      setStudents(data as any);
    } catch (err) { console.error("Report Fetch Error"); }
    finally { setIsLoading(false); }
  };

  const handleSaveConfig = async () => {
    setIsSyncing(true);
    localStorage.setItem('report_columns_config_v2', JSON.stringify(columns));
    localStorage.setItem('school_structure_v3', JSON.stringify(structure));
    await createAuditLog(user, 'UPDATE', 'Reports', 'Updated report layout and institutional structure');
    setIsSyncing(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const addColumn = (fieldKey: string) => {
    if (columns.find(c => c.key === fieldKey)) return;
    const field = MASTER_FIELDS.find(f => f.key === fieldKey);
    if (!field) return;
    setColumns([...columns, { key: field.key, label: field.label, width: '150px', visible: true }]);
  };

  const removeColumn = (key: string) => {
    setColumns(columns.filter(c => c.key !== key));
  };

  const addCategory = () => {
    const name = prompt("Enter New Category Profile Name (e.g. Science Club, Staff Ward):");
    if (name && !structure.categories.includes(name)) {
      const nextStructure = { ...structure, categories: [...structure.categories, name] };
      setStructure(nextStructure);
      localStorage.setItem('school_structure_v3', JSON.stringify(nextStructure));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const executeDelete = async (id: string) => {
    try {
      await db.students.delete(id);
      await createAuditLog(user, 'DELETE', 'Registry', 'Student Purged via Reports Terminal');
      setDeleteId(null);
      fetchData();
    } catch (err) { alert("Deletion failed"); }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = filterClass === 'All' || s.class === filterClass;
      const name = (s.fullName || s.name || '').toLowerCase();
      const gr = (s.grNumber || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return matchesClass && (name.includes(query) || gr.includes(query));
    });
  }, [students, filterClass, searchQuery]);

  const availableToAdd = MASTER_FIELDS.filter(f => !columns.find(c => c.key === f.key));

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Global Sync Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Records and layout updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Students Reports.</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg tracking-tight">Institutional Intelligence & Custom Column Architect.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem] shadow-inner border border-slate-200 dark:border-slate-700">
           <button onClick={() => setActiveTab('VIEW')} className={`px-8 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'VIEW' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>Report Grid</button>
           <button onClick={() => setActiveTab('DESIGNER')} className={`px-8 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DESIGNER' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>Column Designer</button>
           <button onClick={() => setActiveTab('STRUCTURE')} className={`px-8 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'STRUCTURE' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>Structure Logic</button>
        </div>
      </div>

      {activeTab === 'VIEW' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row gap-6 items-center">
              <div className="relative group w-full max-w-md">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input type="text" placeholder="Filter by Name, GR No..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white shadow-inner" />
              </div>
              <div className="flex gap-3 overflow-x-auto w-full pb-2 xl:pb-0 custom-scrollbar">
                  <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 shrink-0">
                    <button onClick={() => setFilterClass('All')} className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterClass === 'All' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>All Grades</button>
                    {structure.classes.map(c => (
                      <button key={c} onClick={() => setFilterClass(c)} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterClass === c ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{c}</button>
                    ))}
                  </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => window.print()} className="p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl hover:bg-slate-700 transition-all active:scale-95"><Printer size={20}/></button>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[4rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              {isLoading ? (
                <div className="py-40 flex flex-col items-center justify-center animate-pulse">
                  <Loader2 className="animate-spin text-indigo-600" size={48} />
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <th className="px-10 py-8" style={{ width: '80px' }}>#</th>
                            {columns.filter(c => c.visible).map(col => (
                              <th key={col.key} className="px-8 py-8" style={{ width: col.width }}>{col.label}</th>
                            ))}
                            <th className="px-10 py-8 text-right no-print" style={{ width: '160px' }}>Operations</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                         {filteredStudents.map((student, idx) => (
                           <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group">
                              <td className="px-10 py-8 font-black text-slate-400 text-xs">{idx + 1}</td>
                              {columns.filter(c => c.visible).map(col => (
                                <td key={col.key} className="px-8 py-8 font-black text-slate-800 dark:text-slate-300 text-sm uppercase truncate" style={{ maxWidth: col.width }}>
                                  {(student as any)[col.key] || '-'}
                                </td>
                              ))}
                              <td className="px-10 py-8 text-right no-print">
                                 <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => window.location.hash = `/admin/students?edit=${student.id}`} className="p-3.5 bg-white dark:bg-slate-800 text-indigo-600 rounded-2xl border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                       <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => setDeleteId(student.id)} className="p-3.5 bg-white dark:bg-slate-800 text-rose-500 rounded-2xl border border-rose-100 dark:border-rose-900 hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
              )}
              {filteredStudents.length === 0 && !isLoading && (
                <div className="py-40 flex flex-col items-center justify-center">
                  <Fingerprint size={80} strokeWidth={1} className="text-slate-100 dark:text-slate-800 mb-6" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Zero Identities Match Selection</p>
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'DESIGNER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-right-4">
           <div className="lg:col-span-8 space-y-8">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
                 <div className="flex items-center justify-between mb-12">
                    <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4">
                       <Columns className="text-indigo-600" /> Active Grid Interface
                    </h3>
                    <div className="flex gap-3">
                      <button onClick={addCategory} className="px-8 py-4 bg-emerald-600 text-white font-black rounded-3xl shadow-xl flex items-center gap-3 uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all active:scale-95">
                         <FolderPlus size={18} /> Add Category Profile
                      </button>
                      <button onClick={handleSaveConfig} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl flex items-center gap-3 uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all">
                         <Save size={18} /> Sync UI Layout
                      </button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    {columns.map((col, index) => (
                       <div key={col.key} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 group">
                          <div className="flex items-center gap-8 flex-1">
                             <button onClick={() => {
                               const next = [...columns];
                               next[index].visible = !next[index].visible;
                               setColumns(next);
                             }} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${col.visible ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                <Layers size={24} />
                             </button>
                             <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Column Display Label</p>
                                <input type="text" value={col.label} onChange={e => {
                                  const next = [...columns];
                                  next[index].label = e.target.value;
                                  setColumns(next);
                                }} className="bg-transparent font-black text-slate-800 dark:text-white uppercase outline-none focus:border-b-2 border-indigo-500 w-full text-lg" />
                             </div>
                          </div>
                          <div className="flex items-center gap-10">
                             <div className="w-40">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-right">Pixel Width (px)</p>
                                <div className="relative">
                                   <input type="text" value={col.width} onChange={e => {
                                     const next = [...columns];
                                     next[index].width = e.target.value;
                                     setColumns(next);
                                   }} className="w-full text-right bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 font-black text-indigo-600 text-sm focus:border-indigo-500 outline-none" />
                                   <MoveHorizontal size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                </div>
                             </div>
                             <button onClick={() => removeColumn(col.key)} className="p-4 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all">
                                <Trash2 size={20} />
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
                 <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-4"><Plus className="text-indigo-400" /> Field Injector</h3>
                 <p className="text-slate-400 text-xs leading-relaxed uppercase font-bold tracking-widest mb-10">Select profile attributes to inject into your personalized reporting terminal.</p>
                 
                 <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-3">
                    {availableToAdd.map(field => (
                       <button 
                         key={field.key}
                         onClick={() => addColumn(field.key)}
                         className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-indigo-600 transition-all group/btn"
                       >
                          <span className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-300 group-hover/btn:text-white">{field.label}</span>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 group-hover/btn:bg-white group-hover/btn:text-indigo-600 transition-all">
                            <Plus size={16} strokeWidth={3} />
                          </div>
                       </button>
                    ))}
                    {availableToAdd.length === 0 && (
                      <div className="py-16 text-center opacity-30">
                         <ShieldCheck size={48} className="mx-auto mb-4" />
                         <p className="text-[10px] font-black uppercase tracking-[0.3em]">Full Registry Active</p>
                      </div>
                    )}
                 </div>
              </div>

              <div className="p-10 bg-indigo-50 dark:bg-indigo-900/10 rounded-[3rem] border border-indigo-100 dark:border-indigo-800 flex items-start gap-5">
                 <Info size={24} className="text-indigo-600 shrink-0 mt-1" />
                 <div className="space-y-2">
                    <p className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Layout Persistence</p>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase">Manual width adjustment ensures high-density data views. Use '150px' as standard for text fields.</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'STRUCTURE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in slide-in-from-left-4">
           {/* Grades */}
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><GraduationCap size={24}/></div>
                   <h3 className="text-xl font-black uppercase tracking-tight">Grades</h3>
                 </div>
                 <button onClick={() => {
                    const name = prompt("Enter Grade Name (e.g., Nursery, 1st):");
                    if (name) setStructure({ ...structure, classes: [...structure.classes, name] });
                 }} className="p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"><Plus size={20}/></button>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                 {structure.classes.map(c => (
                    <div key={c} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 group hover:border-indigo-200 transition-all">
                       <span className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-widest">{c}</span>
                       <button onClick={() => setStructure({...structure, classes: structure.classes.filter(x => x !== c)})} className="p-2.5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 rounded-xl"><Trash2 size={16}/></button>
                    </div>
                 ))}
              </div>
           </div>

           {/* Sections */}
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><LayoutGrid size={24}/></div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Sections</h3>
                 </div>
                 <button onClick={() => {
                    const name = prompt("Enter Section Name (e.g., A, B, C):");
                    if (name) setStructure({...structure, sections: [...structure.sections, name.toUpperCase()]});
                 }} className="p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"><Plus size={20}/></button>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                 {structure.sections.map(s => (
                    <div key={s} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 group hover:border-emerald-200 transition-all">
                       <span className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-widest">Section {s}</span>
                       <button onClick={() => setStructure({...structure, sections: structure.sections.filter(x => x !== s)})} className="p-2.5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 rounded-xl"><Trash2 size={16}/></button>
                    </div>
                 ))}
              </div>
           </div>

           {/* Categories */}
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><Tags size={24}/></div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Categories</h3>
                 </div>
                 <button onClick={addCategory} className="p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"><Plus size={20}/></button>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                 {structure.categories.map(c => (
                    <div key={c} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 group hover:border-amber-200 transition-all">
                       <span className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-widest">{c}</span>
                       <button onClick={() => setStructure({...structure, categories: structure.categories.filter(x => x !== c)})} className="p-2.5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 rounded-xl"><Trash2 size={16}/></button>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-16 max-sm w-full shadow-2xl text-center border border-rose-100 dark:border-rose-900/50 animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[3rem] flex items-center justify-center mb-10 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={50} strokeWidth={2.5} />
              </div>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter leading-none">Purge Data?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-12 font-medium text-xs leading-relaxed uppercase tracking-[0.2em]">This record will be permanently erased from all institutional cloud terminals.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeleteId(null)} className="py-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-3xl uppercase text-[11px] tracking-widest">Cancel</button>
                 <button onClick={() => executeDelete(deleteId)} className="py-6 bg-rose-600 text-white font-black rounded-3xl shadow-xl shadow-rose-100 dark:shadow-none hover:bg-rose-700 transition-all uppercase text-[11px] tracking-widest">Confirm Delete</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentReports;
