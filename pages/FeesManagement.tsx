
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, FeeRecord, FeeStructure } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Banknote, 
  Globe, 
  Search, 
  Smartphone, 
  CreditCard, 
  CheckCircle2, 
  History, 
  Calendar, 
  Receipt, 
  Wallet,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  DollarSign,
  TrendingUp,
  Clock,
  ChevronRight,
  Hash,
  ArrowUpRight,
  Info,
  Lock,
  Loader2,
  Shield,
  FileText,
  Filter,
  GraduationCap,
  Layers
} from 'lucide-react';
import { MOCK_STUDENTS } from '../constants';

interface FeesManagementProps {
  user: User;
}

const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const SECTIONS = ['A', 'B', 'C'];

const FeesManagement: React.FC<FeesManagementProps> = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('All');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Form State
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE'>('ONLINE');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Online Gateway State
  const [onlineMethod, setOnlineMethod] = useState<'UPI' | 'Google Pay' | 'Debit Card' | 'Credit Card'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [gatewayStep, setGatewayStep] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTxnId, setLastTxnId] = useState('');

  // Auto-generation logic
  const [nextCashNo, setNextCashNo] = useState<number>(1);
  const [nextOnlineNo, setNextOnlineNo] = useState<number>(1);

  // Load Counters on Mount and after success
  const refreshCounters = () => {
    const cashCounter = localStorage.getItem('school_cash_receipt_counter_v1');
    const onlineCounter = localStorage.getItem('school_online_receipt_counter_v1');
    setNextCashNo(cashCounter ? parseInt(cashCounter) : 1);
    setNextOnlineNo(onlineCounter ? parseInt(onlineCounter) : 1);
  };

  useEffect(() => {
    refreshCounters();
  }, [showSuccess]);

  // Load Data
  const students = useMemo(() => {
    const saved = localStorage.getItem('school_students_db_v4');
    return saved ? JSON.parse(saved) as Student[] : MOCK_STUDENTS as any as Student[];
  }, []);

  const feeStructures = useMemo(() => {
    const saved = localStorage.getItem('school_fee_structures_v2');
    return saved ? JSON.parse(saved) as FeeStructure[] : [];
  }, []);

  const ledger: FeeRecord[] = useMemo(() => {
    const saved = localStorage.getItem('school_fees_ledger_v2');
    return saved ? JSON.parse(saved) : [];
  }, [showSuccess]);

  // Derived Values for Selected Student
  const studentTotalFees = useMemo(() => {
    if (!selectedStudent) return 0;
    const structure = feeStructures.find(s => s.className === selectedStudent.class);
    return structure?.fees.reduce((acc, curr) => acc + curr.amount, 0) || 0;
  }, [selectedStudent, feeStructures]);

  const studentPaidAmount = useMemo(() => {
    if (!selectedStudent) return 0;
    return ledger
      .filter(r => r.studentId === selectedStudent.id && r.status === 'PAID')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [selectedStudent, ledger]);

  const studentRemaining = studentTotalFees - studentPaidAmount;

  const studentHistory = useMemo(() => {
    if (!selectedStudent) return [];
    return ledger.filter(r => r.studentId === selectedStudent.id);
  }, [selectedStudent, ledger]);

  // Enhanced Filter Logic
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim() && selectedClassFilter === 'All' && selectedSectionFilter === 'All') return [];
    
    return students.filter(s => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        s.name.toLowerCase().includes(query) || 
        s.grNumber.toLowerCase().includes(query) ||
        (s.rollNo && s.rollNo.toString().includes(query));
      
      const matchesClass = selectedClassFilter === 'All' || s.class === selectedClassFilter;
      const matchesSection = selectedSectionFilter === 'All' || s.section === selectedSectionFilter;

      return matchesSearch && matchesClass && matchesSection;
    }).slice(0, 10);
  }, [students, searchQuery, selectedClassFilter, selectedSectionFilter]);

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || amountToPay <= 0) return;

    setIsProcessing(true);
    
    // Simulate Payment Gateway Logic
    if (paymentMode === 'ONLINE') {
        setGatewayStep('PROCESSING');
        setTimeout(() => {
            finalizeTransaction();
        }, 2500);
    } else {
        finalizeTransaction();
    }
  };

  const finalizeTransaction = () => {
    let txnId = '';
    const methodLabel = paymentMode === 'CASH' ? 'Cash' : onlineMethod;

    if (paymentMode === 'CASH') {
      txnId = `CSH-${nextCashNo}`;
      localStorage.setItem('school_cash_receipt_counter_v1', (nextCashNo + 1).toString());
    } else {
      txnId = `ONL-${nextOnlineNo}`;
      localStorage.setItem('school_online_receipt_counter_v1', (nextOnlineNo + 1).toString());
    }
    
    const newRecord: FeeRecord = {
      id: Math.random().toString(36).substr(2, 9),
      studentId: selectedStudent!.id,
      amount: amountToPay,
      date: paymentDate,
      status: 'PAID',
      type: `Fee Payment [${methodLabel}]`,
      receiptNo: txnId
    };

    const updatedLedger = [newRecord, ...ledger];
    localStorage.setItem('school_fees_ledger_v2', JSON.stringify(updatedLedger));
    
    createAuditLog(
      user, 
      'PAYMENT', 
      'Finance', 
      `[${methodLabel.toUpperCase()}] Collected ₹${amountToPay} from ${selectedStudent!.name}. Receipt: ${txnId}`
    );

    setLastTxnId(txnId);
    setGatewayStep('SUCCESS');
    setIsProcessing(false);
    
    setTimeout(() => {
        setShowSuccess(true);
        setGatewayStep('IDLE');
        setAmountToPay(0);
        setUpiId('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        setTimeout(() => setShowSuccess(false), 3000);
        window.dispatchEvent(new Event('storage'));
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {/* Test Gateway Overlay */}
      {gatewayStep !== 'IDLE' && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 max-w-md w-full shadow-2xl text-center border border-white/10 relative overflow-hidden">
              {gatewayStep === 'PROCESSING' ? (
                <div className="space-y-8 animate-in zoom-in-95 duration-300">
                   <div className="relative">
                      <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] flex items-center justify-center mx-auto relative z-10">
                         <Loader2 size={48} className="text-indigo-600 animate-spin" />
                      </div>
                      <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"></div>
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Processing Transaction</h3>
                      <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Communicating with Test Gateway...</p>
                   </div>
                   <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Secure Protocol</p>
                      <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center justify-center gap-2">
                         <Lock size={14} className="text-emerald-500" /> 256-BIT ENCRYPTION
                      </p>
                   </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in zoom-in-95 duration-300">
                   <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl">
                      <CheckCircle2 size={48} strokeWidth={3} className="animate-bounce" />
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Payment Captured</h3>
                      <p className="text-emerald-600 font-black uppercase text-[10px] tracking-widest mt-2">Institutional Receipt ID: {lastTxnId}</p>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                         <span>Status</span>
                         <span className="text-emerald-500">PAID</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 w-full"></div>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[900] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                 <CheckCircle2 size={32} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-sm uppercase tracking-[0.2em]">Matrix Sync Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-1">Receipt Issued: {lastTxnId}</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Fee Management Hub</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Integrated search by Roll No, GR No, Class & Section.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Identity & Stats Column */}
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Universal Registry Search</label>
                <div className="relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Name, Roll No or GR No..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner placeholder:text-slate-300 dark:placeholder:text-slate-600"
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                    <GraduationCap size={10} /> Class
                  </label>
                  <select 
                    value={selectedClassFilter}
                    onChange={e => setSelectedClassFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="All">All</option>
                    {ALL_CLASSES.map(c => <option key={c} value={c}>{c} Std</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                    <Layers size={10} /> Section
                  </label>
                  <select 
                    value={selectedSectionFilter}
                    onChange={e => setSelectedSectionFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="All">All</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {filteredStudents.length > 0 && (
                <div className="space-y-2 mb-2 max-h-80 overflow-y-auto custom-scrollbar pr-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                   {filteredStudents.map(s => (
                     <button 
                      key={s.id}
                      onClick={() => { setSelectedStudent(s); setSearchQuery(''); setSelectedClassFilter('All'); setSelectedSectionFilter('All'); }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-2xl border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-all text-left group"
                     >
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden flex-shrink-0">
                           {s.profileImage ? <img src={s.profileImage} className="w-full h-full object-cover" alt="S" /> : s.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                           <p className="font-black text-slate-800 dark:text-white text-sm truncate uppercase">{s.name}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-2">
                             <span className="text-indigo-500">Roll: {s.rollNo}</span> • Std {s.class}-{s.section} • GR: {s.grNumber}
                           </p>
                        </div>
                     </button>
                   ))}
                </div>
              )}
           </div>

           {selectedStudent && (
             <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl animate-in slide-in-from-bottom-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                
                <div className="flex items-center gap-5 mb-10 relative z-10">
                   <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
                      {selectedStudent.profileImage ? <img src={selectedStudent.profileImage} className="w-full h-full object-cover" alt="Student" /> : <UserIcon size={24} className="text-white/40" />}
                   </div>
                   <div>
                      <h3 className="font-black text-white uppercase tracking-tight leading-tight truncate max-w-[150px]">{selectedStudent.name}</h3>
                      <p className="text-[10px] font-black text-indigo-400 uppercase mt-1 tracking-widest flex items-center gap-2"><ShieldCheck size={12}/> Profile Bound</p>
                   </div>
                </div>
                
                <div className="space-y-6 relative z-10">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Fee Liability</p>
                         <p className="text-xl font-black text-white">₹{studentTotalFees.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Paid Aggregate</p>
                         <p className="text-xl font-black text-emerald-400">₹{studentPaidAmount.toLocaleString('en-IN')}</p>
                      </div>
                   </div>
                   <div className={`p-6 rounded-[2rem] border text-center transition-all ${studentRemaining > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                      <p className={`text-[10px] font-black uppercase mb-1 tracking-widest ${studentRemaining > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>Remaining Balance</p>
                      <p className={`text-3xl font-black tracking-tighter ${studentRemaining > 0 ? 'text-white' : 'text-emerald-400'}`}>₹{studentRemaining.toLocaleString('en-IN')}</p>
                   </div>
                   <div className="pt-4 border-t border-white/5">
                      <button onClick={() => setSelectedStudent(null)} className="text-[9px] font-black uppercase text-rose-400 tracking-widest hover:text-rose-300">Deselect Identity</button>
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* Collection Terminal */}
        <div className="xl:col-span-2 space-y-8">
           {selectedStudent ? (
             <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between">
                   <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
                      <Wallet className="text-indigo-600" /> Payment Terminal
                   </h3>
                   <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-100 dark:border-slate-700 shadow-sm">
                      <button 
                        onClick={() => setPaymentMode('ONLINE')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMode === 'ONLINE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600'}`}
                      >
                         <Globe size={14} className="inline mr-2" /> Online
                      </button>
                      <button 
                        onClick={() => setPaymentMode('CASH')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMode === 'CASH' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-emerald-600'}`}
                      >
                         <Banknote size={14} className="inline mr-2" /> Cash
                      </button>
                   </div>
                </div>

                <form onSubmit={handleProcessPayment} className="p-10 space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Left: General Transaction Info */}
                      <div className="space-y-6">
                         <div className="space-y-2">
                           <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Payment Volume (₹)</label>
                           <div className="relative">
                              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-300 font-black text-3xl">₹</div>
                              <input 
                                type="number" 
                                required
                                value={amountToPay || ''}
                                onChange={e => setAmountToPay(parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] pl-16 pr-8 py-8 text-4xl font-black text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-inner"
                              />
                           </div>
                         </div>
                         
                         <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Collection Date</label>
                            <div className="relative group">
                               <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                               <input 
                                 type="date" 
                                 required
                                 value={paymentDate}
                                 onChange={e => setPaymentDate(e.target.value)}
                                 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                               />
                            </div>
                         </div>
                      </div>

                      {/* Right: Dynamic Payment Method Details */}
                      <div className="space-y-6">
                         {paymentMode === 'CASH' ? (
                           <div className="space-y-6 animate-in slide-in-from-right-4">
                              <div className="space-y-2">
                                 <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1">Pending Cash Receipt ID</label>
                                 <div className="relative group">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                    <input 
                                      type="text" 
                                      readOnly
                                      value={`CSH-${nextCashNo}`}
                                      className="w-full bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-2xl pl-12 pr-4 py-4 font-black text-emerald-700 dark:text-emerald-400 outline-none shadow-sm cursor-not-allowed"
                                    />
                                 </div>
                              </div>
                              <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-start gap-3">
                                 <Info size={18} className="text-emerald-500 flex-shrink-0" />
                                 <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase leading-relaxed tracking-tight">SYSTEM WILL AUTOMATICALLY ASSIGN RECEIPT ID CSH-{nextCashNo} UPON COMMITMENT.</p>
                              </div>
                           </div>
                         ) : (
                           <div className="space-y-6 animate-in slide-in-from-right-4">
                              <div className="space-y-3">
                                 <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Secure Digital Channel</label>
                                 <div className="grid grid-cols-2 gap-3">
                                    {[
                                      { id: 'UPI', icon: <Smartphone size={16}/> },
                                      { id: 'Google Pay', icon: <Smartphone size={16}/> },
                                      { id: 'Debit Card', icon: <CreditCard size={16}/> },
                                      { id: 'Credit Card', icon: <CreditCard size={16}/> },
                                    ].map(method => (
                                      <button 
                                       key={method.id}
                                       type="button"
                                       onClick={() => setOnlineMethod(method.id as any)}
                                       className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${onlineMethod === method.id ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-400 shadow-md scale-[1.02]' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400 hover:border-slate-200'}`}
                                      >
                                         {method.icon}
                                         <span className="text-[9px] font-black uppercase tracking-widest">{method.id}</span>
                                      </button>
                                    ))}
                                 </div>
                              </div>

                              <div className="space-y-4 pt-2">
                                 <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1">Pending Online Receipt ID</label>
                                    <div className="relative group">
                                       <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                                       <input 
                                         type="text" 
                                         readOnly
                                         value={`ONL-${nextOnlineNo}`}
                                         className="w-full bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-2xl pl-12 pr-4 py-4 font-black text-indigo-700 dark:text-indigo-400 outline-none shadow-sm cursor-not-allowed"
                                       />
                                    </div>
                                 </div>
                                 {(onlineMethod === 'UPI' || onlineMethod === 'Google Pay') ? (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Virtual Private Address (UPI ID)</label>
                                       <div className="relative group">
                                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                          <input 
                                            type="text" 
                                            required
                                            value={upiId}
                                            onChange={e => setUpiId(e.target.value)}
                                            placeholder="username@bank"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                          />
                                       </div>
                                    </div>
                                 ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                       <div className="space-y-2">
                                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Card Identification</label>
                                          <div className="relative group">
                                             <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                             <input 
                                               type="text" 
                                               required
                                               value={cardNumber}
                                               onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                                               placeholder="XXXX XXXX XXXX XXXX"
                                               className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                             />
                                          </div>
                                       </div>
                                       <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                             <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Expiry</label>
                                             <input 
                                               type="text" 
                                               required
                                               value={cardExpiry}
                                               onChange={e => setCardExpiry(e.target.value.substring(0, 5))}
                                               placeholder="MM/YY"
                                               className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-center"
                                             />
                                          </div>
                                          <div className="space-y-2">
                                             <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CVV</label>
                                             <input 
                                               type="password" 
                                               required
                                               value={cardCvv}
                                               onChange={e => setCardCvv(e.target.value.substring(0, 3))}
                                               placeholder="***"
                                               className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-center"
                                             />
                                          </div>
                                       </div>
                                    </div>
                                 )}
                              </div>
                           </div>
                         )}
                      </div>
                   </div>

                   <button 
                    type="submit"
                    disabled={isProcessing || amountToPay <= 0}
                    className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 ${paymentMode === 'CASH' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200/50' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200/50'} disabled:opacity-50 hover:-translate-y-1 active:scale-[0.98]`}
                   >
                      {isProcessing ? (
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                           Process Securely <ArrowUpRight size={20} strokeWidth={3} />
                        </>
                      )}
                   </button>
                </form>
             </div>
           ) : (
             <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-40 rounded-[3rem] text-center border-4 border-dashed border-white/30 dark:border-slate-800 flex flex-col items-center justify-center h-full">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner border border-slate-50 dark:border-slate-700">
                   <Search size={48} />
                </div>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-3 uppercase tracking-tight">Session Locked</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto text-lg leading-relaxed uppercase tracking-tight">Identification of student registry record required to initialize the collection terminal.</p>
             </div>
           )}
        </div>
      </div>

      {/* History Table */}
      {selectedStudent && (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in duration-700">
           <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Transaction Archive</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Institutional fiscal history for {selectedStudent.name}</p>
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Registry</p>
                    <p className="text-2xl font-black text-indigo-600">₹{studentPaidAmount.toLocaleString('en-IN')}</p>
                 </div>
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                       <th className="px-10 py-6">Timeline</th>
                       <th className="px-8 py-6">Gateway Method</th>
                       <th className="px-8 py-6">System Receipt ID</th>
                       <th className="px-8 py-6 text-right">Commit (₹)</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {studentHistory.length > 0 ? (
                      studentHistory.map(record => (
                        <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                           <td className="px-10 py-8">
                              <div className="flex items-center gap-3">
                                 <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Calendar size={16} />
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">{new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Registry Logged</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-8">
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase border ${
                                record.type.includes('Cash') ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100'
                              }`}>
                                 {record.type.match(/\[(.*?)\]/)?.[1] || 'Unknown Channel'}
                              </span>
                           </td>
                           <td className="px-8 py-8 font-black text-slate-600 dark:text-slate-400 text-xs tracking-widest uppercase">
                              {record.receiptNo}
                           </td>
                           <td className="px-10 py-8 text-right font-black text-slate-900 dark:text-white text-lg">₹{record.amount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                         <td colSpan={4} className="py-24 text-center">
                            <History size={48} className="mx-auto text-slate-100 dark:text-slate-800 mb-4" />
                            <p className="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest text-xs">No institutional transaction history discovered</p>
                         </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default FeesManagement;
