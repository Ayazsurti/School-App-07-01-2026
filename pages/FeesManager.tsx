
import React, { useState, useEffect } from 'react';
import { User, FeeRecord, PaymentMode } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { db } from '../supabase';
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
  ShieldCheck,
  Smartphone,
  CreditCard as CardIcon,
  Zap,
  Copy,
  ExternalLink,
  ArrowRight,
  Info
} from 'lucide-react';

interface FeesManagerProps {
  user: User;
}

const MODES: {label: string, value: PaymentMode, icon: any}[] = [
  { label: 'UPI ID', value: 'UPI', icon: <Zap size={24}/> },
  { label: 'Google Pay', value: 'GOOGLE_PAY', icon: <Globe size={24}/> },
  { label: 'PhonePe', value: 'PHONE_PE', icon: <Smartphone size={24}/> },
  { label: 'Debit Card', value: 'DEBIT_CARD', icon: <CardIcon size={24}/> },
  { label: 'Credit Card', value: 'CREDIT_CARD', icon: <CreditCard size={24}/> },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER', icon: <Building2 size={24}/> },
];

const FeesManager: React.FC<FeesManagerProps> = ({ user }) => {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [schoolBank, setSchoolBank] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('GOOGLE_PAY');
  const [payerUpiId, setPayerUpiId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Mock local storage fallback
      const ledger = JSON.parse(localStorage.getItem('school_fees_ledger_v2') || '[]');
      setFees(ledger.filter((f: any) => f.studentId === user.id));
      
      const settings = await db.settings.getAll();
      setSchoolBank(settings);
    };
    fetchData();
  }, [user.id]);

  const handlePayFee = () => {
    if (!showPayModal) return;
    
    const targetFee = fees.find(f => f.id === showPayModal);
    if (!targetFee) return;

    // REDIRECTION LOGIC
    if (paymentMode === 'GOOGLE_PAY' || paymentMode === 'PHONE_PE' || paymentMode === 'UPI') {
      const upiUrl = `upi://pay?pa=${schoolBank?.school_upi_id || 'school@upi'}&pn=${encodeURIComponent(schoolBank?.school_name || 'School')}&am=${targetFee.amount}&cu=INR`;
      
      if (paymentMode !== 'UPI') {
        // Direct intent redirection
        window.location.href = upiUrl;
      }
    } else if (paymentMode === 'DEBIT_CARD' || paymentMode === 'CREDIT_CARD') {
      // Direct Bank Redirection Simulation
      window.open('https://www.sandbox.paypal.com/signin', '_blank');
    }

    setIsProcessing(true);
    
    // Process local record update
    setTimeout(() => {
      const today = new Date().toISOString().split('T')[0];
      const newReceipt = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const updatedFees = fees.map(fee => 
        fee.id === showPayModal ? { ...fee, status: 'PAID', date: today, receiptNo: newReceipt, mode: paymentMode } : fee
      );
      
      setFees(updatedFees as any);
      localStorage.setItem('school_fees_ledger_v2', JSON.stringify(updatedFees));
      
      createAuditLog(user, 'PAYMENT', 'Finance', `[${paymentMode}] Student ${user.name} processed payment ₹${targetFee.amount} (Payer UPI: ${payerUpiId || 'N/A'})`);
      
      setIsProcessing(false);
      setShowPayModal(null);
      setShowSuccess(true);
      setPayerUpiId('');
      setTimeout(() => setShowSuccess(false), 3000);
    }, 2000);
  };

  const totalPaid = fees
    .filter(f => f.status === 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const outstanding = fees
    .filter(f => f.status !== 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Transaction Confirmed</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Cloud Receipt Issued</p>
              </div>
           </div>
        </div>
      )}

      {showPayModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Institutional Gateway</h3>
                 <button onClick={() => setShowPayModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                 <div className="text-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fee Obligation</p>
                    <h4 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">₹{fees.find(f => f.id === showPayModal)?.amount.toLocaleString('en-IN')}</h4>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase mt-2">{fees.find(f => f.id === showPayModal)?.type}</p>
                 </div>

                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Payment Channel</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                       {MODES.map(mode => (
                         <button 
                          key={mode.value}
                          onClick={() => setPaymentMode(mode.value)}
                          className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${paymentMode === mode.value ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}
                         >
                            {mode.icon}
                            <span className="text-[8px] font-black uppercase tracking-widest">{mode.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="animate-in fade-in slide-in-from-bottom-2">
                    {paymentMode === 'UPI' && (
                       <div className="space-y-4 bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                          <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Enter Your UPI ID (Self)</label>
                          <div className="relative">
                             <Zap size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                             <input 
                               type="text" 
                               value={payerUpiId}
                               onChange={e => setPayerUpiId(e.target.value)}
                               placeholder="username@bank" 
                               className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                             />
                          </div>
                       </div>
                    )}

                    {(paymentMode === 'GOOGLE_PAY' || paymentMode === 'PHONE_PE') && (
                       <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                          <ExternalLink size={40} className="mx-auto text-emerald-600 mb-4 animate-bounce" />
                          <h5 className="font-black text-emerald-800 dark:text-emerald-400 uppercase text-xs">Deep Link Redirect</h5>
                          <p className="text-[10px] text-emerald-700/60 dark:text-emerald-500/60 font-medium uppercase mt-1">Launching {paymentMode.replace('_', ' ')} secure mobile application...</p>
                       </div>
                    )}

                    {paymentMode === 'BANK_TRANSFER' && (
                       <div className="space-y-4 bg-slate-900 p-8 rounded-[2rem] text-white">
                          <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Institutional Account Details</h5>
                          <div className="space-y-4">
                             <div className="flex justify-between items-center group">
                                <div><p className="text-[8px] text-slate-500 uppercase">Bank Name</p><p className="text-sm font-black uppercase">{schoolBank?.school_bank_name || 'N/A'}</p></div>
                                <button onClick={() => copyToClipboard(schoolBank?.school_bank_name || '')} className="p-2 opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-white transition-all"><Copy size={14}/></button>
                             </div>
                             <div className="flex justify-between items-center group">
                                <div><p className="text-[8px] text-slate-500 uppercase">A/C Number</p><p className="text-sm font-black font-mono tracking-wider">{schoolBank?.school_account_no || 'N/A'}</p></div>
                                <button onClick={() => copyToClipboard(schoolBank?.school_account_no || '')} className="p-2 opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-white transition-all"><Copy size={14}/></button>
                             </div>
                             <div className="flex justify-between items-center group">
                                <div><p className="text-[8px] text-slate-500 uppercase">IFSC Code</p><p className="text-sm font-black uppercase font-mono">{schoolBank?.school_ifsc || 'N/A'}</p></div>
                                <button onClick={() => copyToClipboard(schoolBank?.school_ifsc || '')} className="p-2 opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-white transition-all"><Copy size={14}/></button>
                             </div>
                          </div>
                          <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3">
                             <Info size={16} className="text-indigo-400" />
                             <p className="text-[9px] font-bold text-slate-400 uppercase">Manual transfers are verified by the admin terminal against transaction ID.</p>
                          </div>
                       </div>
                    )}
                 </div>

                 <button 
                  onClick={handlePayFee}
                  disabled={isProcessing || (paymentMode === 'UPI' && !payerUpiId)}
                  className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest disabled:opacity-50"
                 >
                    {isProcessing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                       <>
                          {paymentMode === 'GOOGLE_PAY' ? 'Redirect to Google Pay' : paymentMode === 'PHONE_PE' ? 'Redirect to PhonePe' : 'Process Secure Payment'} <ArrowRight size={18} />
                       </>
                    )}
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Academic Wallet</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Centralized cloud payment node for Academic Year 2026-27.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 p-8 rounded-[3rem] shadow-sm group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
              <CheckCircle size={28} />
            </div>
            <span className="font-black text-[10px] text-emerald-600 uppercase tracking-widest opacity-60">Settled</span>
          </div>
          <h3 className="text-4xl font-black text-emerald-800 dark:text-emerald-400 tracking-tighter">₹{totalPaid.toLocaleString('en-IN')}</h3>
          <p className="text-emerald-600/70 dark:text-emerald-400/50 text-[10px] font-black mt-2 uppercase tracking-[0.2em]">Validated Aggregate</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 p-8 rounded-[3rem] shadow-sm group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Clock size={28} />
            </div>
            <span className="font-black text-[10px] text-amber-600 uppercase tracking-widest opacity-60">Pending</span>
          </div>
          <h3 className="text-4xl font-black text-amber-800 dark:text-amber-400 tracking-tighter">₹{outstanding.toLocaleString('en-IN')}</h3>
          <p className="text-amber-600/70 dark:text-amber-400/50 text-[10px] font-black mt-2 uppercase tracking-[0.2em]">Open Liabilities</p>
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
          <p className="text-indigo-200 text-[10px] font-black mt-2 uppercase tracking-[0.2em] relative z-10">Primary Token Ref</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Financial Timeline</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                <th className="px-10 py-6">Description</th>
                <th className="px-8 py-6">Volume</th>
                <th className="px-8 py-6">Method</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-10 py-6 text-right">Commit Entry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {fees.length > 0 ? fees.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                  <td className="px-10 py-8">
                    <div className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">{fee.type}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">NODE ID: {fee.id}</div>
                  </td>
                  <td className="px-8 py-8 font-black text-slate-800 dark:text-slate-200 text-lg">₹{fee.amount.toLocaleString('en-IN')}</td>
                  <td className="px-8 py-8">
                     <span className="text-[10px] font-black text-indigo-500 uppercase">{fee.mode?.replace('_', ' ') || 'N/A'}</span>
                  </td>
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
                      <div className="flex flex-col items-end gap-1">
                         <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest">
                           <CheckCircle size={14} /> Synced Registry
                         </div>
                         <span className="text-[8px] font-bold text-slate-400 uppercase">{fee.receiptNo}</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowPayModal(fee.id)}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none hover:-translate-y-1"
                      >
                        Initiate Payment
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan={5} className="py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest">Financial history empty</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeesManager;
