
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { Receipt, Settings, Save, CheckCircle2, Hash, Type, Calendar, AlertCircle, Info, RefreshCw, Loader2 } from 'lucide-react';
import { db, supabase } from '../supabase';

interface ReceiptSetupProps { user: User; }

const ReceiptSetup: React.FC<ReceiptSetupProps> = ({ user }) => {
  const [config, setConfig] = useState({ prefix: 'DIS-', suffix: '-2026', currentCounter: 1001, format: '{PREFIX}{COUNTER}{SUFFIX}' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchCloudConfig = async () => {
    try {
      const settings = await db.settings.getAll();
      if (settings.fiscal_receipt_config) {
        setConfig(JSON.parse(settings.fiscal_receipt_config));
      }
    } catch (e) { console.error("Config fetch failed"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudConfig();
    const channel = supabase.channel('receipt-config-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        setIsSyncing(true); fetchCloudConfig().then(() => setTimeout(() => setIsSyncing(false), 800));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSave = async () => {
    setIsSyncing(true);
    try {
      await db.settings.update('fiscal_receipt_config', JSON.stringify(config));
      createAuditLog(user, 'UPDATE', 'Finance', `Modified receipt pattern: ${config.prefix}[n]${config.suffix}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) { alert("Sync failed."); }
    finally { setIsSyncing(false); }
  };

  const preview = config.format
    .replace('{PREFIX}', config.prefix)
    .replace('{COUNTER}', config.currentCounter.toString().padStart(4, '0'))
    .replace('{SUFFIX}', config.suffix);

  if (isLoading) return <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              <div><p className="font-black text-xs uppercase tracking-[0.2em]">Config Secured</p></div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">Receipt Configuration</h1>
          <p className="text-slate-500 font-medium text-lg uppercase tracking-tight">Financial pattern management.</p>
        </div>
        <button onClick={handleSave} disabled={isSyncing} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 uppercase text-xs active:scale-95 disabled:opacity-50">
          {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Sync Cloud Setup
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
           <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3 uppercase"><Settings className="text-indigo-600" /> Sequence Logic</h3>
           <div className="space-y-6">
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Receipt Prefix</label>
                 <input type="text" value={config.prefix} onChange={e => setConfig({...config, prefix: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-black text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Current Counter</label>
                 <input type="number" value={config.currentCounter} onChange={e => setConfig({...config, currentCounter: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-black text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Suffix Token</label>
                 <input type="text" value={config.suffix} onChange={e => setConfig({...config, suffix: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-black text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group border border-white/5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Master Preview</p>
              <h4 className="text-4xl font-black text-white tracking-tighter mb-4">{preview}</h4>
              <p className="text-slate-400 text-sm font-medium leading-relaxed uppercase tracking-widest">Global Sequential Identity Token</p>
           </div>
           <div className="bg-amber-50 dark:bg-amber-950/20 rounded-[3rem] p-10 border border-amber-100 dark:border-amber-900/30 shadow-sm flex items-start gap-4">
              <AlertCircle className="text-amber-500 shrink-0" size={20} />
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400 leading-relaxed uppercase">Changing the prefix mid-session may fragment your financial archives. Use with institutional approval.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptSetup;
