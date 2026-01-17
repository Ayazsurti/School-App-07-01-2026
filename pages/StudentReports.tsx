
import React, { useState, useEffect, useMemo } from 'react';
import { User, Student } from '../types';
import { 
  FileBarChart, GraduationCap, Users, TrendingUp, Filter, Search, Download, FileText, 
  Trophy, AlertTriangle, Calendar, Printer, ChevronRight, PieChart as PieIcon,
  Activity, Star, History, LayoutGrid, Settings, Plus, Trash2, Edit2, X, MoveHorizontal, 
  Settings2, Save, CheckCircle2, ChevronDown, ChevronUp, Layers, Columns, Fingerprint,
  Info, ShieldCheck, Loader2, FolderPlus, Tags, RefreshCw, Layout, Edit3, FileSpreadsheet,
  Eye
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

const MASTER_FIELDS = [
  { key: 'fullName', label: 'Student Full Name' },
  { key: 'grNumber', label: 'GR Number' },
  { key: 'rollNo', label: 'Roll Number' },
  { key: 'classSection', label: 'Standard-Section' },
  { key: 'gender', label: 'Gender' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'admissionDate', label: 'Admission Date' },
  { key: 'fatherName', label: 'Father Name' },
  { key: 'fatherMobile', label: 'Contact (F)' },
  { key: 'motherName', label: 'Mother Name' },
  { key: 'motherMobile', label: 'Contact (M)' },
  { key: 'residenceAddress', label: 'Residential Address' },
];

const StudentReports: React.FC<StudentReportsProps> = ({ user, schoolLogo, schoolName }) => {
  const [activeTab, setActiveTab] = useState<'VIEW' | 'DESIGNER'>('VIEW');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [columns, setColumns] = useState<ReportColumn[]>(() => {
    const saved = localStorage.getItem('report_columns_config_v5');
    return saved ? JSON.parse(saved) : [
      { key: 'fullName', label: 'Student Name', width: '250px', visible: true },
      { key: 'grNumber', label: 'GR No', width: '120px', visible: true },
      { key: 'classSection', label: 'Class', width: '120px', visible: true },
      { key: 'rollNo', label: 'Roll', width: '80px', visible: true },
      { key: 'fatherMobile', label: 'Mobile', width: '150px', visible: true }
    ];
  });

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
        fatherName: s.father_name,
        fatherMobile: s.father_mobile,
        motherName: s.mother_name,
        motherMobile: s.mother_mobile,
        residenceAddress: s.residence_address
      }));
      setStudents(mapped);
    } catch (err) { console.error("Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = filterClass === 'All' || s.class === filterClass;
      const name = (s.fullName || '').toLowerCase();
      const gr = (s.grNumber || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return matchesClass && (name.includes(query) || gr.includes(query));
    });
  }, [students, filterClass, searchQuery]);

  const handlePrintPdf = () => {
    const originalTitle = document.title;
    document.title = `REPORT_${filterClass.toUpperCase()}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 1000);
    createAuditLog(user, 'EXPORT', 'Reports', `Generated PDF Register for Class ${filterClass}`);
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
            margin: 0 !important;
          }
          .no-print { display: none !important; }
          
          /* "Lining Box" Professional Ledger CSS */
          table { 
            border-collapse: collapse !important; 
            width: 100% !important; 
            border: 2px solid #000 !important;
            table-layout: fixed !important;
          }
          th { 
            background-color: #f8fafc !important; 
            border: 1.5px solid #000 !important; 
            padding: 12px 6px !important; 
            font-size: 11px !important; 
            font-weight: 900 !important; 
            text-transform: uppercase !important;
            text-align: center !important;
            color: #000 !important;
          }
          td { 
            border: 1.5px solid #000 !important; 
            padding: 10px 8px !important; 
            font-size: 11px !important; 
            text-transform: uppercase !important;
            font-weight: 700 !important;
            color: #000 !important;
            word-wrap: break-word !important;
            line-height: 1.3 !important;
          }
          
          /* Row Zebra Effect for Legibility */
          tr:nth-child(even) { background-color: #f1f5f9 !important; }

          thead { display: table-header-group !important; }
          tfoot { display: table-footer-group !important; }
          
          @page { 
            size: A4 landscape; 
            margin: 10mm;
          }
          
          .print-header { 
            border-bottom: 5px solid #000 !important; 
            margin-bottom: 25px !important; 
            padding-bottom: 20px !important; 
          }
          
          .school-name-print {
            font-size: 34px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            color: #000 !important;
            letter-spacing: -1.5px !important;
          }
        }
      `}</style>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">General Report Center</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg tracking-tight">Institutional identity rosters with grid-matrix rendering.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={handlePrintPdf} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest"><Printer size={20}/> Open Browser PDF Viewer</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-center no-print">
         <div className="relative group w-full max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input type="text" placeholder="Filter Registry (Name/GR)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner dark:text-white" />
         </div>
         <div className="flex gap-2 overflow-x-auto w-full custom-scrollbar pb-1">
            <button onClick={() => setFilterClass('All')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterClass === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Full Registry</button>
            {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'].map(c => (
              <button key={c} onClick={() => setFilterClass(c)} className={`whitespace-nowrap px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${filterClass === c ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{c}</button>
            ))}
         </div>
      </div>

      <div id="printable-report-area" className="bg-white dark:bg-slate-900 rounded-[4rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
         {/* PDF HEADER */}
         <div className="hidden print:block p-12 mb-6 print-header">
            <div className="flex justify-between items-center pb-10">
               <div className="flex items-center gap-10">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-slate-200 shadow-2xl bg-white">
                    {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <div className="bg-slate-950 w-full h-full text-white flex items-center justify-center font-black text-5xl">E</div>}
                  </div>
                  <div>
                    <h1 className="school-name-print">{schoolName}</h1>
                    <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.6em] mt-4">Verified Institutional Document • Academic Session 2025-26</p>
                    <div className="flex gap-10 mt-6 opacity-60">
                       <p className="text-xs font-black uppercase tracking-widest border-r pr-10 border-black">Master Node Sync: Active</p>
                       <p className="text-xs font-black uppercase tracking-widest">Registry: General Enrollment</p>
                    </div>
                  </div>
               </div>
               <div className="text-right flex flex-col justify-center">
                  <div className="p-6 bg-slate-50 border-2 border-black rounded-[2rem]">
                     <p className="text-slate-500 font-black text-[10px] uppercase mb-1 tracking-widest">Filter Context</p>
                     <p className="text-black font-black text-3xl uppercase leading-none">{filterClass === 'All' ? 'Consolidated School' : `Grade: ${filterClass}`}</p>
                  </div>
                  <p className="text-slate-400 font-black text-[10px] uppercase mt-4 tracking-widest">Generated: {new Date().toLocaleDateString('en-GB')}</p>
               </div>
            </div>
         </div>

         {isLoading ? (
           <div className="py-40 flex flex-col items-center justify-center animate-pulse no-print">
             <Loader2 className="animate-spin text-indigo-600" size={64} />
             <p className="mt-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Opening Archive...</p>
           </div>
         ) : (
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 no-print">
                       <th className="px-10 py-8" style={{ width: '80px' }}>Sr.</th>
                       {columns.filter(c => c.visible).map(col => (
                         <th key={col.key} className="px-8 py-8" style={{ width: col.width }}>{col.label}</th>
                       ))}
                    </tr>
                    {/* PDF Table Header - Visible only in Print/PDF Mode */}
                    <tr className="hidden print:table-row">
                       <th style={{ width: '50px' }}>S.N.</th>
                       {columns.filter(c => c.visible).map(col => (
                         <th key={col.key} style={{ width: col.width }}>{col.label}</th>
                       ))}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800 border-b border-slate-200">
                    {filteredStudents.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group">
                         <td className="px-10 py-8 print:px-2 print:py-4 print:text-center font-black text-slate-400 print:text-black text-sm">{idx + 1}</td>
                         {columns.filter(c => c.visible).map(col => (
                           <td key={col.key} className="px-8 py-8 print:px-2 print:py-4 font-black text-slate-800 dark:text-slate-300 print:text-black text-sm uppercase truncate" style={{ maxWidth: col.width }}>
                              {String((student as any)[col.key] || '-').toUpperCase()}
                           </td>
                         ))}
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                       <tr>
                          <td colSpan={columns.filter(c => c.visible).length + 1} className="py-20 text-center text-slate-400 font-black uppercase text-xs">No entries found matching parameters</td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
         )}
         
         {/* PDF FOOTER */}
         <div className="hidden print:flex justify-between items-end p-24 mt-16">
            <div className="text-center">
               <div className="w-72 border-b-2 border-black mb-4"></div>
               <p className="text-xs font-black uppercase tracking-widest text-black">Office Registrar</p>
            </div>
            <div className="text-center">
               <ShieldCheck size={64} className="text-slate-200 mb-2 mx-auto" />
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Official Data Verification</p>
               <p className="text-[9px] font-bold text-slate-300 uppercase mt-2">Token: {Math.random().toString(36).substr(2, 12).toUpperCase()}</p>
            </div>
            <div className="text-center">
               <div className="w-72 border-b-2 border-black mb-4"></div>
               <p className="text-xs font-black uppercase tracking-widest text-black">Headmaster / Principal</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default StudentReports;
