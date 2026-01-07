
import React, { useState, useEffect } from 'react';
import { User, FeeRecord } from '../types';
import { CreditCard, Clock, CheckCircle, Receipt, Download, CheckCircle2 } from 'lucide-react';

interface FeesManagerProps {
  user: User;
}

const FeesManager: React.FC<FeesManagerProps> = ({ user }) => {
  const [fees, setFees] = useState<FeeRecord[]>(() => {
    const saved = localStorage.getItem('school_fees_ledger_v2');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'F1', type: 'Tuition Fee', studentId: 'S001', amount: 1200, status: 'PAID', date: '2024-04-05', receiptNo: 'REC-4910' },
      { id: 'F2', type: 'Bus Fee', studentId: 'S001', amount: 200, status: 'PAID', date: '2024-04-05', receiptNo: 'REC-4911' },
      { id: 'F3', type: 'Tuition Fee', studentId: 'S001', amount: 1200, status: 'PENDING', date: '-', receiptNo: '' },
      { id: 'F4', type: 'Exam Fee', studentId: 'S001', amount: 450, status: 'OVERDUE', date: '-', receiptNo: '' },
    ];
  });

  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    localStorage.setItem('school_fees_ledger_v2', JSON.stringify(fees));
  }, [fees]);

  const handlePayFee = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    const newReceipt = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
    
    setFees(prev => prev.map(fee => 
      fee.id === id ? { ...fee, status: 'PAID', date: today, receiptNo: newReceipt } : fee
    ));
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    window.dispatchEvent(new Event('storage'));
  };

  const totalPaid = fees
    .filter(f => f.status === 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const outstanding = fees
    .filter(f => f.status !== 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-emerald-200/50 flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Transaction Verified</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Financial record synchronized</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Financial Overview</h1>
          <p className="text-slate-500 font-medium">Manage school fees and payment receipts.</p>
        </div>
        {user.role === 'STUDENT' && (
          <button className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
            <CreditCard size={18} /> Pay Dues Now
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <CheckCircle size={20} />
            <span className="font-bold text-sm uppercase tracking-widest">Total Paid</span>
          </div>
          <h3 className="text-3xl font-black text-emerald-800">₹{totalPaid.toLocaleString('en-IN')}</h3>
          <p className="text-emerald-600/70 text-xs font-medium mt-1 uppercase tracking-wider">Academic Session 2026</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <Clock size={20} />
            <span className="font-bold text-sm uppercase tracking-widest">Outstanding</span>
          </div>
          <h3 className="text-3xl font-black text-amber-800">₹{outstanding.toLocaleString('en-IN')}</h3>
          <p className="text-amber-600/70 text-xs font-medium mt-1 uppercase tracking-wider">Total Liability Pending</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl">
          <div className="flex items-center gap-3 text-rose-600 mb-2">
            <Receipt size={20} />
            <span className="font-bold text-sm uppercase tracking-widest">Latest Receipt</span>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-rose-800">{fees.find(f => f.status === 'PAID')?.receiptNo || 'N/A'}</h3>
            <button className="p-1.5 bg-white text-rose-600 rounded-lg shadow-sm">
              <Download size={16} />
            </button>
          </div>
          <p className="text-rose-600/70 text-xs font-medium mt-1 uppercase tracking-wider">Secured Archive</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <h3 className="font-black text-slate-800 tracking-tight">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="px-8 py-5">Fee Category</th>
                <th className="px-8 py-5">Liability</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fees.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-black text-slate-800 uppercase text-xs">{fee.type}</div>
                    <div className="text-[10px] text-slate-400 font-bold">Ref: {fee.id}</div>
                  </td>
                  <td className="px-8 py-5 font-black text-slate-800">₹{fee.amount.toLocaleString('en-IN')}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                      fee.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      fee.status === 'OVERDUE' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {fee.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {fee.status === 'PAID' ? (
                      <button className="text-indigo-600 hover:text-indigo-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ml-auto">
                        <Receipt size={14} /> Receipt
                      </button>
                    ) : (
                      <button 
                        onClick={() => handlePayFee(fee.id)}
                        className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                      >
                        Process Payment
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
