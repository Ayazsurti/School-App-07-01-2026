
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, FeeRecord } from '../types';
import { db, supabase } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Banknote, Globe, Search, Smartphone, CreditCard, CheckCircle2, Calendar, Wallet, Loader2, ShieldCheck, User as UserIcon, RefreshCw, TrendingUp, History
} from 'lucide-react';
import { MOCK_STUDENTS } from '../constants';

interface FeesManagementProps { user: User; }

const FeesManagement: React.FC<FeesManagementProps> = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE'>('ONLINE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);

  const fetchLedger = async () => {
    try {
      const data = await db.fees.getLedger();
      setLedger(data);
    } catch (err) { console.error("Ledger Sync Error:", err); }
  };

  useEffect(() => {
    fetchLedger();
    const channel = supabase.channel('realtime-ledger')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_ledger' }, () => {
        setIsSyncing(true);
        fetchLedger().then(() => setTimeout(() => setIsSyncing(false), 1000));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const students = useMemo(() => (MOCK_STUDENTS as any as Student[]), []);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
  }, [students, searchQuery]);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || amountToPay <= 0) return;
    setIsProcessing(true);
    try {
      const receiptNo = `${paymentMode === 'CASH' ? 'CSH' : 'ONL'}-${Math.floor(1000 + Math.random() * 9000)}`;
      await db.fees.insertPayment({
        studentId: selectedStudent.id,
        amount: amountToPay,
        date: new Date().toISOString().split('T')[0],
        status: 'PAID',
        type: `Cloud Fee Payment [${paymentMode}]`,
        receiptNo
      });
      setShowSuccess(true);
      setSelectedStudent(null);
      setAmountToPay(0);
      setTimeout(() => setShowSuccess(false), 3000);
      createAuditLog(user, 'PAYMENT', 'Finance', `[${paymentMode}] Cloud synced payment ₹${amountToPay} for ${selectedStudent.name}`);
    } catch (err) { alert("Payment sync failed."); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-in slide-in-from-top-4">
           <div className="bg-emerald-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-emerald-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Ledger Syncing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={32} strokeWidth={3} className="text-white" />
              <div>
                 <p className="font-black text-sm uppercase tracking-[0.2em]">Transaction Verified</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-1">Cloud Record Published</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase flex items-center gap-3">
             Cloud Fee Terminal <Globe className="text-indigo-600" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Integrated real-time financial tracking for Session 2026.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Identity Recon</label>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Name..." className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner transition-all" />
              {filteredStudents.length > 0 && (
                <div className="mt-4 space-y-2">
                  {filteredStudents.map(s => (
                    <button key={s.id} onClick={() => { setSelectedStudent(s); setSearchQuery(''); }} className="w-full flex items-center gap-4 p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-2xl border transition-all text-left group">
                       <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black group-hover:scale-110 transition-transform">{s.name.charAt(0)}</div>
                       <p className="font-black text-slate-800 dark:text-white text-sm uppercase">{s.name}</p>
                    </button>
                  ))}
                </div>
              )}
           </div>

           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
              <h3 className="font-black text-xl mb-6 uppercase tracking-tight flex items-center gap-3">
                 <History size={20} className="text-indigo-400" /> Recent Activity
              </h3>
              <div className="space-y-4">
                 {ledger.slice(0, 3).map(l => (
                   <div key={l.id} className="flex items-center justify-between text-[10px] font-bold border-b border-white/5 pb-4">
                      <span className="text-slate-400 uppercase">{l.receipt_no}</span>
                      <span className="text-emerald-400">₹{l.amount}</span>
                   </div>
                 ))}
                 {ledger.length === 0 && <p className="text-slate-500 text-xs font-bold uppercase py-10 text-center">No recent tokens</p>}
              </div>
           </div>
        </div>

        <div className="xl:col-span-2">
           {selectedStudent ? (
             <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between">
                   <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-3"><Wallet className="text-indigo-600" /> Checkout Portal</h3>
                   <div className="flex gap-2">
                      <button onClick={() => setPaymentMode('ONLINE')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${paymentMode === 'ONLINE' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Online</button>
                      <button onClick={() => setPaymentMode('CASH')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${paymentMode === 'CASH' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Cash</button>
                   </div>
                </div>
                <form onSubmit={handleProcessPayment} className="p-10 space-y-10 flex-1 flex flex-col justify-center">
                   <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 text-center">Finalized Liability (₹)</label>
                      <input type="number" required value={amountToPay || ''} onChange={e => setAmountToPay(parseInt(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2rem] px-8 py-10 text-6xl font-black text-slate-900 dark:text-white text-center outline-none transition-all shadow-inner" placeholder="0" />
                   </div>
                   <button type="submit" disabled={isProcessing || amountToPay <= 0} className="w-full py-7 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:-translate-y-1 transition-all disabled:opacity-50">
                      {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <ShieldCheck size={24} />} Process Cloud Transaction
                   </button>
                </form>
             </div>
           ) : (
             <div className="bg-white/50 dark:bg-slate-900/50 rounded-[3rem] p-40 text-center border-4 border-dashed border-white/30 flex flex-col items-center justify-center h-full">
                <Search size={48} className="text-slate-300 dark:text-slate-700 mb-6" />
                <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none mb-4">Identity Verification Required</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto text-lg leading-relaxed">Search student profile from the registry terminal to initiate cloud collection sequence.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default FeesManagement;
