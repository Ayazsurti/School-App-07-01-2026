
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, FeeRecord, FeeCategory } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { Receipt, Search, Printer, X, User as UserIcon, CreditCard, ShieldCheck, CheckCircle2, FileText, Smartphone, Banknote, Download, Building2, Globe, Loader2, RefreshCw } from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';
import { APP_NAME } from '../constants';

interface GeneralReceiptProps { user: User; schoolLogo: string | null; }

const GeneralReceipt: React.FC<GeneralReceiptProps> = ({ user, schoolLogo }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [config, setConfig] = useState<any>(null);
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'OFFLINE' | 'ONLINE' | 'CHEQUE'>('OFFLINE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<any>(null);

  const fetchInitialData = async () => {
    try {
      const [sData, structs, settings] = await Promise.all([
        db.students.getAll(),
        db.fees.getStructures(),
        db.settings.getAll()
      ]);
      setStudents(sData.map((s: any) => ({ ...s, fullName: s.full_name, grNumber: s.gr_number })) as any);
      if (structs.length > 0) setCategories(structs[0].fees.map((f: any) => ({ id: f.categoryId, name: f.quarter || f.categoryId })));
      if (settings.fiscal_receipt_config) setConfig(JSON.parse(settings.fiscal_receipt_config));
      else setConfig({ prefix: 'DIS-', suffix: '-2026', currentCounter: 1001, format: '{PREFIX}{COUNTER}{SUFFIX}' });
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchInitialData(); }, []);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return students.filter(s => s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || s.grNumber?.includes(searchQuery)).slice(0, 5);
  }, [students, searchQuery]);

  const toggleFeeSelection = (id: string) => { setSelectedFees(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };

  const issueReceipt = async () => {
    if (!selectedStudent || selectedFees.length === 0 || amountReceived <= 0 || !config) return;
    setIsProcessing(true);
    try {
      const receiptNo = config.format.replace('{PREFIX}', config.prefix).replace('{COUNTER}', config.currentCounter.toString().padStart(4, '0')).replace('{SUFFIX}', config.suffix);
      const feeNames = selectedFees.map(id => categories.find(c => c.id === id)?.name || 'Unknown Fee');
      
      const receiptData = { receiptNo, student: selectedStudent, fees: feeNames, amount: amountReceived, date: new Date().toLocaleDateString('en-GB'), mode: paymentMode, issuedBy: user.name };

      await db.fees.insertPayment({ studentId: selectedStudent.id, amount: amountReceived, date: new Date().toISOString().split('T')[0], status: 'PAID', type: feeNames.join(', '), receiptNo, mode: paymentMode });
      
      const nextConfig = { ...config, currentCounter: config.currentCounter + 1 };
      await db.settings.update('fiscal_receipt_config', JSON.stringify(nextConfig));
      setConfig(nextConfig);

      createAuditLog(user, 'PAYMENT', 'Finance', `[${paymentMode}] Issued receipt ${receiptNo} to ${selectedStudent.fullName} for ₹${amountReceived}`);
      setGeneratedReceipt(receiptData);
      setIsProcessing(false);
      setShowPrintView(true);
      setSelectedStudent(null); setSelectedFees([]); setAmountReceived(0);
    } catch (e) { alert("Sync Failure: " + getErrorMessage(e)); setIsProcessing(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      <style>{`
        @media print { body * { visibility: hidden; } #receipt-print-area, #receipt-print-area * { visibility: visible; } #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; background: white !important; padding: 0 !important; } .no-print { display: none !important; } }
      `}</style>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">General Receipt Terminal</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Integrated Fiscal Processing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 px-4 sm:px-0">
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Identity Recon</label>
              <div className="relative group mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                 <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Student Name or GR No..." className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-2xl pl-12 pr-4 py-4 font-black uppercase outline-none transition-all shadow-inner text-xs" />
              </div>
              <div className="space-y-2">
                 {filteredStudents.map(s => (
                   <button key={s.id} onClick={() => { setSelectedStudent(s); setSearchQuery(''); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${selectedStudent?.id === s.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-indigo-100'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedStudent?.id === s.id ? 'bg-white/20' : 'bg-indigo-600 text-white'}`}>{s.fullName?.charAt(0)}</div>
                      <div className="min-w-0 flex-1"><p className="font-black text-xs uppercase truncate leading-tight">{s.fullName}</p><p className={`text-[8px] font-bold uppercase tracking-widest ${selectedStudent?.id === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>Std {s.class} • GR: {s.grNumber}</p></div>
                   </button>
                 ))}
              </div>
           </div>
        </div>

        <div className="xl:col-span-2">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between">
                 <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 uppercase tracking-tight"><Receipt className="text-indigo-600" /> Payment Protocol</h3>
                 <ShieldCheck size={20} className="text-emerald-500" />
              </div>
              <div className="p-10 space-y-10 flex-1">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 ml-1">Fee Allocation</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                       {categories.map(cat => (
                         <button key={cat.id} onClick={() => toggleFeeSelection(cat.id)} className={`px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all text-center ${selectedFees.includes(cat.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400 hover:border-indigo-100'}`}>{cat.name}</button>
                       ))}
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Received Volume (₹)</label>
                       <div className="relative"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 font-black text-2xl">₹</div><input type="number" value={amountReceived || ''} onChange={e => setAmountReceived(parseInt(e.target.value) || 0)} placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl pl-12 pr-4 py-6 text-3xl font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" /></div>
                    </div>
                    <div className="space-y-4">
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Channel</label>
                       <div className="grid grid-cols-3 gap-3">
                          {(['OFFLINE', 'ONLINE', 'CHEQUE'] as const).map(m => (
                             <button key={m} onClick={() => setPaymentMode(m)} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMode === m ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>
                                {m === 'OFFLINE' ? <Banknote size={24}/> : m === 'ONLINE' ? <Globe size={24}/> : <Building2 size={24}/>}
                                <span className="text-[9px] font-black uppercase">{m}</span>
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
              <div className="p-10 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
                 <button onClick={issueReceipt} disabled={isProcessing || !selectedStudent || selectedFees.length === 0 || amountReceived <= 0} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center justify-center gap-4 text-sm tracking-[0.2em] uppercase">
                    {isProcessing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />} Process & Issue
                 </button>
              </div>
           </div>
        </div>
      </div>

      {showPrintView && generatedReceipt && (
        <div className="fixed inset-0 z-[600] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 lg:p-10 no-print animate-in zoom-in-95">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white"><CheckCircle2 size={24} /></div>
                    <div><h3 className="text-slate-900 font-black text-xl tracking-tight uppercase">Audit Trail Ready</h3><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">ID: {generatedReceipt.receiptNo}</p></div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => window.print()} className="px-8 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl"><Printer size={18} /> Print</button>
                    <button onClick={() => setShowPrintView(false)} className="p-4 hover:bg-slate-100 rounded-2xl text-slate-400"><X size={28} /></button>
                 </div>
              </div>
              <div className="flex-1 overflow-auto p-12 bg-slate-200/50 flex justify-center">
                 <div className="bg-white w-full max-w-xl shadow-2xl p-16 relative overflow-hidden" id="receipt-print-area">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] -rotate-45 font-black text-[10rem]">{generatedReceipt.mode}</div>
                    <div className="relative z-10 space-y-12">
                       <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
                          <div className="flex items-center gap-4">
                             <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-100">{schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" /> : <div className="bg-slate-900 w-full h-full text-white flex items-center justify-center font-black">E</div>}</div>
                             <div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{APP_NAME}</h2><p className="text-indigo-600 font-black text-[8px] uppercase tracking-[0.4em]">Official Receipt</p></div>
                          </div>
                          <div className="text-right"><p className="text-slate-900 font-black text-lg">{generatedReceipt.receiptNo}</p><p className="text-slate-400 font-bold text-[8px] uppercase">{generatedReceipt.date}</p></div>
                       </div>
                       <div className="space-y-8">
                          <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Payee</p><p className="text-lg font-black text-slate-900 uppercase leading-tight">{generatedReceipt.student.fullName}</p><p className="text-[10px] font-bold text-slate-500 uppercase mt-1">GR: {generatedReceipt.student.grNumber}</p></div>
                          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase mb-4 tracking-widest">Allocation</p><h4 className="text-sm font-bold text-slate-700 uppercase leading-relaxed">{generatedReceipt.fees.join(', ')}</h4><div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-end"><span className="text-[10px] font-black uppercase">Aggregate</span><span className="text-3xl font-black text-slate-900 tracking-tighter">₹{generatedReceipt.amount.toLocaleString('en-IN')}</span></div></div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GeneralReceipt;
