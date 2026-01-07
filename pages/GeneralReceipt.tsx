
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, FeeRecord, FeeCategory } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Receipt, 
  Search, 
  Printer, 
  X, 
  User as UserIcon, 
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Smartphone,
  Banknote,
  Download
} from 'lucide-react';
import { MOCK_STUDENTS, APP_NAME } from '../constants';

interface GeneralReceiptProps {
  user: User;
  schoolLogo: string | null;
}

const GeneralReceipt: React.FC<GeneralReceiptProps> = ({ user, schoolLogo }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'CHEQUE'>('CASH');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<any>(null);

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

  const categories = useMemo(() => {
    const saved = localStorage.getItem('school_fee_categories_v2');
    return saved ? JSON.parse(saved) as FeeCategory[] : [];
  }, []);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return students.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      /* Fix: Property 'grNo' does not exist on type 'Student'. Replaced with 'grNumber'. */
      s.grNumber.includes(searchQuery)
    ).slice(0, 5);
  }, [students, searchQuery]);

  const toggleFeeSelection = (id: string) => {
    setSelectedFees(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const currentConfig = useMemo(() => {
    const saved = localStorage.getItem('school_receipt_config');
    return saved ? JSON.parse(saved) : { prefix: 'DIS-', suffix: '-2026', currentCounter: 1001, format: '{PREFIX}{COUNTER}{SUFFIX}' };
  }, []);

  const issueReceipt = () => {
    if (!selectedStudent || selectedFees.length === 0 || amountReceived <= 0) return;
    
    setIsProcessing(true);
    
    setTimeout(() => {
      const receiptNo = currentConfig.format
        .replace('{PREFIX}', currentConfig.prefix)
        .replace('{COUNTER}', currentConfig.currentCounter.toString().padStart(4, '0'))
        .replace('{SUFFIX}', currentConfig.suffix);

      const feeNames = selectedFees.map(id => categories.find(c => c.id === id)?.name || 'Unknown Fee');

      const receiptData = {
        receiptNo,
        student: selectedStudent,
        fees: feeNames,
        amount: amountReceived,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        mode: paymentMode,
        issuedBy: user.name
      };

      // Save to global ledger
      const ledger: FeeRecord[] = JSON.parse(localStorage.getItem('school_fees_ledger_v2') || '[]');
      const newRecord: FeeRecord = {
        id: Math.random().toString(36).substr(2, 9),
        studentId: selectedStudent.id,
        amount: amountReceived,
        date: new Date().toISOString().split('T')[0],
        status: 'PAID',
        type: feeNames.join(', '),
        receiptNo: receiptNo
      };
      localStorage.setItem('school_fees_ledger_v2', JSON.stringify([newRecord, ...ledger]));

      // Increment receipt counter
      const newConfig = { ...currentConfig, currentCounter: currentConfig.currentCounter + 1 };
      localStorage.setItem('school_receipt_config', JSON.stringify(newConfig));

      createAuditLog(user, 'PAYMENT', 'Finance', `Issued receipt ${receiptNo} to ${selectedStudent.name} for ₹${amountReceived}`);
      
      setGeneratedReceipt(receiptData);
      setIsProcessing(false);
      setShowPrintView(true);
      
      // Notify dashboard to update daily collection
      window.dispatchEvent(new Event('storage'));
      
      // Reset form
      setSelectedStudent(null);
      setSelectedFees([]);
      setAmountReceived(0);
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {/* Dynamic Printing CSS for Logo & Branded Header */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">General Receipt Terminal</h1>
          <p className="text-slate-500 font-medium text-lg">Process institutional payments and generate fiscal certificates.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-5 py-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 text-[11px] font-black uppercase tracking-widest shadow-sm">
              Current Sequence: <span className="text-indigo-900">{currentConfig.prefix}{currentConfig.currentCounter}{currentConfig.suffix}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Identity Recognition</label>
              <div className="relative group mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                 <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Student Name or GR No..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                 />
              </div>

              {filteredStudents.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                   {filteredStudents.map(s => (
                     <button 
                      key={s.id}
                      onClick={() => { setSelectedStudent(s); setSearchQuery(''); }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-indigo-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all text-left group"
                     >
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                           {s.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                           <p className="font-black text-slate-800 text-sm truncate uppercase">{s.name}</p>
                           {/* Fix: Property 'grNo' does not exist on type 'Student'. Replaced with 'grNumber'. */}
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Std {s.class} • GR: {s.grNumber}</p>
                        </div>
                     </button>
                   ))}
                </div>
              )}
           </div>

           {selectedStudent && (
             <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl animate-in slide-in-from-bottom-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                <div className="flex items-center gap-5 mb-8 relative z-10">
                   <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
                      {selectedStudent.profileImage ? <img src={selectedStudent.profileImage} className="w-full h-full object-cover" alt="Student" /> : <UserIcon size={24} className="text-white/40" />}
                   </div>
                   <div>
                      <h3 className="font-black text-white uppercase tracking-tight leading-tight">{selectedStudent.name}</h3>
                      <p className="text-[10px] font-black text-indigo-400 uppercase mt-1 tracking-widest">Enrollment Verified</p>
                   </div>
                </div>
                
                <div className="space-y-4 relative z-10">
                   <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-widest">General Register</span>
                      {/* Fix: Property 'grNo' does not exist on type 'Student'. Replaced with 'grNumber'. */}
                      <span className="font-black text-white">{selectedStudent.grNumber}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-widest">Academic Grade</span>
                      <span className="font-black text-white">Class {selectedStudent.class}-{selectedStudent.section}</span>
                   </div>
                   <div className="pt-4 border-t border-white/5">
                      <button onClick={() => setSelectedStudent(null)} className="text-[9px] font-black uppercase text-rose-400 tracking-widest hover:text-rose-300">Deselect Student</button>
                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="xl:col-span-2">
           <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">
              <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                 <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                    <Receipt className="text-indigo-600" /> Transaction Ledger
                 </h3>
                 <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Session</span>
                 </div>
              </div>

              <div className="p-10 space-y-10 flex-1">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Select Applied Headings</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                       {categories.map(cat => (
                         <button 
                          key={cat.id}
                          onClick={() => toggleFeeSelection(cat.id)}
                          className={`px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all text-center ${selectedFees.includes(cat.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-transparent text-slate-400 hover:border-indigo-100'}`}
                         >
                            {cat.name}
                         </button>
                       ))}
                    </div>
                    {categories.length === 0 && (
                      <p className="text-center py-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-400 text-xs font-bold uppercase">No fee categories found. Configure them in Fee Setup first.</p>
                    )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Received Amount (₹)</label>
                       <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 font-black text-2xl">₹</div>
                          <input 
                            type="number" 
                            value={amountReceived || ''}
                            onChange={e => setAmountReceived(parseInt(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full bg-slate-50 border border-slate-200 rounded-3xl pl-12 pr-4 py-6 text-3xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all shadow-inner"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Channel</label>
                       <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                          <select 
                            value={paymentMode}
                            onChange={e => setPaymentMode(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-3xl pl-12 pr-4 py-6 font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                          >
                             <option value="CASH">CASH TRANSACTION</option>
                             <option value="ONLINE">ONLINE TRANSFER</option>
                             <option value="CHEQUE">BANK CHEQUE</option>
                          </select>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-10 bg-slate-50/50 border-t border-slate-100">
                 <button 
                  onClick={issueReceipt}
                  disabled={isProcessing || !selectedStudent || selectedFees.length === 0 || amountReceived <= 0}
                  className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:translate-y-0 flex items-center justify-center gap-4 text-sm tracking-[0.2em] uppercase active:scale-95"
                 >
                    {isProcessing ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Banknote size={20} strokeWidth={3} /> Commit Payment & Print Certificate
                      </>
                    )}
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Branded Receipt Viewer Terminal */}
      {showPrintView && generatedReceipt && (
        <div className="fixed inset-0 z-[600] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 lg:p-10 no-print animate-in zoom-in-95 duration-300">
           <div className="bg-white rounded-[3rem] w-full max-w-4xl h-full flex flex-col shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-emerald-100">
                       <ShieldCheck size={24} />
                    </div>
                    <div>
                       <h3 className="text-slate-900 font-black text-xl tracking-tight uppercase">Financial Token Issued</h3>
                       <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Document ID: {generatedReceipt.receiptNo}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => { window.print(); }} className="px-8 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-xl">
                       <Printer size={18} /> Print Certificate
                    </button>
                    <button onClick={() => setShowPrintView(false)} className="p-4 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
                       <X size={28} />
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-slate-200/50 flex justify-center">
                 <div className="bg-white w-full max-w-2xl shadow-2xl p-16 relative overflow-hidden" id="receipt-print-area">
                    {/* Security Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] -rotate-45">
                       <h1 className="text-[12rem] font-black uppercase text-indigo-900">VERIFIED</h1>
                    </div>

                    <div className="relative z-10 space-y-12">
                       {/* Receipt Header with School Logo */}
                       <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
                          <div className="flex items-center gap-6">
                             <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden border-2 border-slate-100">
                                {schoolLogo ? (
                                  <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" />
                                ) : (
                                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white font-black text-3xl">E</div>
                                )}
                             </div>
                             <div>
                                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{APP_NAME}</h2>
                                <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.4em] mt-1">Institutional Fee Receipt Certificate</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-slate-400 font-black text-[9px] uppercase mb-1">Receipt ID</p>
                             <p className="text-slate-900 font-black text-xl">{generatedReceipt.receiptNo}</p>
                          </div>
                       </div>

                       {/* Transaction Metadata */}
                       <div className="grid grid-cols-2 gap-10">
                          <div className="space-y-6">
                             <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Payee Information</p>
                                <p className="text-xl font-black text-slate-900 uppercase leading-tight">{generatedReceipt.student.name}</p>
                                <div className="flex gap-4 mt-1 text-[11px] font-bold text-slate-500 uppercase">
                                   {/* Fix: Property 'grNo' does not exist on type 'Student'. Replaced with 'grNumber'. */}
                                   <span>GR: {generatedReceipt.student.grNumber}</span>
                                   <span>Std: {generatedReceipt.student.class}-{generatedReceipt.student.section}</span>
                                </div>
                             </div>
                          </div>
                          <div className="text-right space-y-6">
                             <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Fiscal Date</p>
                                <p className="text-lg font-black text-slate-900">{generatedReceipt.date}</p>
                             </div>
                             <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Transaction Mode</p>
                                <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">{generatedReceipt.mode}</p>
                             </div>
                          </div>
                       </div>

                       {/* Line Items */}
                       <div className="border-t-2 border-slate-100 pt-10">
                          <table className="w-full">
                             <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                   <th className="text-left pb-4">Description of Applied Fees</th>
                                   <th className="text-right pb-4">Taxable Subtotal</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                                <tr className="text-sm font-bold text-slate-700">
                                   <td className="py-8 uppercase leading-relaxed max-w-[300px]">{generatedReceipt.fees.join(', ')}</td>
                                   <td className="py-8 text-right font-black text-slate-900 text-lg">₹{generatedReceipt.amount.toLocaleString('en-IN')}</td>
                                </tr>
                             </tbody>
                             <tfoot>
                                <tr className="border-t-4 border-slate-900">
                                   <td className="py-8 text-[11px] font-black uppercase tracking-widest">Total Amount Synchronized</td>
                                   <td className="py-8 text-right text-4xl font-black text-slate-900 tracking-tighter">₹{generatedReceipt.amount.toLocaleString('en-IN')}</td>
                                </tr>
                             </tfoot>
                          </table>
                       </div>

                       {/* Verification & Signatures */}
                       <div className="pt-24 flex justify-between items-end">
                          <div className="text-center group">
                             <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center p-3 mb-3 border border-slate-100 group-hover:border-emerald-200 transition-all">
                                <ShieldCheck size={40} className="text-emerald-500" />
                             </div>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Authorized Token</p>
                          </div>
                          <div className="text-center">
                             <div className="w-56 border-b-2 border-slate-900 mb-2"></div>
                             <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Registrar / Official Signatory</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Processed By: {generatedReceipt.issuedBy}</p>
                          </div>
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
