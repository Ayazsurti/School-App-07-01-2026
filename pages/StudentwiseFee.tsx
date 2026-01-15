import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, FeeStructure, FeeCategory } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  BadgeDollarSign, 
  Search, 
  User as UserIcon, 
  Save, 
  CheckCircle2, 
  ChevronRight, 
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { MOCK_STUDENTS } from '../constants';

interface StudentwiseFeeProps {
  user: User;
}

const StudentwiseFee: React.FC<StudentwiseFeeProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('school_students_db');
    return saved ? JSON.parse(saved) : MOCK_STUDENTS as any as Student[];
  });

  const [categories] = useState<FeeCategory[]>(() => {
    const saved = localStorage.getItem('school_fee_categories');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [individualFees, setIndividualFees] = useState<Record<string, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (selectedStudent) {
      const savedFees = localStorage.getItem(`student_fees_${selectedStudent.id}`);
      if (savedFees) {
        setIndividualFees(JSON.parse(savedFees));
      } else {
        const classStructures: FeeStructure[] = JSON.parse(localStorage.getItem('school_fee_structures') || '[]');
        const classStruct = classStructures.find(s => s.className === selectedStudent.class);
        const fees: Record<string, number> = {};
        classStruct?.fees.forEach(f => {
          fees[f.categoryId] = f.amount;
        });
        setIndividualFees(fees);
      }
    }
  }, [selectedStudent]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return students.filter(s => 
      (s.fullName || s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.grNumber || '').includes(searchQuery) || 
      (s.rollNo || '').includes(searchQuery)
    ).slice(0, 5);
  }, [students, searchQuery]);

  const handleUpdateAmount = (catId: string, amount: number) => {
    setIndividualFees(prev => ({ ...prev, [catId]: amount }));
  };

  const handleSave = () => {
    if (!selectedStudent) return;
    localStorage.setItem(`student_fees_${selectedStudent.id}`, JSON.stringify(individualFees));
    createAuditLog(user, 'UPDATE', 'Finance', `Overrode fee structure for: ${selectedStudent.fullName || selectedStudent.name} (${selectedStudent.grNumber})`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const aggregateTotal = useMemo(() => {
    // Fix: Explicitly cast Object.values to number[] to avoid 'unknown' type errors during arithmetic reduction
    return (Object.values(individualFees) as number[]).reduce((a, b) => a + b, 0);
  }, [individualFees]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Override Success</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Student profile synchronized</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Individual Fee Setup</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Manage scholarships, concessions, and custom fee overrides per student.</p>
        </div>
        {selectedStudent && (
          <button 
            onClick={handleSave}
            className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3"
          >
            <Save size={20} strokeWidth={3} /> Sync Student Structure
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 glass-card">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Search Student Identity</label>
              <div className="relative group mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                 <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Name, GR No or Roll..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                 />
              </div>

              {filteredStudents.length > 0 && (
                <div className="space-y-2 mb-6">
                   {filteredStudents.map(s => (
                     <button 
                      key={s.id}
                      onClick={() => { setSelectedStudent(s); setSearchQuery(''); }}
                      className="w-full flex items-center gap-4 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-2xl border border-transparent hover:border-indigo-100 transition-all text-left group"
                     >
                        <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden">
                           {s.profileImage ? <img src={s.profileImage} className="w-full h-full object-cover" /> : (s.fullName || s.name || '').charAt(0)}
                        </div>
                        <div className="min-w-0">
                           <p className="font-black text-slate-800 dark:text-white text-sm truncate uppercase">{s.fullName || s.name}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase">GR: {s.grNumber} • Std {s.class}</p>
                        </div>
                     </button>
                   ))}
                </div>
              )}

              <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[1.5rem] border border-indigo-100 dark:border-indigo-900 flex items-start gap-4">
                 <AlertCircle className="text-indigo-400 flex-shrink-0" size={20} />
                 <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 leading-relaxed uppercase">
                    Use this module to manually adjust fees for students with financial aid or special academic grants.
                 </p>
              </div>
           </div>
        </div>

        <div className="xl:col-span-2">
           {selectedStudent ? (
             <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-right-4 duration-500 glass-card">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center gap-6">
                   <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl overflow-hidden border-2 border-white/20">
                      {selectedStudent.profileImage ? <img src={selectedStudent.profileImage} className="w-full h-full object-cover" alt="Student" /> : <UserIcon size={32} />}
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedStudent.fullName || selectedStudent.name}</h3>
                      <div className="flex items-center gap-4 mt-1">
                         <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={12} /> GR: {selectedStudent.grNumber}</span>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><GraduationCap size={12} /> Class {selectedStudent.class}-{selectedStudent.section}</span>
                      </div>
                   </div>
                </div>

                <div className="p-10 space-y-6">
                   <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em] border-l-4 border-indigo-600 pl-4 py-1">Custom Fee Allocation</h4>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {categories.map(cat => (
                        <div key={cat.id} className="p-6 bg-slate-50/80 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-xl">
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{cat.name}</p>
                              <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">{cat.frequency} Cycle</p>
                           </div>
                           <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">₹</div>
                              <input 
                                type="number" 
                                value={individualFees[cat.id] || 0}
                                onChange={e => handleUpdateAmount(cat.id, parseInt(e.target.value) || 0)}
                                className="w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-3 font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                              />
                           </div>
                        </div>
                      ))}

                      {categories.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                           <p className="text-slate-400 font-bold uppercase tracking-widest">No fee categories established in registry</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="p-10 bg-slate-900 flex items-center justify-between text-white">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Individual Aggregate Liability</p>
                      <p className="text-3xl font-black text-indigo-400">
                        ₹{new Intl.NumberFormat('en-IN').format(aggregateTotal)}
                      </p>
                   </div>
                   <button 
                    onClick={handleSave}
                    className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 uppercase text-xs tracking-widest"
                   >
                     Apply Overrides
                   </button>
                </div>
             </div>
           ) : (
             <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl p-32 rounded-[3rem] text-center border-4 border-dashed border-white/50 dark:border-slate-800 flex flex-col items-center justify-center h-full no-print">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 text-slate-200 dark:text-slate-700 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                   <Search size={48} />
                </div>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-3 uppercase tracking-tight">Identity Required</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto text-lg leading-relaxed">Search and select a student from the terminal to manage their specific financial records.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default StudentwiseFee;