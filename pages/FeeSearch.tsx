
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, FeeRecord } from '../types';
import { 
  SearchCode, 
  Search, 
  User as UserIcon, 
  Receipt, 
  Printer, 
  ChevronRight, 
  ShieldCheck, 
  Calendar,
  FileSpreadsheet,
  Download,
  AlertCircle,
  LayoutGrid,
  TrendingUp,
  Banknote,
  X
} from 'lucide-react';
import { MOCK_STUDENTS, APP_NAME } from '../constants';

interface FeeSearchProps {
  user: User;
  schoolLogo: string | null;
}

const FeeSearch: React.FC<FeeSearchProps> = ({ user, schoolLogo }) => {
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'LEDGER'>('STUDENT');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const students = useMemo(() => {
    const saved = localStorage.getItem('school_students_db');
    if (saved) return JSON.parse(saved) as Student[];
    return MOCK_STUDENTS.map(s => ({
      ...s,
      email: `${s.rollNo}@school.com`,
      role: 'STUDENT' as const,
      profileImage: ''
    })) as any as Student[];
  }, []);

  const ledger: FeeRecord[] = useMemo(() => {
    const saved = localStorage.getItem('school_fees_ledger_v2');
    return saved ? JSON.parse(saved) : [];
  }, [selectedStudent, activeTab]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return students.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      /* Fix: Property 'grNo' does not exist on type 'Student'. Replaced with 'grNumber'. */
      s.grNumber.includes(searchQuery)
    ).slice(0, 10);
  }, [students, searchQuery]);

  const studentRecords = useMemo(() => {
    if (!selectedStudent) return [];
    return ledger.filter(r => r.studentId === selectedStudent.id);
  }, [ledger, selectedStudent]);

  const totalCollected = useMemo(() => {
    return ledger.reduce((acc, curr) => acc + curr.amount, 0);
  }, [ledger]);

  const exportLedgerToExcel = () => {
    if (ledger.length === 0) return;
    const headers = ['Receipt No', 'Date', 'Amount', 'Fee Types', 'Student Name', 'ID'];
    const rows = ledger.map(r => {
      const student = students.find(s => s.id === r.studentId);
      /* Fix: Property 'grNo' does not exist on type 'Student'. Replaced with 'grNumber'. */
      return [r.receiptNo, r.date, r.amount, `"${r.type}"`, student?.name || 'Unknown', student?.grNumber || 'N/A'];
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `School_Collection_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-terminal, .print-terminal * { visibility: visible; }
          .print-terminal {
            position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">Financial Registry</h1>
          <p className="text-slate-500 font-medium text-lg">Comprehensive auditing and master collection tracking.</p>
        </div>
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 no-print">
           <button 
            onClick={() => setActiveTab('STUDENT')}
            className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'STUDENT' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
           >
              Query Student
           </button>
           <button 
            onClick={() => setActiveTab('LEDGER')}
            className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'LEDGER' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
           >
              Master Ledger
           </button>
        </div>
      </div>

      {activeTab === 'STUDENT' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          <div className="xl:col-span-1 space-y-6">
             <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 no-print">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Archive Search</label>
                <div className="relative group mb-6">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Name, GR No or Roll..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                   />
                </div>

                {filteredStudents.length > 0 && (
                  <div className="space-y-2 mb-2">
                     {filteredStudents.map(s => (
                       <button 
                        key={s.id}
                        onClick={() => { setSelectedStudent(s); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${selectedStudent?.id === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                       >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedStudent?.id === s.id ? 'bg-white text-indigo-600' : 'bg-slate-100 text-indigo-600'}`}>
                             {s.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                             <p className="font-black text-sm truncate uppercase">{s.name}</p>
                             {/* Fix: Property 'grNo' does not exist on type 'Student'. Replaced with 'grNumber'. */}
                             <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedStudent?.id === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>GR: {s.grNumber} • Std {s.class}</p>
                          </div>
                          <ChevronRight size={16} className={selectedStudent?.id === s.id ? 'text-white' : 'text-slate-300'} />
                       </button>
                     ))}
                  </div>
                )}
             </div>

             <div className="bg-indigo-900 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden group no-print">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                <SearchCode size={40} className="text-indigo-400 mb-6" />
                <h4 className="text-2xl font-black mb-2 leading-tight uppercase tracking-tight">Ledger Access</h4>
                <p className="text-indigo-300 text-sm font-medium leading-relaxed">Fetch student profiles to review transaction timelines, download past receipts, and audit specific payments.</p>
             </div>
          </div>

          <div className="xl:col-span-2 space-y-8">
             {selectedStudent ? (
               <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-right-4 duration-500">
                  <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                           <UserIcon size={28} />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">{selectedStudent.name}</h3>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Financial Archive • Std {selectedStudent.class}</p>
                        </div>
                     </div>
                  </div>

                  <div className="p-10">
                     {studentRecords.length > 0 ? (
                       <div className="space-y-4">
                          {studentRecords.map(record => (
                            <div 
                              key={record.id}
                              className="p-6 bg-slate-50/80 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white hover:shadow-xl hover:shadow-indigo-100/30 transition-all group"
                            >
                               <div className="flex items-center gap-6">
                                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                     <Receipt size={24} />
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{record.receiptNo}</p>
                                     <h4 className="font-black text-slate-800 text-sm uppercase truncate max-w-[250px]">{record.type}</h4>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-2"><Calendar size={12} /> VERIFIED {record.date}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-8">
                                  <div className="text-right">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Verified</p>
                                     <p className="text-xl font-black text-slate-900">₹{record.amount.toLocaleString('en-IN')}</p>
                                  </div>
                                  <button 
                                    onClick={() => setSelectedReceipt({ ...record, student: selectedStudent })}
                                    className="p-4 bg-white text-indigo-600 rounded-2xl shadow-sm border border-slate-100 hover:bg-indigo-600 hover:text-white transition-all"
                                  >
                                     <Printer size={20} />
                                  </button>
                               </div>
                            </div>
                          ))}
                       </div>
                     ) : (
                       <div className="py-24 text-center border-4 border-dashed border-slate-50 rounded-[3rem] bg-slate-50/20">
                          <AlertCircle size={48} className="mx-auto text-slate-200 mb-4" />
                          <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Zero Transactions Found</h4>
                          <p className="text-slate-400 font-medium max-w-xs mx-auto mt-1">This student has no archived financial records in the active session registry.</p>
                       </div>
                     )}
                  </div>
               </div>
             ) : (
               <div className="bg-white/70 backdrop-blur-xl p-32 rounded-[3rem] text-center border-4 border-dashed border-white/50 flex flex-col items-center justify-center h-full no-print">
                  <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                     <Search size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-800 mb-3 uppercase tracking-tight">Institutional Ledger</h3>
                  <p className="text-slate-500 font-medium max-w-sm mx-auto text-lg leading-relaxed">Search and authenticate a student identity via the terminal to audit their specific fiscal history.</p>
               </div>
             )}
          </div>
        </div>
      ) : (
        /* MASTER LEDGER VIEW - COLLECTION REPORTS */
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
              <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100/50">
                 <div className="flex items-center justify-between mb-4">
                    <TrendingUp size={24} className="text-indigo-200" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Master Aggregate</span>
                 </div>
                 <p className="text-4xl font-black tracking-tighter">₹{totalCollected.toLocaleString('en-IN')}</p>
                 <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mt-2">Total Session Collection</p>
              </div>
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                 <div className="flex items-center justify-between mb-4">
                    <Receipt size={24} className="text-slate-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Entries</span>
                 </div>
                 <p className="text-4xl font-black text-slate-900 tracking-tighter">{ledger.length}</p>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Verified Transactions</p>
              </div>
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-center gap-3">
                 <button 
                  onClick={exportLedgerToExcel}
                  className="w-full py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                 >
                    <FileSpreadsheet size={18} /> Download Excel Ledger
                 </button>
                 <button 
                  onClick={() => window.print()}
                  className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:bg-slate-800"
                 >
                    <Printer size={18} /> Print Branded Report
                 </button>
              </div>
           </div>

           <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden print-terminal">
              <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between no-print">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Comprehensive Collection Registry</h3>
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archive: Session 2026-27</div>
              </div>

              {/* PRINT ONLY HEADER */}
              <div className="hidden print:block p-10 border-b-4 border-slate-900 mb-10">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-xl flex items-center justify-center border-2 border-slate-100 overflow-hidden">
                          {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <div className="font-black text-2xl">E</div>}
                       </div>
                       <div>
                          <h2 className="text-3xl font-black uppercase tracking-tighter">{APP_NAME}</h2>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Institutional Collection Report</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase">Report Issued</p>
                       <p className="text-xl font-black text-slate-900">{new Date().toLocaleDateString()}</p>
                    </div>
                 </div>
              </div>

              <div className="p-10">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                             <th className="px-8 py-5">Receipt ID</th>
                             <th className="px-8 py-5">Student Identity</th>
                             <th className="px-8 py-5">Transaction Details</th>
                             <th className="px-8 py-5">Date</th>
                             <th className="px-8 py-5 text-right">Commit (₹)</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {ledger.map(record => {
                             const student = students.find(s => s.id === record.studentId);
                             return (
                               <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-8 py-6 font-black text-indigo-600 text-xs">{record.receiptNo}</td>
                                  <td className="px-8 py-6">
                                     <p className="font-black text-slate-800 text-sm uppercase">{student?.name || 'Unknown'}</p>
                                     {/* Fix: Property 'grNo' does not exist on type 'Student'. Replaced with 'grNumber'. */}
                                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">GR: {student?.grNumber || 'N/A'}</p>
                                  </td>
                                  <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase leading-relaxed max-w-[200px]">{record.type}</td>
                                  <td className="px-8 py-6 text-xs font-black text-slate-700">{record.date}</td>
                                  <td className="px-8 py-6 text-right font-black text-slate-900">₹{record.amount.toLocaleString('en-IN')}</td>
                               </tr>
                             );
                          })}
                          {ledger.length === 0 && (
                            <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold uppercase text-xs">No collections recorded yet.</td></tr>
                          )}
                       </tbody>
                       <tfoot className="bg-slate-900 text-white">
                          <tr>
                             <td colSpan={4} className="px-8 py-6 text-xs font-black uppercase tracking-[0.3em]">Master Aggregate Realized</td>
                             <td className="px-8 py-6 text-right text-2xl font-black">₹{totalCollected.toLocaleString('en-IN')}</td>
                          </tr>
                       </tfoot>
                    </table>
                 </div>
              </div>

              {/* PRINT ONLY FOOTER */}
              <div className="hidden print:block p-10 mt-20 border-t-2 border-dashed border-slate-200">
                 <div className="flex justify-between items-end opacity-50">
                    <p className="text-[8px] font-black text-slate-400">System Generated Document • Official Ledger Copy</p>
                    <div className="text-center">
                       <div className="w-48 border-b border-slate-900 mb-1"></div>
                       <p className="text-[8px] font-black text-slate-900 uppercase">Authorized Financial Controller</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Branded Individual Receipt Terminal Viewer */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-[650] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 lg:p-10 no-print animate-in zoom-in-95 duration-300">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl p-16 relative overflow-hidden flex flex-col print-terminal">
              {/* Header Close */}
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-colors no-print"
              >
                 <X size={32} />
              </button>

              <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-12">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl border-2 border-slate-100 overflow-hidden">
                       {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <div className="font-black text-3xl">E</div>}
                    </div>
                    <div>
                       <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{APP_NAME}</h2>
                       <p className="text-indigo-600 font-black text-[9px] uppercase tracking-[0.3em] mt-1">Official Fee Receipt Certificate</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-slate-400 font-black text-[9px] uppercase mb-1 tracking-widest">Receipt ID</p>
                    <p className="text-slate-900 font-black text-xl">{selectedReceipt.receiptNo}</p>
                 </div>
              </div>

              <div className="space-y-10 flex-1">
                 <div className="grid grid-cols-2 gap-10">
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Payee Identity</p>
                       <p className="text-lg font-black text-slate-900 uppercase leading-tight">{selectedReceipt.student.name}</p>
                       {/* Fix: Property 'grNo' does not exist on type 'Student'. Replaced with 'grNumber'. */}
                       <p className="text-xs font-bold text-slate-500 mt-1 uppercase">GR: {selectedReceipt.student.grNumber} • Std {selectedReceipt.student.class}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Date of Issue</p>
                       <p className="text-lg font-black text-slate-900 uppercase leading-tight">{selectedReceipt.date}</p>
                       <p className="text-xs font-bold text-indigo-600 mt-1 uppercase tracking-widest">Verified Payment</p>
                    </div>
                 </div>

                 <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Allocation Summary</p>
                    <div className="flex justify-between items-end">
                       <h4 className="text-xl font-black text-slate-800 uppercase leading-relaxed max-w-[200px]">{selectedReceipt.type}</h4>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Commit</p>
                          <p className="text-4xl font-black text-slate-900 leading-none tracking-tighter">₹{selectedReceipt.amount.toLocaleString('en-IN')}</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 p-6 bg-emerald-50 rounded-[1.5rem] border border-emerald-100">
                    <ShieldCheck className="text-emerald-600" size={28} />
                    <p className="text-[11px] font-bold text-emerald-800 leading-relaxed uppercase tracking-widest">
                       This document serves as the official legal proof of payment and is digitally authenticated by the school financial registry.
                    </p>
                 </div>
              </div>

              <div className="mt-16 pt-10 border-t-2 border-dashed border-slate-200 flex justify-between items-center">
                 <button 
                  onClick={() => window.print()}
                  className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 uppercase text-xs tracking-widest hover:bg-slate-800 no-print"
                 >
                    <Printer size={18} /> Print Record
                 </button>
                 <div className="text-center">
                    <div className="w-48 border-b-2 border-slate-900 mb-1"></div>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Authorized Signatory</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FeeSearch;
