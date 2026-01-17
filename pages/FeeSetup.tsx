import React, { useState, useEffect, useMemo } from 'react';
import { User, FeeCategory, FeeStructure } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Trash2, Settings2, Save, X, CheckCircle2, LayoutGrid, Info, Loader2,
  Layers, Copy, Zap, Calculator, ShieldCheck, AlertCircle, CloudSync, ArrowUpCircle
} from 'lucide-react';
import { db, supabase } from '../supabase';

interface FeeSetupProps { user: User; }
const CLASSES = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

const FeeSetup: React.FC<FeeSetupProps> = ({ user }) => {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  // Use string values for local drafts to prevent parseInt issues while typing
  const [draftFees, setDraftFees] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [savingClass, setSavingClass] = useState<string | null>(null);

  const fetchCloudData = async () => {
    try {
      const structs = await db.fees.getStructures();
      setStructures(structs);
      
      const initialDraft: Record<string, Record<string, string>> = {};
      CLASSES.forEach(cls => {
        initialDraft[cls] = {};
        const struct = structs.find(s => s.class_name === cls);
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
    const channel = supabase.channel('fee-setup-realtime-v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_structures' }, () => {
        if (!savingClass) fetchCloudData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [savingClass]);

  const handleLocalChange = (className: string, quarter: string, value: string) => {
    // Allow only numbers
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
      alert("Cloud connection lost. Check internet."); 
    } finally { 
      setIsSyncing(false);
      setSavingClass(null);
    }
  };

  const handleSaveAll = async () => {
    if (!confirm("Update entire institutional fee matrix to cloud?")) return;
    setIsSyncing(true);
    setSavingClass('ALL');
    try {
      for (const cls of CLASSES) {
        const classDraft = draftFees[cls] || {};
        const updatedFees = QUARTERS.map(q => ({
          categoryId: `QUARTERLY_${q}`,
          amount: parseInt(classDraft[q] || '0') || 0,
          quarter: q
        }));
        await db.fees.upsertStructure({ className: cls, fees: updatedFees });
      }
      createAuditLog(user, 'UPDATE', 'Finance', `Global Fee Matrix Re-synchronized`);
      setSuccessMsg(`Global Registry Updated`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchCloudData();
    } catch (err) {
      alert("Global sync failed.");
    } finally {
      setIsSyncing(false);
      setSavingClass(null);
    }
  };

  const bulkApplyToAll = async (sourceClassName: string) => {
    const sourceDraft = draftFees[sourceClassName];
    if (!sourceDraft || !confirm(`Copy these fees to ALL other standards?`)) return;
    
    setIsSyncing(true);
    setSavingClass('BULK');
    try {
      const updatedFees = QUARTERS.map(q => ({
        categoryId: `QUARTERLY_${q}`,
        amount: parseInt(sourceDraft[q] || '0') || 0,
        quarter: q
      }));

      for (const cls of CLASSES) {
        await db.fees.upsertStructure({ className: cls, fees: updatedFees });
      }

      const newDraft = { ...draftFees };
      CLASSES.forEach(cls => {
        newDraft[cls] = { ...sourceDraft };
      });
      setDraftFees(newDraft);

      createAuditLog(user, 'UPDATE', 'Finance', `Bulk cloned fees from ${sourceClassName} to all`);
      setSuccessMsg(`Bulk Clone Successful`);
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
              <span className="text-[10px] font-black uppercase tracking-widest">Pushing Data to Cloud...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Supabase Sync OK</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">{successMsg}</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Fee Configuration</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Define the financial schedule for all academic quarters.</p>
        </div>
        <button 
          onClick={handleSaveAll}
          disabled={isSyncing}
          className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center gap-3 active:scale-95 disabled:opacity-50"
        >
          {isSyncing && savingClass === 'ALL' ? <Loader2 size={18} className="animate-spin" /> : <CloudSync size={18} />} 
          Save All Standards
        </button>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
           <Loader2 className="animate-spin text-indigo-600" size={64} />
           <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.3em]">Accessing Financial Node...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {CLASSES.map((cls) => {
            const classDraft = draftFees[cls] || {};
            const totalAnnual = QUARTERS.reduce((acc, q) => acc + (parseInt(classDraft[q] || '0') || 0), 0);
            
            const originalStruct = structures.find(s => s.class_name === cls);
            const isModified = QUARTERS.some(q => {
               const original = originalStruct?.fees?.find((f: any) => f.quarter === q)?.amount || 0;
               return (parseInt(classDraft[q] || '0') || 0) !== original;
            });

            return (
              <div key={cls} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all">
                <div className="p-8 pb-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Calculator size={24} /></div>
                      <div>
                         <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Std {cls}</h3>
                         <div className="flex items-center gap-2">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cloud Database Active</p>
                           {isModified && <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Unsaved Changes</span>}
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => bulkApplyToAll(cls)}
                        className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                        title="Copy to all classes"
                      >
                        <Copy size={14} /> Bulk
                      </button>
                      <button 
                        onClick={() => handleSaveClass(cls)}
                        disabled={savingClass === cls || !isModified}
                        className={`p-3 rounded-xl transition-all shadow-sm flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${isModified ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 pointer-events-none'}`}
                      >
                        {savingClass === cls ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                        Save
                      </button>
                   </div>
                </div>

                <div className="p-8 space-y-10">
                   <div className="grid grid-cols-2 gap-4">
                      {QUARTERS.map(q => (
                        <div key={q} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 group/input hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-lg">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover/input:text-indigo-500 transition-colors">Quarter {q.substring(1)}</p>
                           <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-lg">₹</span>
                              <input 
                                type="text" 
                                value={classDraft[q] || ''} 
                                onChange={e => handleLocalChange(cls, q, e.target.value)} 
                                placeholder="0"
                                className="w-full bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-100 dark:focus:border-indigo-900 rounded-xl pl-10 pr-4 py-3 font-black text-slate-800 dark:text-white outline-none shadow-sm text-lg"
                              />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="mt-auto p-8 bg-slate-900 flex items-center justify-between text-white border-t border-white/5">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Academic Year Liability</p>
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
            <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-widest mb-1">Policy Enforcement</h4>
            <p className="text-xs font-medium text-indigo-700/70 dark:text-indigo-400/60 uppercase leading-relaxed tracking-wider">
               Fees entered here update the institutional master registry in Supabase. Student dashboards will refresh automatically to reflect these new financial liabilities.
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

const RefreshCw = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
);

export default FeeSetup;