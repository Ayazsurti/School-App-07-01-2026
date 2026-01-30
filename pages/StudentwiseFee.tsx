
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, FeeStructure, FeeCategory } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { BadgeDollarSign, Search, User as UserIcon, Save, CheckCircle2, ChevronRight, AlertCircle, GraduationCap, ShieldCheck, DollarSign, Loader2, RefreshCw } from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';

interface StudentwiseFeeProps { user: User; }

const StudentwiseFee: React.FC<StudentwiseFeeProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [individualFees, setIndividualFees] = useState<Record<string, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchRegistry = async () => {
    try {
      const [studentData, feeStructs] = await Promise.all([
        db.students.getAll(),
        db.fees.getStructures()
      ]);
      setStudents(studentData.map((s: any) => ({ ...s, fullName: s.full_name, grNumber: s.gr_number, feeOverrides: s.fee_overrides || {} })) as any);
      
      // Auto-extract categories from first available structure if possible
      if (feeStructs.length > 0 && feeStructs[0].fees) {
        setCategories(feeStructs[0].fees.map((f: any) => ({ id: f.categoryId, name: f.quarter || f.categoryId, frequency: 'QUARTERLY' })));
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchRegistry(); }, []);

  useEffect(() => {
    if (selectedStudent) {
      setIndividualFees(selectedStudent.feeOverrides || {});
    }
  }, [selectedStudent]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return students.filter(s => (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.grNumber || '').includes(searchQuery)).slice(0, 5);
  }, [students, searchQuery]);

  const handleUpdateAmount = (catId: string, amount: number) => { setIndividualFees(prev => ({ ...prev, [catId]: amount })); };

  const handleSave = async () => {
    if (!selectedStudent) return;
    setIsSyncing(true);
    try {
      await db.students.upsert({ ...selectedStudent, feeOverrides: individualFees });
      createAuditLog(user, 'UPDATE', 'Finance', `Overrode fee structure for: ${selectedStudent.fullName} (${selectedStudent.grNumber})`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchRegistry();
    } catch (err: any) { alert(getErrorMessage(err)); }
    finally { setIsSyncing(false); }
  };

  const aggregateTotal = useMemo(() => (Object.values(individualFees) as number[]).reduce((a, b) => a + b, 0), [individualFees]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div><p className="font-black text-xs uppercase tracking-[0.2em]">Matrix Realigned</p></div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Individual Fee Setup</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional Override Terminal.</p>
        </div>
        {selectedStudent && (
          <button onClick={handleSave} disabled={isSyncing} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 uppercase text-xs active:scale-95 disabled:opacity-50">
            {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Sync Identity Structure
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 px-4 sm:px-0">
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Identity Recognition</label>
              <div className="relative group mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                 <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Name or GR Number..." className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-2xl pl-12 pr-4 py-4 font-black uppercase outline-none transition-all shadow-inner text-xs" />
              </div>
              <div className="space-y-2">
                 {filteredStudents.map(s => (
                   <button key={s.id} onClick={() => { setSelectedStudent(s); setSearchQuery(''); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${selectedStudent?.id === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-indigo-100'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedStudent?.id === s.id ? 'bg-white/20' : 'bg-indigo-600 text-white'}`}>{s.fullName?.charAt(0)}</div>
                      <div className="min-w-0">
                         <p className="font-black text-xs uppercase truncate leading-tight">{s.fullName}</p>
                         <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${selectedStudent?.id === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>GR: {s.grNumber}</p>
                      </div>
                   </button>
                 ))}
              </div>
           </div>
        </div>

        <div className="xl:col-span-2">
           {selectedStudent ? (
             <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-right-4">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center gap-6">
                   <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl overflow-hidden border-2 border-white/20">
                      {selectedStudent.profileImage ? <img src={selectedStudent.profileImage} className="w-full h-full object-cover" /> : <UserIcon size={32} />}
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedStudent.fullName}</h3>
                      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mt-1 tracking-[0.3em]">GR NODE: {selectedStudent.grNumber}</p>
                   </div>
                </div>
                <div className="p-10 space-y-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-l-4 border-indigo-600 pl-4 py-1">Custom Allocation Matrix</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {categories.map(cat => (
                        <div key={cat.id} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-xl">
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{cat.name}</p>
                           </div>
                           <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">₹</div>
                              <input type="number" value={individualFees[cat.id] || 0} onChange={e => handleUpdateAmount(cat.id, parseInt(e.target.value) || 0)} className="w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-3 font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="p-10 bg-slate-900 flex items-center justify-between text-white border-t border-white/5">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Overridden Aggregate Liability</p>
                      <p className="text-3xl font-black text-indigo-400">₹{new Intl.NumberFormat('en-IN').format(aggregateTotal)}</p>
                   </div>
                   <button onClick={handleSave} disabled={isSyncing} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 uppercase text-xs">Apply Override</button>
                </div>
             </div>
           ) : (
             <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl p-32 rounded-[3rem] text-center border-4 border-dashed border-white/50 dark:border-slate-800 flex flex-col items-center justify-center h-full">
                <Search size={64} className="text-slate-200 mb-8" />
                <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tight">Identity Bounding Required</h3>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-4">Select student node from the terminal to modify financial profiles.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default StudentwiseFee;
