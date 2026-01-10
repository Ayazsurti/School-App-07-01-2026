
import React, { useState, useEffect } from 'react';
import { User, FeeRecord } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  CreditCard, 
  Clock, 
  CheckCircle, 
  Receipt, 
  Download, 
  CheckCircle2, 
  X, 
  Globe, 
  Banknote, 
  Building2,
  ShieldCheck
} from 'lucide-react';

interface FeesManagerProps {
  user: User;
}

const FeesManager: React.FC<FeesManagerProps> = ({ user }) => {
  const [fees, setFees] = useState<FeeRecord[]>(() => {
    const saved = localStorage.getItem('school_fees_ledger_v2');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'F1', type: 'Tuition Fee', studentId: user.id, amount: 1200, status: 'PAID', date: '2024-04-05', receiptNo: 'REC-4910' },
      { id: 'F3', type: 'Tuition Fee', studentId: user.id, amount: 1200, status: 'PENDING', date: '-', receiptNo: '' },
      { id: 'F4', type: 'Exam Fee', studentId: user.id, amount: 450, status: 'OVERDUE', date: '-', receiptNo: '' },
    ];
  });

  const [showPayModal, setShowPayModal] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    localStorage.setItem('school_fees_ledger_v2', JSON.stringify(fees));
  }, [fees]);

  const handlePayFee = () => {
    if (!showPayModal) return;
    setIsProcessing(true);
    
    setTimeout(() => {
      const today = new Date().toISOString().split('T')[0];
      const newReceipt = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
      const targetFee = fees.find(f => f.id === showPayModal);
      
      if (!targetFee) return;

      setFees(prev => prev.map(fee => 
        fee.id === showPayModal ? { ...fee, status: 'PAID', date: today, receiptNo: newReceipt } : fee
      ));
      
      createAuditLog(user, 'PAYMENT', 'Finance', `[${paymentMode}] Student ${user.name} processed payment for ${targetFee.type} (₹${targetFee.amount})`);
      
      setIsProcessing(false);
      setShowPayModal(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      window.dispatchEvent(new Event('storage'));
    }, 1200);
  };

  const totalPaid = fees
    .filter(f => f.status === 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const outstanding = fees
    .filter(f => f.status !== 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-emerald-200/50 flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Transaction Synced</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Verification successful</p>
              </div>
           </div>
        </div>
      )}

      {showPayModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-md w-full animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Checkout Portal</h3>
                 <button onClick={() => setShowPayModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Liability</p>
                    <h4 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">₹{fees.find(f => f.id === showPayModal)?.amount.toLocaleString('en-IN')}</h4>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase mt-2">{fees.find(f => f.id === showPayModal)?.type}</p>
                 </div>

                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Select Verification Method</label>
                    <div className="grid grid-cols-2 gap-4">
                       <button 
                        onClick={() => setPaymentMode('ONLINE')}
                        className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${paymentMode === 'ONLINE' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 shadow-xl' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}
                       >
                          <Globe size={32} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Online Pay</span>
                       </button>
                       <button 
                        onClick={() => setPaymentMode('OFFLINE')}
                        className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${paymentMode === 'OFFLINE' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xl' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}
                       >
                          <Banknote size={32} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Record Offline</span>
                       </button>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-start gap-3">
                       <ShieldCheck className="text-amber-600 flex-shrink-0" size={18} />
                       <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed uppercase">Recording "Offline" implies you will submit physical cash at the school office to verify this transaction.</p>
                    </div>
                 </div>

                 <button 
                  onClick={handlePayFee}
                  disabled={isProcessing}
                  className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                 >
                    {isProcessing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Confirm Payment'}
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">My Financial Account</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Manage school fees and verified digital receipts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 p-8 rounded-[3rem] shadow-sm group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
              <CheckCircle size={28} />
            </div>
            <span className="font-black text-[10px] text-emerald-600 uppercase tracking-widest opacity-60">Session Total</span>
          </div>
          <h3 className="text-4xl font-black text-emerald-800 dark:text-emerald-400 tracking-tighter">₹{totalPaid.toLocaleString('en-IN')}</h3>
          <p className="text-emerald-600/70 dark:text-emerald-400/50 text-[10px] font-black mt-2 uppercase tracking-[0.2em]">Verified Collections</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 p-8 rounded-[3rem] shadow-sm group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Clock size={28} />
            </div>
            <span className="font-black text-[10px] text-amber-600 uppercase tracking-widest opacity-60">Pending Dues</span>
          </div>
          <h3 className="text-4xl font-black text-amber-800 dark:text-amber-400 tracking-tighter">₹{outstanding.toLocaleString('en-IN')}</h3>
          <p className="text-amber-600/70 dark:text-amber-400/50 text-[10px] font-black mt-2 uppercase tracking-[0.2em]">Current Liability</p>
        </div>

        <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Receipt size={28} />
            </div>
            <button className="p-3 bg-white/20 hover:bg-white/40 rounded-xl transition-colors">
              <Download size={20} />
            </button>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight relative z-10">{fees.find(f => f.status === 'PAID')?.receiptNo || 'N/A'}</h3>
          <p className="text-indigo-200 text-[10px] font-black mt-2 uppercase tracking-[0.2em] relative z-10">Latest Digital Token</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Ledger Transactions</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Cycle 2026-27</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                <th className="px-10 py-6">Identity Category</th>
                <th className="px-8 py-6">Fiscal Volume</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-10 py-6 text-right">Commit Entry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {fees.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                  <td className="px-10 py-8">
                    <div className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">{fee.type}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Token Ref: {fee.id}</div>
                  </td>
                  <td className="px-8 py-8 font-black text-slate-800 dark:text-slate-200 text-lg">₹{fee.amount.toLocaleString('en-IN')}</td>
                  <td className="px-8 py-8">
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-[0.15em] uppercase border ${
                      fee.status === 'PAID' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' :
                      fee.status === 'OVERDUE' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800' :
                      'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800'
                    }`}>
                      {fee.status}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    {fee.status === 'PAID' ? (
                      <div className="flex items-center gap-3 justify-end text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest">
                        <CheckCircle size={16} /> Verified Receipt
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowPayModal(fee.id)}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none hover:-translate-y-1 active:scale-95"
                      >
                        Process Entry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeesManager;
