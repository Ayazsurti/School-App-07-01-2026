
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, PaymentMode, FeeStructure } from '../types';
import { db, supabase } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Banknote, Globe, Search, Smartphone, CreditCard, CheckCircle2, Calendar, Wallet, Loader2, ShieldCheck, RefreshCw, History, 
  Building2, QrCode, CreditCard as CardIcon, Zap, ArrowRight, Info, ExternalLink, ShieldAlert
} from 'lucide-react';

interface FeesManagementProps { user: User; }
const ALL_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

const MODES: {label: string, value: PaymentMode, icon: any}[] = [
  { label: 'Cash', value: 'CASH', icon: <Banknote size={18}/> },
  { label: 'UPI ID', value: 'UPI', icon: <Zap size={18}/> },
  { label: 'Google Pay', value: 'GOOGLE_PAY', icon: <Globe size={18}/> },
  { label: 'PhonePe', value: 'PHONE_PE', icon: <Smartphone size={18}/> },
  { label: 'Debit Card', value: 'DEBIT_CARD', icon: <CardIcon size={18}/> },
  { label: 'Credit Card', value: 'CREDIT_CARD', icon: <CreditCard size={18}/> },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER', icon: <Building2 size={18}/> },
];

const FeesManagement: React.FC<FeesManagementProps> = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [payerDetails, setPayerDetails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [studentData, structureData, ledgerData, settings] = await Promise.all([
        db.students.getAll(),
        db.fees.getStructures(),
        db.fees.getLedger(),
        db.settings.getAll()
      ]);

      setStudents(studentData.map((s: any) => ({
        id: s.id, fullName: s.full_name, name: s.full_name, grNumber: s.gr_number,
        class: s.class, section: s.section, rollNo: s.roll_no, profileImage: s.profile_image
      })));
      setFeeStructures(structureData);
      setLedger(ledgerData);
      setSchoolSettings(settings);
    } catch (err) {
      console.error("Data Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime-fees-management-v8')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_ledger' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return students.filter(s => 
      (s.fullName || '').toLowerCase().includes(query) || 
      (s.grNumber || '').toLowerCase().includes(query)
    ).slice(0, 5);
  }, [students, searchQuery]);

  const pendingQuarters = useMemo(() => {
    if (!selectedStudent) return [];
    const paidQuarters = ledger
      .filter(l => l.student_id === selectedStudent.id && l.status === 'PAID')
      .map(l => {
        if (l.type.includes('Q1')) return 'Q1';
        if (l.type.includes('Q2')) return 'Q2';
        if (l.type.includes('Q3')) return 'Q3';
        if (l.type.includes('Q4')) return 'Q4';
        return null;
      })
      .filter(Boolean);
    
    return ALL_QUARTERS.filter(q => !paidQuarters.includes(q));
  }, [selectedStudent, ledger]);

  useEffect(() => {
    if (selectedStudent && pendingQuarters.length > 0) {
      setSelectedQuarter(pendingQuarters[0]);
    } else {
      setSelectedQuarter(null);
    }
  }, [selectedStudent, pendingQuarters]);

  useEffect(() => {
    if (selectedStudent && selectedQuarter) {
      const classStruct = feeStructures.find(fs => fs.class_name === selectedStudent.class);
      if (classStruct && Array.isArray(classStruct.fees)) {
        const quarterFee = classStruct.fees.find((f: any) => f.quarter === selectedQuarter);
        setAmountToPay(quarterFee ? quarterFee.amount : 0);
      }
    }
  }, [selectedStudent, selectedQuarter, feeStructures]);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedQuarter || amountToPay <= 0) return;
    
    // REDIRECTION LOGIC
    if (paymentMode === 'GOOGLE_PAY' || paymentMode === 'PHONE_PE') {
      const upiLink = `upi://pay?pa=${schoolSettings?.school_upi_id || 'merchant@upi'}&pn=${encodeURIComponent(schoolSettings?.school_name || 'School')}&am=${amountToPay}&cu=INR`;
      window.location.href = upiLink;
    } else if (paymentMode === 'DEBIT_CARD' || paymentMode === 'CREDIT_CARD') {
      // Simulate Bank Redirection
      window.open('https://www.sandbox.paypal.com/signin', '_blank');
    }

    setIsProcessing(true);
    try {
      const receiptNo = `${selectedQuarter}-${paymentMode.substring(0,3)}-${Math.floor(1000 + Math.random() * 9000)}`;
      await db.fees.insertPayment({
        studentId: selectedStudent.id,
        amount: amountToPay,
        date: new Date().toISOString().split('T')[0],
        status: 'PAID',
        type: `Quarterly Fee [${selectedQuarter}] via ${paymentMode.replace('_', ' ')}`,
        receiptNo,
        quarter: selectedQuarter,
        mode: paymentMode
      });
      setShowSuccess(true);
      createAuditLog(user, 'PAYMENT', 'Finance', `[${paymentMode}] Collected ₹${amountToPay} from ${selectedStudent.fullName} for ${selectedQuarter} (Ref: ${payerDetails || 'N/A'})`);
      
      setSelectedStudent(null);
      setAmountToPay(0);
      setPayerDetails('');
      setSearchQuery('');
      setTimeout(() => setShowSuccess(false), 3000);
      fetchData();
    } catch (err) { 
      alert("Payment sync failed."); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Registry Processing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Payment Cleared</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Ledger Updated Successfully</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">Collection Terminal <Globe className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Cloud-based payment gateway with smart filtering.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Identity Recon</label>
              <div className="relative mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                 <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  placeholder="Enter Name or GR Number..." 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" 
                 />
              </div>

              {isLoading ? (
                <div className="py-10 flex flex-col items-center justify-center opacity-50"><Loader2 className="animate-spin text-indigo-500" /></div>
              ) : filteredStudents.length > 0 ? (
                <div className="space-y-2">
                  {filteredStudents.map(s => (
                    <button key={s.id} onClick={() => { setSelectedStudent(s); setSearchQuery(''); }} className="w-full flex items-center gap-4 p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-2xl border border-slate-50 dark:border-slate-800 transition-all text-left group">
                       <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black group-hover:scale-110 transition-transform overflow-hidden">{s.fullName?.charAt(0)}</div>
                       <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 dark:text-white text-sm uppercase truncate">{s.fullName}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">GR: {s.grNumber} • Std {s.class}</p>
                       </div>
                       <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              ) : searchQuery && <p className="text-center py-6 text-slate-400 font-bold text-xs uppercase italic">Identity not found</p>}
           </div>

           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
              <h3 className="font-black text-xl mb-6 uppercase tracking-tight flex items-center gap-3">
                 <History size={20} className="text-indigo-400" /> Recent Activity
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                 {ledger.slice(0, 8).map(l => {
                   const studentInfo = students.find(s => s.id === l.student_id);
                   return (
                    <div key={l.id} className="flex items-center justify-between text-[10px] font-bold border-b border-white/5 pb-4 group/item">
                        <div>
                          <span className="text-indigo-400 uppercase block group-hover/item:text-white transition-colors">{l.receipt_no}</span>
                          <span className="text-slate-500 text-[8px] uppercase">{studentInfo?.fullName || 'Synced'} • {l.date}</span>
                        </div>
                        <span className="text-emerald-400 font-black">₹{l.amount.toLocaleString('en-IN')}</span>
                    </div>
                   );
                 })}
              </div>
           </div>
        </div>

        <div className="xl:col-span-2">
           {selectedStudent ? (
             <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col animate-in slide-in-from-right-4 duration-500">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between flex-wrap gap-4">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black shadow-lg">
                        {selectedStudent.profileImage ? <img src={selectedStudent.profileImage} className="w-full h-full object-cover" /> : <Wallet size={28}/>}
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{selectedStudent.fullName}</h3>
                         <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">Std {selectedStudent.class}-{selectedStudent.section}</span>
                         </div>
                      </div>
                   </div>
                   
                   <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      {pendingQuarters.length > 0 ? pendingQuarters.map(q => (
                        <button 
                          key={q} 
                          onClick={() => setSelectedQuarter(q)} 
                          className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedQuarter === q ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {q}
                        </button>
                      )) : (
                        <div className="px-6 py-2 flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase">
                           <CheckCircle2 size={14}/> Academic Year Settled
                        </div>
                      )}
                   </div>
                </div>

                {pendingQuarters.length > 0 && selectedQuarter ? (
                  <form onSubmit={handleProcessPayment} className="p-10 space-y-10 flex-1 flex flex-col">
                    <div className="space-y-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-2">Liability for {selectedQuarter} (₹)</label>
                          <div className="relative max-w-md mx-auto">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-3xl">₹</span>
                              <input type="number" required value={amountToPay || ''} onChange={e => setAmountToPay(parseInt(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[2.5rem] px-8 py-8 text-6xl font-black text-slate-900 dark:text-white text-center outline-none transition-all shadow-inner" placeholder="0" />
                          </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Verification Channel</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {MODES.map(mode => (
                            <button 
                              key={mode.value}
                              type="button"
                              onClick={() => { setPaymentMode(mode.value); setPayerDetails(''); }}
                              className={`flex flex-col items-center justify-center gap-3 px-4 py-6 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest text-center ${paymentMode === mode.value ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-indigo-100'}`}
                            >
                                {mode.icon}
                                <span>{mode.label}</span>
                            </button>
                          ))}
                        </div>
                    </div>

                    {/* MODE SPECIFIC INPUTS */}
                    {(paymentMode === 'UPI' || paymentMode === 'GOOGLE_PAY' || paymentMode === 'PHONE_PE') && (
                        <div className="space-y-2 animate-in slide-in-from-top-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Payer UPI ID (For Ledger tracking)</label>
                          <div className="relative">
                              <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={16}/>
                              <input 
                                type="text" 
                                value={payerDetails} 
                                onChange={e => setPayerDetails(e.target.value)} 
                                placeholder="e.g., payer@upi" 
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                              />
                          </div>
                        </div>
                    )}

                    <div className="mt-auto">
                      <button type="submit" disabled={isProcessing || amountToPay <= 0} className="w-full py-7 bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:-translate-y-1 transition-all disabled:opacity-50">
                          {isProcessing ? <Loader2 className="animate-spin" size={24} /> : (paymentMode === 'GOOGLE_PAY' || paymentMode === 'PHONE_PE' ? <ExternalLink size={24} /> : <ShieldCheck size={24} />)}
                          {paymentMode === 'GOOGLE_PAY' ? 'Open Google Pay' : paymentMode === 'PHONE_PE' ? 'Open PhonePe' : `Commit ${selectedQuarter} Entry`}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
                     <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-[2.5rem] flex items-center justify-center border border-emerald-100 dark:border-emerald-800 shadow-inner">
                        <CheckCircle2 size={48} />
                     </div>
                     <div>
                        <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Identity Cleared</h4>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight mt-2">All quarterly dues for this student have been settles in cloud.</p>
                     </div>
                     <button onClick={() => setSelectedStudent(null)} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all">Search Another</button>
                  </div>
                )}
             </div>
           ) : (
             <div className="bg-white/50 dark:bg-slate-900/50 rounded-[3rem] p-40 text-center border-4 border-dashed border-white/30 flex flex-col items-center justify-center h-full">
                <QrCode size={64} className="text-slate-300 dark:text-slate-700 mb-6" />
                <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none mb-4">Identity Sync Needed</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto text-lg leading-relaxed uppercase tracking-tight">Search for a student to check and process pending academic liabilities.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default FeesManagement;
