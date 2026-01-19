
import React, { useState, useEffect, useMemo } from 'react';
import { User, FeeCategory, FeeStructure } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Trash2, Settings2, Save, X, CheckCircle2, LayoutGrid, Info, Loader2,
  Layers, Copy, Zap, Calculator, ShieldCheck, AlertCircle, ArrowUpCircle,
  RefreshCw, ChevronDown
} from 'lucide-react';
import { db, supabase } from '../supabase';

interface FeeSetupProps { user: User; }

type CategoryKey = 
  | 'PRIMARY_GIRLS' | 'SECONDARY_GIRLS' | 'HIGHER_SECONDARY_GIRLS'
  | 'PRIMARY_BOYS' | 'SECONDARY_BOYS' | 'HIGHER_SECONDARY_BOYS'
  | 'GUJ_PRIMARY_GIRLS' | 'GUJ_SECONDARY_GIRLS' | 'GUJ_HIGHER_SECONDARY_GIRLS'
  | 'GUJ_PRIMARY_BOYS' | 'GUJ_SECONDARY_BOYS' | 'GUJ_HIGHER_SECONDARY_BOYS';

const GRADE_RANGES = {
  PRIMARY: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'],
  SECONDARY: ['9th', '10th'],
  HIGHER: ['11th', '12th']
};

const CATEGORY_MAP: Record<CategoryKey, { label: string, grades: string[], color: string }> = {
  PRIMARY_GIRLS: { label: 'Primary Girls (1-8)', grades: GRADE_RANGES.PRIMARY, color: 'text-pink-500' },
  SECONDARY_GIRLS: { label: 'Secondary Girls (9-10)', grades: GRADE_RANGES.SECONDARY, color: 'text-pink-600' },
  HIGHER_SECONDARY_GIRLS: { label: 'Higher Sec Girls (11-12)', grades: GRADE_RANGES.HIGHER, color: 'text-pink-700' },
  PRIMARY_BOYS: { label: 'Primary Boys (1-8)', grades: GRADE_RANGES.PRIMARY, color: 'text-blue-500' },
  SECONDARY_BOYS: { label: 'Secondary Boys (9-10)', grades: GRADE_RANGES.SECONDARY, color: 'text-blue-600' },
  HIGHER_SECONDARY_BOYS: { label: 'Higher Sec Boys (11-12)', grades: GRADE_RANGES.HIGHER, color: 'text-blue-700' },
  GUJ_PRIMARY_GIRLS: { label: 'GUJ Primary Girls (1-8)', grades: GRADE_RANGES.PRIMARY, color: 'text-orange-500' },
  GUJ_SECONDARY_GIRLS: { label: 'GUJ Secondary Girls (9-10)', grades: GRADE_RANGES.SECONDARY, color: 'text-orange-600' },
  GUJ_HIGHER_SECONDARY_GIRLS: { label: 'GUJ Higher Sec Girls (11-12)', grades: GRADE_RANGES.HIGHER, color: 'text-orange-700' },
  GUJ_PRIMARY_BOYS: { label: 'GUJ Primary Boys (1-8)', grades: GRADE_RANGES.PRIMARY, color: 'text-emerald-500' },
  GUJ_SECONDARY_BOYS: { label: 'GUJ Secondary Boys (9-10)', grades: GRADE_RANGES.SECONDARY, color: 'text-emerald-600' },
  GUJ_HIGHER_SECONDARY_BOYS: { label: 'GUJ Higher Sec Boys (11-12)', grades: GRADE_RANGES.HIGHER, color: 'text-emerald-700' }
};

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

// Labels with months as requested
const QUARTER_DISPLAY: Record<string, string> = {
  Q1: 'Quarter 1 (June-August)',
  Q2: 'Quarter 2 (Sept-Nov)',
  Q3: 'Quarter 3 (Dec-Feb)',
  Q4: 'Quarter 4 (March-May)'
};

const FeeSetup: React.FC<FeeSetupProps> = ({ user }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('PRIMARY_GIRLS');
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [draftFees, setDraftFees] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [savingClass, setSavingClass] = useState<string | null>(null);

  const currentGrades = useMemo(() => CATEGORY_MAP[selectedCategory].grades, [selectedCategory]);

  const fetchCloudData = async () => {
    setIsLoading(true);
    try {
      const structs = await db.fees.getStructures();
      setStructures(structs);
      
      const initialDraft: Record<string, Record<string, string>> = {};
      const allPossibleGrades = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
      allPossibleGrades.forEach(cls => {
        initialDraft[cls] = {};
        // Fixed: Access correctly mapped className property
        const struct = structs.find(s => s.className === cls);
        if (struct && Array.isArray(struct.fees)) {
          struct.fees.forEach((f: any) => {
            if (f.quarter) initialDraft[cls][f.quarter] = f.amount.toString();
          });
        }
      });
      setDraftFees(initialDraft);
    } catch (err) { 
      console.error("Fee Sync Error:", err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('fee-setup-realtime-v7')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_structures' }, () => {
        if (!savingClass) fetchCloudData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [savingClass]);

  const handleLocalChange = (className: string, quarter: string, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    setDraftFees(prev => ({
      ...prev,
      [className]: {
        ...(prev[className] || {}),
        [quarter]: cleanValue
      }
    }));
  };

  const handleSaveClass = async (className: string) => {
    setSavingClass(className);
    setIsSyncing(true);
    try {
      const classDraft = draftFees[className] || {};
      const updatedFees = QUARTERS.map(q => ({
        categoryId: `QUARTERLY_${q}`,
        amount: parseInt(classDraft[q] || '0') || 0,
        quarter: q
      }));

      await db.fees.upsertStructure({ className, fees: updatedFees });
      
      createAuditLog(user, 'UPDATE', 'Finance', `Synced cloud fees for Std ${className}`);
      setSuccessMsg(`Std ${className} Data Synced`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      const structs = await db.fees.getStructures();
      setStructures(structs);
    } catch (err) { 
      alert("Cloud connection lost."); 
    } finally { 
      setIsSyncing(false);
      setSavingClass(null);
    }
  };

  const handleSaveCategory = async () => {
    if (!confirm(`Update all fees for ${CATEGORY_MAP[selectedCategory].label} to cloud?`)) return;
    setIsSyncing(true);
    setSavingClass('CATEGORY');
    try {
      for (const cls of currentGrades) {
        const classDraft = draftFees[cls] || {};
        const updatedFees = QUARTERS.map(q => ({
          categoryId: `QUARTERLY_${q}`,
          amount: parseInt(classDraft[q] || '0') || 0,
          quarter: q
        }));
        await db.fees.upsertStructure({ className: cls, fees: updatedFees });
      }
      createAuditLog(user, 'UPDATE', 'Finance', `Synced fees for category: ${selectedCategory}`);
      setSuccessMsg(`${CATEGORY_MAP[selectedCategory].label} Updated`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchCloudData();
    } catch (err) {
      alert("Category sync failed.");
    } finally {
      setIsSyncing(false);
      setSavingClass(null);
    }
  };

  const bulkApplyToCategory = async (sourceClassName: string) => {
    const sourceDraft = draftFees[sourceClassName];
    if (!sourceDraft || !confirm(`Copy these fees to ALL other classes in ${CATEGORY_MAP[selectedCategory].label}?`)) return;
    
    setIsSyncing(true);
    setSavingClass('BULK');
    try {
      const updatedFees = QUARTERS.map(q => ({
        categoryId: `QUARTERLY_${q}`,
        amount: parseInt(sourceDraft[q] || '0') || 0,
        quarter: q
      }));

      for (const cls of currentGrades) {
        await db.fees.upsertStructure({ className: cls, fees: updatedFees });
      }

      const newDraft = { ...draftFees };
      currentGrades.forEach(cls => {
        newDraft[cls] = { ...sourceDraft };
      });
      setDraftFees(newDraft);

      createAuditLog(user, 'UPDATE', 'Finance', `Bulk cloned fees within ${selectedCategory}`);
      setSuccessMsg(`Bulk Sync Complete`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { 
      alert("Bulk operation failed."); 
    } finally { 
      setIsSyncing(false); 
      setSavingClass(null);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cloud Push Active...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Sync Successful</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">{successMsg}</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Fee Setup Terminal</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional Financial Calibration</p>
        </div>
        <button 
          onClick={handleSaveCategory}
          disabled={isSyncing}
          className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center gap-3 active:scale-95 disabled:opacity-50"
        >
          {isSyncing && savingClass === 'CATEGORY' ? <Loader2 size={18} className="animate-spin" /> : <CloudSync size={18} />} 
          Sync Category Group
        </button>
      </div>

      {/* Category Selector */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8">
         <div className="flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-[0.2em] mb-2 block">Institution Medium & Wing</label>
            <div className="relative group">
               <select 
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value as CategoryKey)} 
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-5 font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm appearance-none cursor-pointer uppercase text-sm tracking-widest"
               >
                 <optgroup label="ENGLISH MEDIUM">
                   <option value="PRIMARY_GIRLS">Primary Girls (1-8)</option>
                   <option value="PRIMARY_BOYS">Primary Boys (1-8)</option>
                   <option value="SECONDARY_GIRLS">Secondary Girls (9-10)</option>
                   <option value="SECONDARY_BOYS">Secondary Boys (9-10)</option>
                   <option value="HIGHER_SECONDARY_GIRLS">Higher Secondary Girls (11-12)</option>
                   <option value="HIGHER_SECONDARY_BOYS">Higher Secondary Boys (11-12)</option>
                 </optgroup>
                 <optgroup label="GUJARATI MEDIUM">
                   <option value="GUJ_PRIMARY_GIRLS">GUJ MED Primary Girls (1-8)</option>
                   <option value="GUJ_PRIMARY_BOYS">GUJ MED Primary Boys (1-8)</option>
                   <option value="GUJ_SECONDARY_GIRLS">GUJ MED Secondary Girls (9-10)</option>
                   <option value="GUJ_SECONDARY_BOYS">GUJ MED Secondary Boys (9-10)</option>
                   <option value="GUJ_HIGHER_SECONDARY_GIRLS">GUJ MED Higher Secondary Girls (11-12)</option>
                   <option value="GUJ_HIGHER_SECONDARY_BOYS">GUJ MED Higher Secondary Boys (11-12)</option>
                 </optgroup>
               </select>
               <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={24} />
            </div>
         </div>
         <div className="flex items-center gap-4 bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-800">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><Layers size={24} /></div>
            <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Scope</p>
               <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight">{CATEGORY_MAP[selectedCategory].label}</h4>
            </div>
         </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
           <Loader2 className="animate-spin text-indigo-600" size={64} />
           <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.3em]">Accessing Financial Node...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {currentGrades.map((cls) => {
            const classDraft = draftFees[cls] || {};
            const totalAnnual = QUARTERS.reduce((acc, q) => acc + (parseInt(classDraft[q] || '0') || 0), 0);
            
            // Fixed: Access correctly mapped className property
            const originalStruct = structures.find(s => s.className === cls);
            const isModified = QUARTERS.some(q => {
               const original = originalStruct?.fees?.find((f: any) => f.quarter === q)?.amount || 0;
               return (parseInt(classDraft[q] || '0') || 0) !== original;
            });

            return (
              <div key={cls} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all animate-in slide-in-from-bottom-2">
                <div className="p-8 pb-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Calculator size={24} /></div>
                      <div>
                         <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Standard {cls}</h3>
                         <div className="flex items-center gap-2">
                           <p className={`text-[9px] font-bold uppercase tracking-widest ${CATEGORY_MAP[selectedCategory].color}`}>{CATEGORY_MAP[selectedCategory].label}</p>
                           {isModified && <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Unsaved</span>}
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => bulkApplyToCategory(cls)}
                        className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                        title="Copy to all in category"
                      >
                        <Copy size={14} /> Bulk
                      </button>
                      <button 
                        onClick={() => handleSaveClass(cls)}
                        disabled={savingClass === cls || !isModified}
                        className={`p-3 rounded-xl transition-all shadow-sm flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${isModified ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 pointer-events-none'}`}
                      >
                        {savingClass === cls ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                        Save
                      </button>
                   </div>
                </div>

                <div className="p-8 space-y-8 flex-1">
                   <div className="grid grid-cols-2 gap-6">
                      {QUARTERS.map(q => (
                        <div key={q} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 group/input hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-lg">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 group-hover/input:text-indigo-500 transition-colors">{QUARTER_DISPLAY[q]}</p>
                           <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl italic">₹</span>
                              <input 
                                type="text" 
                                value={classDraft[q] || ''} 
                                onChange={e => handleLocalChange(cls, q, e.target.value)} 
                                placeholder="0"
                                className="w-full bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-100 dark:focus:border-indigo-900 rounded-xl pl-10 pr-4 py-4 font-black text-slate-800 dark:text-white outline-none shadow-sm text-2xl"
                              />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="mt-auto p-8 bg-slate-900 flex items-center justify-between text-white border-t border-white/5">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Institutional Annual Liability</p>
                      <p className="text-3xl font-black text-indigo-400 tracking-tighter">₹{totalAnnual.toLocaleString('en-IN')}</p>
                   </div>
                   <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500">
                      <ShieldCheck size={28} />
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-10 bg-indigo-50 dark:bg-indigo-900/10 rounded-[3rem] border border-indigo-100 dark:border-indigo-800 flex items-start gap-4">
         <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Info size={24} />
         </div>
         <div className="flex-1">
            <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-widest mb-1">Governance Policy</h4>
            <p className="text-[10px] font-medium text-indigo-700/70 dark:text-indigo-400/60 uppercase leading-relaxed tracking-[0.1em]">
               Fees configured here are mapped to students based on their primary grade and wing assignment. Changes update the institution's cloud ledger in real-time, affecting student portal balances immediately.
            </p>
         </div>
      </div>
    </div>
  );
};

// Custom Icon for Global Sync
const CloudSync = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
  </svg>
);

export default FeeSetup;
