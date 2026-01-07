
import React, { useState, useEffect } from 'react';
import { User, FeeCategory, FeeStructure } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, 
  Trash2, 
  WalletCards, 
  Settings2, 
  Save, 
  AlertCircle, 
  ChevronRight, 
  LayoutGrid, 
  CreditCard,
  History,
  X,
  CheckCircle2,
  DollarSign,
  Gem,
  Sparkles,
  Trophy,
  Gift,
  Star,
  Edit2,
  Info,
  CalendarDays
} from 'lucide-react';

interface FeeSetupProps {
  user: User;
}

const CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

// Academic Cycle: June 2026 to May 2027
const ACADEMIC_MONTHS = [
  "June 2026", "July 2026", "August 2026", "September 2026", "October 2026", "November 2026", 
  "December 2026", "January 2027", "February 2027", "March 2027", "April 2027", "May 2027"
];

const FeeSetup: React.FC<FeeSetupProps> = ({ user }) => {
  // Initialize with Quarters 1-4 and Tuition as standard categories
  const [categories, setCategories] = useState<FeeCategory[]>(() => {
    const saved = localStorage.getItem('school_fee_categories_v2');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'q1', name: 'Quarter 1 Fee', frequency: 'ANNUAL' },
      { id: 'q2', name: 'Quarter 2 Fee', frequency: 'ANNUAL' },
      { id: 'q3', name: 'Quarter 3 Fee', frequency: 'ANNUAL' },
      { id: 'q4', name: 'Quarter 4 Fee', frequency: 'ANNUAL' },
      { id: 'cat1', name: 'Tuition Fee', frequency: 'MONTHLY' }
    ];
  });

  const [structures, setStructures] = useState<FeeStructure[]>(() => {
    const saved = localStorage.getItem('school_fee_structures_v2');
    if (saved) return JSON.parse(saved);
    
    // Initialize standard structures for all classes with default values
    const initialCategories = [
      { id: 'q1', amount: 3000 },
      { id: 'q2', amount: 3000 },
      { id: 'q3', amount: 3000 },
      { id: 'q4', amount: 3000 },
      { id: 'cat1', amount: 1200 }
    ];

    return CLASSES.map(cls => ({
      className: cls,
      fees: initialCategories.map(c => ({ categoryId: c.id, amount: c.amount }))
    }));
  });

  const [showCatModal, setShowCatModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newCat, setNewCat] = useState({ 
    name: '', 
    frequency: 'ANNUAL' as FeeCategory['frequency'],
    selectedMonth: '' 
  });
  const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null);

  useEffect(() => {
    localStorage.setItem('school_fee_categories_v2', JSON.stringify(categories));
    localStorage.setItem('school_fee_structures_v2', JSON.stringify(structures));
  }, [categories, structures]);

  const handleAddOrUpdateCategory = () => {
    if (!newCat.name) return;

    // Construct final name if month is selected
    const finalName = newCat.frequency === 'MONTHLY' && newCat.selectedMonth 
      ? `${newCat.selectedMonth} - ${newCat.name}`
      : newCat.name;

    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: finalName, frequency: newCat.frequency } : c));
      createAuditLog(user, 'UPDATE', 'Finance', `Modified fee category: ${finalName}`);
    } else {
      const cat: FeeCategory = {
        id: Math.random().toString(36).substr(2, 9),
        name: finalName,
        frequency: newCat.frequency
      };
      setCategories(prev => [...prev, cat]);
      setStructures(prev => prev.map(s => ({
        ...s,
        fees: [...s.fees, { categoryId: cat.id, amount: 0 }]
      })));
      createAuditLog(user, 'CREATE', 'Finance', `Added new fee category: ${finalName}`);
    }

    setNewCat({ name: '', frequency: 'ANNUAL', selectedMonth: '' });
    setEditingCategory(null);
    setShowCatModal(false);
    triggerSuccess();
  };

  const deleteCategory = (id: string) => {
    const target = categories.find(c => c.id === id);
    if (confirm(`Institutional Alert: Are you sure you want to delete "${target?.name}"? This will remove this entry from all class structures.`)) {
      setCategories(prev => prev.filter(c => c.id !== id));
      setStructures(prev => prev.map(s => ({
        ...s,
        fees: s.fees.filter(f => f.categoryId !== id)
      })));
      createAuditLog(user, 'DELETE', 'Finance', `Purged fee category: ${target?.name}`);
      triggerSuccess();
    }
  };

  const updateFeeAmount = (className: string, categoryId: string, amount: number) => {
    setStructures(prev => prev.map(s => {
      if (s.className === className) {
        return {
          ...s,
          fees: s.fees.map(f => f.categoryId === categoryId ? { ...f, amount } : f)
        };
      }
      return s;
    }));
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      createAuditLog(user, 'UPDATE', 'Finance', 'Synchronized master fee structures for all classes');
      triggerSuccess();
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {/* SUCCESS NOTIFICATION */}
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-emerald-200/50 flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Transaction Verified</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Financial Data Synchronized Successfully</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">Fee Structure Setup</h1>
          <p className="text-slate-500 font-medium text-lg">Manage Quarters 1-4 and specific Monthly fees for Session 2026-27.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setEditingCategory(null); setNewCat({ name: '', frequency: 'ANNUAL', selectedMonth: '' }); setShowCatModal(true); }}
            className="px-6 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Settings2 size={20} /> Manage Types
          </button>
          <button 
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center gap-3 hover:-translate-y-1 transition-all disabled:opacity-50"
          >
            {isSaving ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} strokeWidth={3} />}
            Sync Structures
          </button>
        </div>
      </div>

      {showCatModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-1 shadow-2xl max-w-md w-full animate-in zoom-in-95 overflow-hidden">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-2xl font-black text-slate-900">{editingCategory ? 'Modify Category' : 'Add Fee Category'}</h3>
                <button onClick={() => setShowCatModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
             </div>
             
             <div className="p-10 space-y-6">
                <div className="space-y-4">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fee Frequency</label>
                     <select 
                      value={newCat.frequency}
                      onChange={e => setNewCat({...newCat, frequency: e.target.value as any})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                     >
                       <option value="ANNUAL">Annual / One-time / Quarterly</option>
                       <option value="MONTHLY">Monthly Basis</option>
                       <option value="ONE_TIME">Instant Process</option>
                     </select>
                   </div>

                   {newCat.frequency === 'MONTHLY' && (
                     <div className="animate-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Select Target Month</label>
                        <div className="relative">
                           <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                           <select 
                            value={newCat.selectedMonth}
                            onChange={e => setNewCat({...newCat, selectedMonth: e.target.value})}
                            className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl pl-12 pr-4 py-4 font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                           >
                              <option value="">-- Choose Month --</option>
                              {ACADEMIC_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                        </div>
                     </div>
                   )}

                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fee Category Name</label>
                     <input 
                      type="text" 
                      value={newCat.name}
                      onChange={e => setNewCat({...newCat, name: e.target.value})}
                      placeholder={newCat.frequency === 'MONTHLY' ? "e.g., Tuition Fee" : "e.g., Quarter 1 Fee"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                     />
                   </div>

                   <button 
                    onClick={handleAddOrUpdateCategory}
                    disabled={!newCat.name || (newCat.frequency === 'MONTHLY' && !newCat.selectedMonth)}
                    className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 uppercase text-xs tracking-widest disabled:opacity-50 transition-all"
                   >
                    {editingCategory ? 'Update Heading' : 'Establish New Heading'}
                   </button>
                </div>
                
                <div className="max-h-52 overflow-y-auto space-y-2 pr-2 custom-scrollbar border-t border-slate-100 pt-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Existing Fee Headings</p>
                   {categories.map(cat => (
                     <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="text-sm font-black text-slate-700 uppercase tracking-tight truncate">{cat.name}</p>
                          <p className="text-[9px] font-bold text-indigo-500 tracking-widest uppercase">{cat.frequency}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button 
                            onClick={() => { 
                              setEditingCategory(cat); 
                              setNewCat({ name: cat.name, frequency: cat.frequency, selectedMonth: '' }); 
                            }}
                            className="p-2 text-slate-300 hover:text-indigo-600 transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => deleteCategory(cat.id)}
                            className="p-2 text-slate-300 hover:text-rose-600 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {structures.map((s) => (
          <div key={s.className} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-indigo-100/30 transition-all group flex flex-col">
            <div className="p-8 pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <LayoutGrid size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight">Std {s.className}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Master Structure</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate</p>
                  <p className="text-xl font-black text-indigo-600">₹{s.fees.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {s.fees.map((fee) => {
                  const cat = categories.find(c => c.id === fee.categoryId);
                  if (!cat) return null;
                  return (
                    <div key={fee.categoryId} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white transition-all">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 truncate" title={cat.name}>{cat.name}</p>
                       <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">₹</div>
                          <input 
                            type="number"
                            value={fee.amount}
                            onChange={(e) => updateFeeAmount(s.className, fee.categoryId, parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-sm"
                          />
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-8 pt-4 mt-auto">
               <div className="flex items-center gap-2 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <Info size={16} className="text-indigo-400" />
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Structure updated for active session 2026-27</p>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeeSetup;
