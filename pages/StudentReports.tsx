
import React, { useState, useEffect, useMemo } from 'react';
import { User, Student } from '../types';
import { 
  FileBarChart, GraduationCap, Users, TrendingUp, Filter, Search, Download, FileText, 
  Trophy, AlertTriangle, Calendar, Printer, ChevronRight, PieChart as PieIcon,
  Activity, Star, History, LayoutGrid, Settings, Plus, Trash2, Edit2, X, MoveHorizontal, 
  Settings2, Save, CheckCircle2, ChevronDown, ChevronUp, Layers, Columns, Fingerprint,
  Info, ShieldCheck, Loader2, FolderPlus, Tags, RefreshCw, Layout, Edit3, FileSpreadsheet
} from 'lucide-react';
import { db, supabase } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';

interface StudentReportsProps { 
  user: User; 
  schoolLogo?: string | null;
  schoolName?: string;
}

interface ReportColumn {
  key: string;
  label: string;
  width: string;
  visible: boolean;
  isBlank?: boolean;
}

interface SchoolStructure {
  classes: string[];
  sections: string[];
  categories: string[];
}

// Comprehensive field list for report building
const MASTER_FIELDS = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'grNumber', label: 'GR Number' },
  { key: 'rollNo', label: 'Roll No' },
  { key: 'classSection', label: 'Class & Section' },
  { key: 'class', label: 'Class Only' },
  { key: 'section', label: 'Section Only' },
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
  { key: 'residenceAddress', label: 'Full Address' },
];

const StudentReports: React.FC<StudentReportsProps> = ({ user, schoolLogo, schoolName }) => {
  const [activeTab, setActiveTab] = useState<'VIEW' | 'DESIGNER' | 'STRUCTURE'>('VIEW');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Dynamic Structure States
  const [structure, setStructure] = useState<SchoolStructure>(() => {
    const saved = localStorage.getItem('school_structure_v4');
    return saved ? JSON.parse(saved) : {
      classes: ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'],
      sections: ['A', 'B', 'C'],
      categories: ['General', 'Scholarship', 'Hostel', 'EWS']
    };
  });

  // Dynamic Column States
  const [columns, setColumns] = useState<ReportColumn[]>(() => {
    const saved = localStorage.getItem('report_columns_config_v4');
    return saved ? JSON.parse(saved) : [
      { key: 'fullName', label: 'Student Name', width: '250px', visible: true },
      { key: 'grNumber', label: 'GR No', width: '120px', visible: true },
      { key: 'classSection', label: 'Class-Section', width: '140px', visible: true },
      { key: 'rollNo', label: 'Roll No', width: '100px', visible: true },
      { key: 'fatherMobile', label: 'Contact', width: '150px', visible: true }
    ];
  });

  const [filterClass, setFilterClass] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const data = await db.students.getAll();
      const mapped = data.map((s: any) => ({
        id: s.id,
        fullName: s.full_name,
        name: s.full_name,
        email: s.email,
        rollNo: s.roll_no,
        class: s.class,
        section: s.section,
        classSection: `${s.class || ''}-${s.section || ''}`,
        grNumber: s.gr_number,
        gender: s.gender,
        dob: s.dob,
        admissionDate: s.admission_date,
        aadharNo: s.aadhar_no,
        uidId: s.uid_id,
        penNo: s.pen_no,
        fatherName: s.father_name,
        fatherMobile: s.father_mobile,
        motherName: s.mother_name,
        motherMobile: s.mother_mobile,
        residenceAddress: s.residence_address
      }));
      setStudents(mapped);
    } catch (err) { 
      console.error("Report Fetch Error:", err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('reports-sync-live-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSaveConfig = async () => {
    setIsSyncing(true);
    localStorage.setItem('report_columns_config_v4', JSON.stringify(columns));
    localStorage.setItem('school_structure_v4', JSON.stringify(structure));
    await createAuditLog(user, 'UPDATE', 'Reports', 'Updated Students General Reports layout');
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

  const addBlankColumn = () => {
    const customId = `blank_${Date.now()}`;
    setColumns([...columns, { 
      key: customId, 
      label: 'New Blank Column', 
      width: '150px', 
      visible: true,
      isBlank: true 
    }]);
  };

  const removeColumn = (key: string) => {
    setColumns(columns.filter(c => c.key !== key));
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = filterClass === 'All' || s.class === filterClass;
      const name = (s.fullName || '').toLowerCase();
      const gr = (s.grNumber || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return matchesClass && (name.includes(query) || gr.includes(query));
    });
  }, [students, filterClass, searchQuery]);

  const availableToAdd = MASTER_FIELDS.filter(f => !columns.find(c => c.key === f.key));

  const exportToExcel = () => {
    const visibleCols = columns.filter(c => c.visible);
    // Convert headers to Uppercase
    const headers = ['SR.', ...visibleCols.map(c => c.label.toUpperCase())];
    
    const rows = filteredStudents.map((s, idx) => {
      return [
        idx + 1,
        ...visibleCols.map(c => {
          if (c.isBlank) return '';
          const val = (s as any)[c.key] || '-';
          // Force string and uppercase
          return String(val).toUpperCase();
        })
      ];
    });
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = `GENERAL_REPORT_CLASS_${filterClass.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    createAuditLog(user, 'EXPORT', 'Reports', `Exported Uppercase Excel for Class ${filterClass}`);
  };

  const handlePrintPdf = () => {
    // Set document title temporarily to influence default PDF filename
    const originalTitle = document.title;
    document.title = `GENERAL_REPORT_CLASS_${filterClass.toUpperCase()}`;
    window.print();
    // Revert after print dialog starts
    setTimeout(() => { document.title = originalTitle; }, 1000);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-report-area, #printable-report-area * { visibility: visible; }
          #printable-report-area {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white !important; padding: 0 !important;
          }
          .no-print { display: none !important; }
          .liner-cell { border-bottom: 1px solid #94a3b8 !important; height: 30px !important; display: block !important; margin-top: 10px !important; width: 100% !important; }
          table { border-collapse: collapse !important; width: 100% !important; border: 2px solid #000 !important; }
          th { background-color: #f1f5f9 !important; border: 1px solid #000 !important; padding: 12px 8px !important; font-size: 11px !important; font-weight: 900 !important; text-transform: uppercase !important; }
          td { border: 1px solid #000 !important; padding: 12px 8px !important; font-size: 11px !important; text-transform: uppercase !important; }
          thead { display: table-header-group !important; }
          @page { size: auto; margin: 15mm; }
        }
      `}</style>

      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cloud Database Syncing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Registry Updated</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Custom layout synchronized</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Students General Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg tracking-tight">Institutional general registries with custom field injection.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem] shadow-inner border border-slate-200 dark:border-slate-700">
           <button onClick={() => setActiveTab('VIEW')} className={`px-8 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'VIEW' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>Report View</button>
           <button onClick={() => setActiveTab('DESIGNER')} className={`px-8 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DESIGNER' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>Designer</button>
           <button onClick={() => setActiveTab('STRUCTURE')} className={`px-8 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'STRUCTURE' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>Setup</button>
        </div>
      </div>

      {activeTab === 'VIEW' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row gap-6 items-center no-print">
              <div className="relative group w-full max-w-md">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white shadow-inner" />
              </div>
              <div className="flex gap-3 overflow-x-auto w-full pb-2 xl:pb-0 custom-scrollbar">
                  <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 shrink-0">
                    <button onClick={() => setFilterClass('All')} className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterClass === 'All' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>All Grades</button>
                    {structure.classes.map(c => (
                      <button key={c} onClick={() => setFilterClass(c)} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterClass === c ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>{c}</button>
                    ))}
                  </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={exportToExcel} className="flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95"><FileSpreadsheet size={18}/> Download Excel</button>
                <button onClick={handlePrintPdf} className="flex items-center gap-2 px-6 py-4 bg-slate-900 dark:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-700 transition-all active:scale-95"><Printer size={18}/> Download PDF / Print</button>
              </div>
           </div>

           <div id="printable-report-area" className="bg-white dark:bg-slate-900 rounded-[4rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              {/* PRINT ONLY HEADER */}
              <div className="hidden print:block p-10 mb-6">
                <div className="flex justify-between items-center border-b-4 border-slate-900 pb-10">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-xl">
                      {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <div className="bg-indigo-600 w-full h-full text-white flex items-center justify-center font-black text-3xl">E</div>}
                    </div>
                    <div>
                      <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">{schoolName}</h1>
                      <p className="text-indigo-600 font-black text-xs uppercase tracking-[0.4em] mt-3">General Enrollment Registry</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 font-black text-[10px] uppercase mb-1">GRADE CATEGORY</p>
                    <p className="text-slate-900 font-black text-xl uppercase">{filterClass === 'All' ? 'Complete School' : `Class ${filterClass}`}</p>
                    <p className="text-slate-400 font-bold text-[9px] uppercase mt-2">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="py-40 flex flex-col items-center justify-center animate-pulse no-print">
                  <Loader2 className="animate-spin text-indigo-600" size={48} />
                  <p className="mt-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Accessing General Registry...</p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <th className="px-10 py-8" style={{ width: '80px' }}>Sr.</th>
                            {columns.filter(c => c.visible).map(col => (
                              <th key={col.key} className="px-8 py-8" style={{ width: col.width }}>{col.label}</th>
                            ))}
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                         {filteredStudents.map((student, idx) => (
                           <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group">
                              <td className="px-10 py-8 font-black text-slate-400 text-xs">{idx + 1}</td>
                              {columns.filter(c => c.visible).map(col => (
                                <td key={col.key} className="px-8 py-8 font-black text-slate-800 dark:text-slate-300 text-sm uppercase truncate" style={{ maxWidth: col.width }}>
                                  {col.isBlank ? (
                                    <div className="w-full liner-cell border-b border-slate-300 dark:border-slate-700 mt-2"></div>
                                  ) : (
                                    String((student as any)[col.key] || '-').toUpperCase()
                                  )}
                                </td>
                              ))}
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
              )}
              {filteredStudents.length === 0 && !isLoading && (
                <div className="py-40 flex flex-col items-center justify-center">
                  <Fingerprint size={80} strokeWidth={1} className="text-slate-100 dark:text-slate-800 mb-6" />
                  <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Registry Data Empty</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase mt-2">Zero enrollments found for class: {filterClass}</p>
                </div>
              )}

              {/* PRINT ONLY SIGNATURES */}
              <div className="hidden print:flex justify-between items-end p-20 mt-10">
                <div className="text-center">
                  <div className="w-48 border-b-2 border-slate-900 mb-2"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Class Teacher</p>
                </div>
                <div className="text-center">
                  <ShieldCheck size={40} className="text-slate-100 mb-2 mx-auto" />
                  <p className="text-[8px] font-bold text-slate-300 uppercase">Authenticated Record</p>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b-2 border-slate-900 mb-2"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Principal Seal</p>
                </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'DESIGNER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-right-4">
           <div className="lg:col-span-8 space-y-8">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
                 <div className="flex items-center justify-between mb-12">
                    <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4">
                       <Columns className="text-indigo-600" /> Report Table Designer
                    </h3>
                    <div className="flex gap-3">
                      <button onClick={handleSaveConfig} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl flex items-center gap-3 uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all">
                         <Save size={18} /> Sync View
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
                                {col.isBlank ? <Edit3 size={24}/> : <Layers size={24} />}
                             </button>
                             <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{col.isBlank ? 'Blank Column Label' : 'Field Display Label'}</p>
                                <input type="text" value={col.label} onChange={e => {
                                  const next = [...columns];
                                  next[index].label = e.target.value;
                                  setColumns(next);
                                }} className="bg-transparent font-black text-slate-800 dark:text-white uppercase outline-none focus:border-b-2 border-indigo-500 w-full text-lg" />
                             </div>
                          </div>
                          <div className="flex items-center gap-10">
                             <div className="w-40">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-right">Width (px)</p>
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
                 <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-4"><Plus className="text-indigo-400" /> Inject Registry Fields</h3>
                 <p className="text-slate-400 text-xs leading-relaxed uppercase font-bold tracking-widest mb-10">Choose standard attributes from the student profile to display in the general report grid.</p>
                 
                 <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-3 mb-10">
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
                 </div>

                 <div className="border-t border-white/10 pt-10">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.3em] mb-4">Manual Input Features</h4>
                    <button 
                      onClick={addBlankColumn}
                      className="w-full flex items-center justify-between p-8 bg-indigo-600/20 border border-indigo-600/30 rounded-3xl hover:bg-indigo-600 transition-all shadow-xl"
                    >
                       <div className="text-left">
                          <span className="block font-black text-sm uppercase tracking-tight text-white">Add Blank Column</span>
                          <span className="block text-[8px] font-bold text-indigo-300 uppercase mt-1">With Writing Liner Line</span>
                       </div>
                       <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-600 text-white">
                          <Edit3 size={24} strokeWidth={3} />
                       </div>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'STRUCTURE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-left-4">
           {/* Grades */}
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><GraduationCap size={24}/></div>
                   <h3 className="text-xl font-black uppercase tracking-tight">Institutional Grades</h3>
                 </div>
                 <button onClick={() => {
                    const name = prompt("Enter Grade Name:");
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
                    <h3 className="text-xl font-black uppercase tracking-tight">Active Sections</h3>
                 </div>
                 <button onClick={() => {
                    const name = prompt("Enter Section Name:");
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
        </div>
      )}
    </div>
  );
};

export default StudentReports;
