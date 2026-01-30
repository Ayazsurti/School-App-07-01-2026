
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, FeeRecord } from '../types';
import { SearchCode, Search, User as UserIcon, Receipt, Printer, ChevronRight, ShieldCheck, Calendar, FileSpreadsheet, Download, AlertCircle, LayoutGrid, TrendingUp, Banknote, X, Globe, Building2, Loader2, RefreshCw } from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';

interface FeeSearchProps { user: User; schoolLogo: string | null; }

const FeeSearch: React.FC<FeeSearchProps> = ({ user, schoolLogo }) => {
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'LEDGER'>('STUDENT');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [ledger, setLedger] = useState<FeeRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = async () => {
    try {
      const [sData, lData] = await Promise.all([db.students.getAll(), db.fees.getLedger()]);
      setStudents(sData.map((s: any) => ({ ...s, fullName: s.full_name, grNumber: s.gr_number })) as any);
      setLedger(lData as any);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('ledger-sync-v1')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_ledger' }, () => {
        setIsSyncing(true); fetchData().then(() => setTimeout(() => setIsSyncing(false), 800));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return students.filter(s => s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || s.grNumber?.includes(searchQuery)).slice(0, 10);
  }, [students, searchQuery]);

  const studentRecords = useMemo(() => {
    if (!selectedStudent) return [];
    return ledger.filter(r => r.studentId === selectedStudent.id);
  }, [ledger, selectedStudent]);

  const totalCollected = useMemo(() => ledger.reduce((acc, curr) => acc + curr.amount, 0), [ledger]);

  const exportLedgerToExcel = () => {
    if (ledger.length === 0) return;
    const headers = ['Receipt No', 'Date', 'Amount', 'Mode', 'Fee Types', 'Student Name', 'ID'];
    const rows = ledger.map(r => {
      const student = students.find(s => s.id === r.studentId);
      return [r.receiptNo, r.date, r.amount, r.mode || 'N/A', `"${r.type}"`, student?.fullName || 'Unknown', student?.grNumber || 'N/A'];
    });
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url); link.setAttribute("download", `School_Collection_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (isLoading) return <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      <style>{` @media print { body * { visibility: hidden; } .print-terminal, .print-terminal * { visibility: visible; } .print-terminal { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; } .no-print { display: none !important; } } `}</style>

      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce no-print">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Ledger Syncing...</span>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Financial Registry</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional Cloud Ledger Terminal.</p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1 no-print border border-slate-200 dark:border-slate-700 shadow-inner">
           <button onClick={() => setActiveTab('STUDENT')} className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'STUDENT' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500'}`}>Individual Audit</button>
           <button onClick={() => setActiveTab('LEDGER')} className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'LEDGER' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500'}`}>Institutional Ledger</button>
        </div>
      </div>

      {activeTab === 'STUDENT' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 px-4 sm:px-0">
          <div className="xl:col-span-1 space-y-6">
             <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 no-print">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Identity Fetch</label>
                <div className="relative group mb-6"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Name, GR No..." className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-2xl pl-12 pr-4 py-4 font-black uppercase outline-none shadow-inner text-xs" /></div>
                <div className="space-y-2">
                   {filteredStudents.map(s => (
                     <button key={s.id} onClick={() => { setSelectedStudent(s); setSearchQuery(''); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${selectedStudent?.id === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-slate-50 dark:bg-slate-800 border-transparent'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedStudent?.id === s.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-indigo-600'}`}>{s.fullName?.charAt(0)}</div>
                        <div className="min-w-0 flex-1"><p className="font-black text-sm truncate uppercase">{s.fullName}</p><p className={`text-[9px] font-bold uppercase tracking-widest ${selectedStudent?.id === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>GR: {s.grNumber}</p></div>
                     </button>
                   ))}
                </div>
             </div>
          </div>
          <div className="xl:col-span-2">
             {selectedStudent ? (
               <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-right-4">
                  <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center gap-6">
                     <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><UserIcon size={28} /></div>
                     <div><h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-tight">{selectedStudent.fullName}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit Node • GR {selectedStudent.grNumber}</p></div>
                  </div>
                  <div className="p-10 space-y-4">
                     {studentRecords.length > 0 ? studentRecords.map(record => (
                        <div key={record.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 flex md:items-center justify-between gap-6 hover:bg-white transition-all group">
                           <div className="flex items-center gap-6">
                              <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><Receipt size={24} /></div>
                              <div><p className="text-[10px] font-black text-indigo-500 uppercase mb-1">{record.receiptNo}</p><h4 className="font-black text-slate-800 dark:text-white text-sm uppercase truncate max-w-[250px]">{record.type}</h4><p className="text-[9px] font-bold text-slate-400 uppercase mt-1">VERIFIED {record.date}</p></div>
                           </div>
                           <div className="flex items-center gap-8"><div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase">Amount</p><p className="text-xl font-black text-slate-900 dark:text-white">₹{record.amount.toLocaleString('en-IN')}</p></div></div>
                        </div>
                     )) : <div className="py-24 text-center opacity-30"><AlertCircle size={48} className="mx-auto mb-4" /><h4 className="text-xl font-black uppercase tracking-tight">Zero Transactions Found</h4></div>}
                  </div>
               </div>
             ) : <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl p-32 rounded-[3rem] text-center border-4 border-dashed border-white/50 flex flex-col items-center justify-center h-full no-print"><Search size={48} className="text-slate-200 mb-8" /><h3 className="text-3xl font-black text-slate-300 uppercase tracking-tight">Bounding Required</h3></div>}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-right-4 px-4 sm:px-0">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
              <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl"><TrendingUp size={24} className="mb-4 opacity-60" /><p className="text-4xl font-black tracking-tighter">₹{totalCollected.toLocaleString('en-IN')}</p><p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mt-2">Combined Collection</p></div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm"><Receipt size={24} className="mb-4 text-slate-300" /><p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{ledger.length}</p><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Verified Entries</p></div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center gap-3"><button onClick={exportLedgerToExcel} className="w-full py-4 bg-emerald-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"><FileSpreadsheet size={16} /> Excel Export</button></div>
           </div>
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden print-terminal">
              <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800"><th className="px-8 py-5">Receipt</th><th className="px-8 py-5">Mode</th><th className="px-8 py-5">Identity Profile</th><th className="px-8 py-5 text-right">Commit (₹)</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{ledger.map(record => { const student = students.find(s => s.id === record.studentId); return (<tr key={record.id} className="hover:bg-slate-50/50 transition-colors"><td className="px-8 py-6 font-black text-indigo-600 text-xs">{record.receiptNo}</td><td className="px-8 py-6"><span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-lg text-[9px] font-black uppercase">{record.mode || 'OFFLINE'}</span></td><td className="px-8 py-6"><p className="font-black text-slate-800 dark:text-white text-sm uppercase">{student?.fullName || 'Unknown'}</p><p className="text-[9px] font-bold text-slate-400 uppercase">GR: {student?.grNumber}</p></td><td className="px-8 py-6 text-right font-black text-slate-900 dark:text-white">₹{record.amount.toLocaleString('en-IN')}</td></tr>); })}</tbody></table></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FeeSearch;
