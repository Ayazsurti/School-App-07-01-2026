
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Receipt, 
  Settings, 
  Save, 
  CheckCircle2, 
  Hash, 
  Type, 
  Calendar,
  AlertCircle,
  Info
} from 'lucide-react';

interface ReceiptSetupProps {
  user: User;
}

const ReceiptSetup: React.FC<ReceiptSetupProps> = ({ user }) => {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('school_receipt_config');
    if (saved) return JSON.parse(saved);
    return {
      prefix: 'DIS-',
      suffix: '-2026',
      currentCounter: 1001,
      format: '{PREFIX}{COUNTER}{SUFFIX}'
    };
  });

  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    localStorage.setItem('school_receipt_config', JSON.stringify(config));
  }, [config]);

  const handleSave = () => {
    localStorage.setItem('school_receipt_config', JSON.stringify(config));
    createAuditLog(user, 'UPDATE', 'Finance', `Modified receipt pattern: ${config.prefix}[n]${config.suffix}`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const preview = config.format
    .replace('{PREFIX}', config.prefix)
    .replace('{COUNTER}', config.currentCounter.toString().padStart(4, '0'))
    .replace('{SUFFIX}', config.suffix);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-emerald-200/50 flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Config Saved</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Receipt registry updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">Receipt Configuration</h1>
          <p className="text-slate-500 font-medium text-lg">Define patterns and sequential logic for financial documents.</p>
        </div>
        <button 
          onClick={handleSave}
          className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-3"
        >
          <Save size={20} strokeWidth={3} /> Synchronize Config
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-8">
           <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Settings className="text-indigo-600" /> Sequence Logic
           </h3>

           <div className="space-y-6">
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Receipt Prefix</label>
                 <div className="relative">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      value={config.prefix}
                      onChange={e => setConfig({...config, prefix: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
              </div>

              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Current Counter (Next Number)</label>
                 <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="number" 
                      value={config.currentCounter}
                      onChange={e => setConfig({...config, currentCounter: parseInt(e.target.value) || 1})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
              </div>

              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fiscal Year Suffix</label>
                 <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      value={config.suffix}
                      onChange={e => setConfig({...config, suffix: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Live Token Preview</p>
              <h4 className="text-4xl font-black text-white tracking-tighter mb-4">{preview}</h4>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">This is how your next issued receipt number will appear on the official certificate.</p>
              
              <div className="mt-10 p-6 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-4">
                 <Info className="text-indigo-400 flex-shrink-0" size={20} />
                 <p className="text-xs font-medium text-slate-500 leading-relaxed">Ensure the counter reflects the current institutional ledger to prevent duplicate ID issuance.</p>
              </div>
           </div>

           <div className="bg-amber-50 rounded-[3rem] p-10 border border-amber-100 shadow-sm">
              <h4 className="font-black text-amber-900 flex items-center gap-3 mb-6">
                 <AlertCircle size={20} /> Critical Note
              </h4>
              <p className="text-sm font-medium text-amber-800 leading-relaxed">
                 Changing the prefix mid-session may fragment your financial archives. It is recommended to only update these settings at the start of a new academic cycle.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptSetup;
