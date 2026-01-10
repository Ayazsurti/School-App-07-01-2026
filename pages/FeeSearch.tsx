
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
  X,
  Globe,
  Building2
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
    const saved = localStorage.getItem('school_students_db_v4');
    if (saved) return JSON.parse(saved) as Student[];
    return MOCK_STUDENTS as any as Student[];
  }, []);

  const ledger: FeeRecord[] = useMemo(() => {
    const saved = localStorage.getItem('school_fees_ledger_v2');
    return saved ? JSON.parse(saved) : [];
  }, [selectedStudent, activeTab]);

  const auditLogs = useMemo(() => {
    const saved = localStorage.getItem('school_audit_logs_v4');
    return saved ? JSON.parse(saved) : [];
  }, []);

  const getModeFromAudit = (receiptNo: string) => {
    const log = auditLogs.find((l: any) => l.details.includes(receiptNo));
    if (!log) return 'OFFLINE';
    if (log.details.includes('[ONLINE]')) return 'ONLINE';
    if (log.details.includes('[CHEQUE]')) return 'CHEQUE';
    return 'OFFLINE';
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return students.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
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
    const headers = ['Receipt No', 'Date', 'Amount', 'Mode', 'Fee Types', 'Student Name', 'ID'];
    const rows = ledger.map(r => {
      const student = students.find(s => s.id === r.studentId);
      const mode = getModeFromAudit(r.receiptNo);
      return [r.receiptNo, r.date, r.amount, mode, `"${r.type}"`, student?.name || 'Unknown', student?.grNumber || 'N/A'];
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
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Financial Registry</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Integrated Online & Offline transaction ledger tracking.</p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1 no-print border border-slate-200 dark:border-slate-700">
           <button 
            onClick={() => setActiveTab('STUDENT')}
            className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'STUDENT' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
           >
              Individual Audit
           </button>
           <button 
            onClick={() => setActiveTab('LEDGER')}
            className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'LEDGER' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
           >
              Institutional Ledger
           </button>
        </div>
      </div>

      {activeTab === 'STUDENT' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          <div className="xl:col-span-1 space-y-6">
             <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 no-print">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Identity Fetch</label>
                <div className="relative group mb-6">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Name, GR No or Roll..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                   />
                </div>

                {filteredStudents.length > 0 && (
                  <div className="space-y-2 mb-2">
                     {filteredStudents.map(s => (
                       <button 
                        key={s.id}
                        onClick={() => { setSelectedStudent(s); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${selectedStudent?.id === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                       >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedStudent?.id === s.id ? 'bg-white text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-indigo-600'}`}>
                             {s.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                             <p className="font-black text-sm truncate uppercase">{s.name}</p>
                             <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedStudent?.id === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>GR: {s.grNumber} • Std {s.class}</p>
                          </div>
                          <ChevronRight size={16} className={selectedStudent?.id === s.id ? 'text-white' : 'text-slate-300'} />
                       </button>
                     ))}
                  </div>
                )}
             </div>
          </div>

          <div className="xl:col-span-2 space-y-8">
             {selectedStudent ? (
               <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-right-4 duration-500">
                  <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                           <UserIcon size={28} />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{selectedStudent.name}</h3>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Profile History • GR {selectedStudent.grNumber}</p>
                        </div>
                     </div>
                  </div>

                  <div className="p-10">
                     {studentRecords.length > 0 ? (
                       <div className="space-y-4">
                          {studentRecords.map(record => {
                             const mode = getModeFromAudit(record.receiptNo);
                             return (
                                <div 
                                  key={record.id}
                                  className="p-6 bg-slate-50/80 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all group"
                                >
                                   <div className="flex items-center gap-6">
                                      <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                         {mode === 'ONLINE' ? <Globe size={24} /> : mode === 'CHEQUE' ? <Building2 size={24} /> : <Banknote size={24} />}
                                      </div>
                                      <div>
                                         <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{record.receiptNo} • {mode}</p>
                                         <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase truncate max-w-[250px]">{record.type}</h4>
                                         <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-2"><Calendar size={12} /> VERIFIED {record.date}</p>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-8">
                                      <div className="text-right">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate</p>
                                         <p className="text-xl font-black text-slate-900 dark:text-white">₹{record.amount.toLocaleString('en-IN')}</p>
                                      </div>
                                      <button 
                                        onClick={() => setSelectedReceipt({ ...record, student: selectedStudent, mode })}
                                        className="p-4 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 hover:bg-indigo-600 hover:text-white transition-all"
                                      >
                                         <Printer size={20} />
                                      </button>
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                     ) : (
                       <div className="py-24 text-center border-4 border-dashed border-slate-50 dark:border-slate-800 rounded-[3rem] bg-slate-50/20">
                          <AlertCircle size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                          <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Zero Transactions Found</h4>
                       </div>
                     )}
                  </div>
               </div>
             ) : (
               <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl p-32 rounded-[3rem] text-center border-4 border-dashed border-white/50 dark:border-slate-800 flex flex-col items-center justify-center h-full no-print">
                  <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 text-slate-200 dark:text-slate-700 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                     <Search size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-3 uppercase tracking-tight">Financial Terminal</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto text-lg leading-relaxed uppercase tracking-tight">Bind student identity to fetch fiscal ledger records.</p>
               </div>
             )}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
              <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100/50">
                 <div className="flex items-center justify-between mb-4">
                    <TrendingUp size={24} className="text-indigo-200" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Aggregate</span>
                 </div>
                 <p className="text-4xl font-black tracking-tighter">₹{totalCollected.toLocaleString('en-IN')}</p>
                 <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mt-2">Total Combined Collection</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                 <div className="flex items-center justify-between mb-4">
                    <Receipt size={24} className="text-slate-300 dark:text-slate-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archived Tokens</span>
                 </div>
                 <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{ledger.length}</p>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Verified Entries</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center gap-3">
                 <button onClick={exportLedgerToExcel} className="w-full py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"><FileSpreadsheet size={16} /> Excel Export</button>
                 <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg flex items-center justify-center gap-3 hover:bg-slate-800"><Printer size={16} /> Print Branded Report</button>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden print-terminal">
              <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between no-print">
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Master Institutional Ledger</h3>
              </div>

              <div className="p-10">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                             <th className="px-8 py-5">Receipt ID</th>
                             <th className="px-8 py-5">Mode</th>
                             <th className="px-8 py-5">Identity Profile</th>
                             <th className="px-8 py-5">Details</th>
                             <th className="px-8 py-5 text-right">Commit (₹)</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {ledger.map(record => {
                             const student = students.find(s => s.id === record.studentId);
                             const mode = getModeFromAudit(record.receiptNo);
                             return (
                               <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-8 py-6 font-black text-indigo-600 dark:text-indigo-400 text-xs">{record.receiptNo}</td>
                                  <td className="px-8 py-6">
                                     <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${mode === 'ONLINE' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100' : mode === 'CHEQUE' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-100' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100'}`}>{mode}</span>
                                  </td>
                                  <td className="px-8 py-6">
                                     <p className="font-black text-slate-800 dark:text-white text-sm uppercase">{student?.name || 'Unknown'}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">GR: {student?.grNumber || 'N/A'}</p>
                                  </td>
                                  <td className="px-8 py-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase leading-relaxed max-w-[200px] truncate">{record.type}</td>
                                  <td className="px-8 py-6 text-right font-black text-slate-900 dark:text-white">₹{record.amount.toLocaleString('en-IN')}</td>
                               </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      )}

      {selectedReceipt && (
        <div className="fixed inset-0 z-[650] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 lg:p-10 no-print animate-in zoom-in-95 duration-300">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl p-16 relative overflow-hidden flex flex-col print-terminal">
              <button onClick={() => setSelectedReceipt(null)} className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-colors no-print"><X size={32} /></button>
              <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-12">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl border-2 border-slate-100 overflow-hidden">
                       {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <div className="font-black text-3xl">E</div>}
                    </div>
                    <div>
                       <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{APP_NAME}</h2>
                       <p className="text-indigo-600 font-black text-[9px] uppercase tracking-[0.4em] mt-1">Fee Token • {selectedReceipt.mode}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-slate-900 font-black text-xl">{selectedReceipt.receiptNo}</p>
                    <p className="text-slate-400 font-bold text-[8px] uppercase">{selectedReceipt.date}</p>
                 </div>
              </div>

              <div className="space-y-10 flex-1">
                 <div className="grid grid-cols-2 gap-10">
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Identity</p>
                       <p className="text-lg font-black text-slate-900 uppercase leading-tight">{selectedReceipt.student.name}</p>
                       <p className="text-xs font-bold text-slate-500 mt-1 uppercase">GR: {selectedReceipt.student.grNumber}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Protocol</p>
                       <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">Verified {selectedReceipt.mode}</p>
                    </div>
                 </div>

                 <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100">
                    <div className="flex justify-between items-end">
                       <h4 className="text-xl font-black text-slate-800 uppercase leading-relaxed max-w-[200px]">{selectedReceipt.type}</h4>
                       <div className="text-right">
                          <p className="text-4xl font-black text-slate-900 leading-none tracking-tighter">₹{selectedReceipt.amount.toLocaleString('en-IN')}</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="mt-16 pt-10 border-t-2 border-dashed border-slate-200 flex justify-between items-center">
                 <button onClick={() => window.print()} className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 uppercase text-xs tracking-widest hover:bg-slate-800 no-print"><Printer size={18} /> Print Record</button>
                 <p className="text-[8px] font-black uppercase text-slate-400">Institutional Financial Document</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FeeSearch;
