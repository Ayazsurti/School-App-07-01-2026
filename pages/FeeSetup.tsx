
import React, { useState, useEffect } from 'react';
import { User, FeeCategory, FeeStructure } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Trash2, Settings2, Save, X, CheckCircle2, LayoutGrid, Info, Loader2, RefreshCw
} from 'lucide-react';
import { db, supabase } from '../supabase';

interface FeeSetupProps { user: User; }
const CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const FeeSetup: React.FC<FeeSetupProps> = ({ user }) => {
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', frequency: 'ANNUAL' as any });

  const fetchCloudData = async () => {
    try {
      const cats = await db.fees.getCategories();
      const structs = await db.fees.getStructures();
      setCategories(cats);
      setStructures(structs);
    } catch (err) { console.error("Fee Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-fee-setup')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_categories' }, () => fetchCloudData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_structures' }, () => fetchCloudData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAddCategory = async () => {
    if (!newCat.name) return;
    try {
      await db.fees.upsertCategory(newCat);
      setNewCat({ name: '', frequency: 'ANNUAL' });
      setShowCatModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Failed to add cloud category."); }
  };

  const updateFeeAmount = async (className: string, categoryId: string, amount: number) => {
    const classStruct = structures.find(s => s.className === className) || { className, fees: [] };
    const updatedFees = [...classStruct.fees];
    const feeIdx = updatedFees.findIndex(f => f.categoryId === categoryId);
    if (feeIdx > -1) updatedFees[feeIdx].amount = amount;
    else updatedFees.push({ categoryId, amount });
    
    try {
      await db.fees.upsertStructure({ className, fees: updatedFees });
    } catch (err) { console.error("Auto-sync failed."); }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Syncing Cloud Finance...</span>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Master Fee Engine</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Define real-time financial policies for the institution.</p>
        </div>
        <button onClick={() => setShowCatModal(true)} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><Settings2 size={20} /> Manage Cloud Headings</button>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse">
           <Loader2 className="animate-spin text-indigo-600" size={64} />
           <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.3em]">Accessing Financial Cloud...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {CLASSES.map((cls) => (
            <div key={cls} className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col group hover:shadow-2xl transition-all">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-4"><LayoutGrid className="text-indigo-600" /> Std {cls}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map(cat => {
                  const val = structures.find(s => s.className === cls)?.fees.find(f => f.categoryId === cat.id)?.amount || 0;
                  return (
                    <div key={cat.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 truncate">{cat.name}</p>
                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-black">₹</span>
                          <input type="number" value={val} onChange={e => updateFeeAmount(cls, cat.id, parseInt(e.target.value) || 0)} className="w-full bg-white dark:bg-slate-900 border rounded-xl pl-8 pr-4 py-2 font-black text-slate-700 dark:text-white" />
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCatModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-black uppercase mb-8">Cloud Fee Heading</h3>
              <input type="text" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} placeholder="Category Name" className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold mb-6" />
              <select value={newCat.frequency} onChange={e => setNewCat({...newCat, frequency: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold mb-6">
                 <option value="ANNUAL">ANNUAL</option>
                 <option value="MONTHLY">MONTHLY</option>
              </select>
              <div className="flex gap-4">
                 <button onClick={() => setShowCatModal(false)} className="flex-1 py-4 bg-slate-100 font-black rounded-2xl text-[10px] uppercase">Cancel</button>
                 <button onClick={handleAddCategory} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg uppercase text-[10px]">Initialize Cloud Sync</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FeeSetup;
