
import React, { useState, useEffect, useMemo } from 'react';
import { User, Student } from '../types';
import { 
  GraduationCap, Users, Search, LayoutGrid, Layers, Tags, Star, 
  ChevronRight, ClipboardList, Cake, FileSpreadsheet, FileDown, 
  Printer, Loader2, RefreshCw, CheckCircle2, ShieldCheck, ArrowRight
} from 'lucide-react';
import { db, supabase } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';

interface StudentReportsProps { 
  user: User; 
  schoolLogo?: string | null;
  schoolName?: string;
}

type ReportModule = 
  | 'ADMISSION' 
  | 'GENERAL_LIST' 
  | 'CLASSWISE' 
  | 'SECTIONWISE' 
  | 'CATEGORYWISE' 
  | 'AGE_REPORT' 
  | 'BIRTH_REPORT';

interface ReportColumn {
  key: string;
  label: string;
  width: string;
}

const MODULES: { id: ReportModule, title: string, icon: any }[] = [
  { id: 'ADMISSION', title: 'Admission Registry', icon: <ClipboardList size={18} /> },
  { id: 'GENERAL_LIST', title: 'Student Master List', icon: <Users size={18} /> },
  { id: 'CLASSWISE', title: 'Classwise Roster', icon: <LayoutGrid size={18} /> },
  { id: 'SECTIONWISE', title: 'Section Ledger', icon: <Layers size={18} /> },
  { id: 'CATEGORYWISE', title: 'Category Matrix', icon: <Tags size={18} /> },
  { id: 'AGE_REPORT', title: 'Age Analysis', icon: <Cake size={18} /> },
  { id: 'BIRTH_REPORT', title: 'Birth Registry', icon: <Star size={18} /> },
];

const CLASS_ORDER = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const StudentReports: React.FC<StudentReportsProps> = ({ user, schoolLogo, schoolName }) => {
  const [activeModule, setActiveModule] = useState<ReportModule>('ADMISSION');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Quick-Tap Filters
  const [filterClass, setFilterClass] = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await db.students.getAll();
      const mapped = data.map((s: any) => ({
        ...s,
        id: s.id,
        fullName: s.full_name,
        grNumber: s.gr_number,
        rollNo: s.roll_no,
        class: s.class,
        section: s.section,
        gender: s.gender,
        dob: s.dob,
        admissionDate: s.admission_date,
        fatherName: s.father_name,
        fatherMobile: s.father_mobile,
        motherName: s.mother_name,
        birthPlace: s.birth_place || '-'
      }));
      setStudents(mapped);
    } catch (err) { console.error("Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('reports-live-sync-v10')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Strict Column Ordering: Roll, GR, Name first. NO PHOTOS.
  const reportColumns = useMemo((): ReportColumn[] => {
    const core = [
      { key: 'rollNo', label: 'ROLL NO', width: '80px' },
      { key: 'grNumber', label: 'GR NO', width: '100px' },
      { key: 'fullName', label: 'STUDENT NAME', width: '250px' },
    ];

    switch (activeModule) {
      case 'ADMISSION':
        return [
          ...core,
          { key: 'admissionDate', label: 'ADM DATE', width: '120px' },
          { key: 'class', label: 'CLASS', width: '80px' },
          { key: 'fatherName', label: 'FATHER NAME', width: '180px' },
          { key: 'fatherMobile', label: 'MOBILE', width: '120px' }
        ];
      case 'BIRTH_REPORT':
        return [
          ...core,
          { key: 'dob', label: 'DATE OF BIRTH', width: '120px' },
          { key: 'birthPlace', label: 'BIRTH PLACE', width: '150px' },
          { key: 'motherName', label: 'MOTHER NAME', width: '180px' }
        ];
      default:
        return [
          ...core,
          { key: 'class', label: 'CLASS', width: '80px' },
          { key: 'section', label: 'SEC', width: '60px' },
          { key: 'fatherMobile', label: 'CONTACT', width: '120px' }
        ];
    }
  }, [activeModule]);

  const filteredData = useMemo(() => {
    let list = students.filter(s => {
      const matchesClass = filterClass === 'All' || s.class === filterClass;
      const matchesSection = filterSection === 'All' || s.section === filterSection;
      const query = searchQuery.toLowerCase();
      const matchesSearch = (s.fullName || '').toLowerCase().includes(query) || (s.grNumber || '').toLowerCase().includes(query);
      return matchesClass && matchesSection && matchesSearch;
    });

    return list.sort((a, b) => {
      const classA = CLASS_ORDER.indexOf(a.class);
      const classB = CLASS_ORDER.indexOf(b.class);
      if (classA !== classB) return classA - classB;
      const rollA = parseInt(a.rollNo) || 0;
      const rollB = parseInt(b.rollNo) || 0;
      return rollA - rollB;
    });
  }, [students, filterClass, filterSection, searchQuery]);

  const handlePrint = () => {
    if (filteredData.length === 0) {
      alert("No data available to print.");
      return;
    }
    createAuditLog(user, 'EXPORT', 'Registry', `PDF Print: ${activeModule} (Std ${filterClass})`);
    window.print();
  };

  const handleExcelExport = () => {
    if (filteredData.length === 0) return;
    const headers = ["SR", ...reportColumns.map(c => c.label)];
    const rows = filteredData.map((s, idx) => [
      idx + 1,
      ...reportColumns.map(col => String((s as any)[col.key] || '-').toUpperCase())
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeModule}_REPORT_${filterClass}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 relative">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-document-terminal, #report-document-terminal * { visibility: visible; }
          #report-document-terminal {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white !important; padding: 0 !important; margin: 0 !important;
          }
          .no-print { display: none !important; }
          table { border-collapse: collapse !important; width: 100% !important; border: 1.5px solid #000 !important; table-layout: fixed !important; }
          th { background-color: #f1f5f9 !important; border: 1.5px solid #000 !important; padding: 10px 4px !important; font-size: 10px !important; font-weight: 900 !important; text-transform: uppercase !important; color: #000 !important; text-align: center !important; }
          td { border: 1.5px solid #000 !important; padding: 8px 6px !important; font-size: 10px !important; text-transform: uppercase !important; font-weight: 700 !important; color: #000 !important; word-wrap: break-word !important; }
          tr:nth-child(even) { background-color: #fafafa !important; }
          @page { size: A4 landscape; margin: 8mm; }
        }
      `}</style>

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} />
              <p className="font-black text-xs uppercase tracking-widest">Excel Data Generated</p>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Reports Terminal</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-xs tracking-widest">Institutional Registry • All Records in CAPITAL</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExcelExport} className="flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 transition-all uppercase text-[10px] tracking-widest"><FileSpreadsheet size={18}/> Export Excel</button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest"><FileDown size={18}/> Download PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 no-print">
        {/* Sidebar Modules with Indexing */}
        <div className="lg:col-span-3 space-y-4">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 ml-1">Archive Index</h3>
              <div className="space-y-1.5">
                 {MODULES.map((mod, index) => (
                    <button 
                      key={mod.id} 
                      onClick={() => setActiveModule(mod.id)}
                      className={`w-full flex items-center justify-between gap-4 px-6 py-4 rounded-2xl transition-all group ${activeModule === mod.id ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                       <div className="flex items-center gap-4">
                          <span className={`text-[10px] font-black ${activeModule === mod.id ? 'text-indigo-200' : 'text-slate-300'}`}>{String(index + 1).padStart(2, '0')}</span>
                          <span className="text-[11px] font-black uppercase tracking-widest">{mod.title}</span>
                       </div>
                       <ChevronRight size={14} className={activeModule === mod.id ? 'text-white' : 'text-slate-200'} />
                    </button>
                 ))}
              </div>
           </div>
        </div>

        {/* Improved Selection Grid Filters */}
        <div className="lg:col-span-9 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-10">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instant Registry Search</label>
                 <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input type="text" placeholder="Identity name or GR number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner dark:text-white uppercase text-sm" />
                 </div>
              </div>

              {/* Standard Selection Buttons */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Standard / Grade</label>
                    <button onClick={() => setFilterClass('All')} className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg ${filterClass === 'All' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>All Grades</button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {CLASS_ORDER.map(c => (
                       <button 
                         key={c} 
                         onClick={() => setFilterClass(c)}
                         className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${filterClass === c ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-indigo-100 hover:text-indigo-600'}`}
                       >
                         Std {c}
                       </button>
                    ))}
                 </div>
              </div>

              {/* Section Selection Buttons */}
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Select Section</label>
                 <div className="flex flex-wrap gap-2">
                    <button onClick={() => setFilterSection('All')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${filterSection === 'All' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}>All Sections</button>
                    {SECTIONS.map(s => (
                       <button 
                         key={s} 
                         onClick={() => setFilterSection(s)}
                         className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${filterSection === s ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-indigo-100 hover:text-indigo-600'}`}
                       >
                         {s}
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           {/* Report Data Matrix */}
           <div id="report-document-terminal" className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[600px]">
              {/* Institutional PDF Header */}
              <div className="hidden print:block p-12 border-b-4 border-black mb-8 text-center">
                 <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center bg-white shadow-xl">
                       {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <GraduationCap size={40} className="text-black" />}
                    </div>
                    <div>
                       <h1 className="text-4xl font-black uppercase text-black tracking-tighter leading-none">{schoolName || 'EDU MANAGE PRO'}</h1>
                       <p className="text-indigo-600 font-black text-[9px] uppercase tracking-[0.5em] mt-2">Certified Institutional Registry • Session 2025-26</p>
                       <div className="inline-block mt-6 px-10 py-2 border-2 border-black rounded-full font-black text-xs uppercase tracking-widest">{activeModule.replace('_', ' ')}: Std {filterClass} - {filterSection}</div>
                    </div>
                 </div>
                 <div className="mt-10 flex justify-between items-end pt-4 opacity-60">
                    <div className="text-left text-[8px] font-black uppercase tracking-[0.3em]">Node ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</div>
                    <div className="text-right text-[8px] font-black uppercase tracking-[0.3em]">Registry Date: {new Date().toLocaleDateString('en-GB')}</div>
                 </div>
              </div>

              {isLoading ? (
                <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 className="animate-spin text-indigo-600" size={64} /></div>
              ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 no-print">
                            <th className="px-10 py-6" style={{ width: '70px' }}>SR.</th>
                            {reportColumns.map(col => <th key={col.key} className="px-6 py-6" style={{ width: col.width }}>{col.label}</th>)}
                         </tr>
                         <tr className="hidden print:table-row">
                            <th style={{ width: '40px' }}>SN.</th>
                            {reportColumns.map(col => <th key={col.key}>{col.label}</th>)}
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                         {filteredData.map((student, idx) => (
                           <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-10 py-6 print:px-2 print:py-4 print:text-center font-black text-slate-400 print:text-black text-[11px] tracking-tighter">{(idx + 1).toString().padStart(2, '0')}</td>
                              {reportColumns.map(col => (
                                <td key={col.key} className="px-6 py-6 print:px-2 print:py-4 font-black text-slate-800 dark:text-slate-300 print:text-black text-[11px] uppercase truncate">
                                   {String((student as any)[col.key] || '-').toUpperCase()}
                                </td>
                              ))}
                           </tr>
                         ))}
                         {filteredData.length === 0 && (
                            <tr>
                               <td colSpan={reportColumns.length + 1} className="py-32 text-center text-slate-300 font-black uppercase text-xs italic tracking-[0.4em]">Archive is empty for current parameters.</td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
              )}

              {/* Institutional Footer for PDF */}
              <div className="hidden print:flex justify-between items-end p-20 mt-8">
                 <div className="text-center">
                    <div className="w-56 border-b-2 border-black mb-1"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black">Office Registrar</p>
                 </div>
                 <div className="text-center opacity-30">
                    <ShieldCheck size={40} className="text-black mx-auto mb-2" />
                    <p className="text-[7px] font-bold text-black uppercase tracking-[0.4em]">Official Digital Stamp</p>
                 </div>
                 <div className="text-center">
                    <div className="w-56 border-b-2 border-black mb-1"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black">Principal Signature</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReports;
