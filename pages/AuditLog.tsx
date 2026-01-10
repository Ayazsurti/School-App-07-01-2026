
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { getAuditLogs, AuditEntry, AuditAction } from '../utils/auditLogger';
import { 
  History, 
  Search, 
  Trash, 
  Clock, 
  User as UserIcon, 
  CheckCircle2, 
  Loader2,
  RefreshCw,
  Globe,
  Banknote,
  TrendingUp,
  Building2
} from 'lucide-react';
import { db, supabase } from '../supabase';

interface AuditLogProps {
  user: User;
  moduleFilter?: string;
}

const AuditLog: React.FC<AuditLogProps> = ({ user, moduleFilter }) => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<AuditAction | 'ALL'>('ALL');

  const fetchCloudLogs = async () => {
    const data = await getAuditLogs();
    setLogs(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCloudLogs();
    const channel = supabase.channel('realtime-audit')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        setIsSyncing(true);
        fetchCloudLogs().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const isFeesAudit = moduleFilter === 'Finance';

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = `${log.user} ${log.details} ${log.module}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction = filterAction === 'ALL' || log.action === filterAction;
      const matchesModule = !moduleFilter || log.module === moduleFilter;
      return matchesSearch && matchesAction && matchesModule;
    });
  }, [logs, searchQuery, filterAction, moduleFilter]);

  const stats = useMemo(() => {
    if (!isFeesAudit) return null;
    const paymentLogs = filteredLogs.filter(l => l.action === 'PAYMENT');
    let onlineVolume = 0; let offlineVolume = 0;
    paymentLogs.forEach(l => {
      const amountMatch = l.details.match(/₹(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[1]) : 0;
      if (l.details.includes('[ONLINE]')) onlineVolume += amount;
      else offlineVolume += amount;
    });
    return { count: filteredLogs.length, online: onlineVolume, offline: offlineVolume, total: onlineVolume + offlineVolume };
  }, [filteredLogs, isFeesAudit]);

  const clearLogs = async () => {
    if (confirm("Permanently erase cloud audit trail?")) {
      try {
        if (isFeesAudit) await db.audit.deleteByModule('Finance');
        else await db.audit.deleteAll();
        fetchCloudLogs();
      } catch (err) { alert("Failed to clear cloud logs."); }
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Syncing Cloud Audit...</span>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{isFeesAudit ? 'Fiscal Audit Trail' : 'System Compliance Logs'}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Real-time centralized institutional history.</p>
        </div>
        <button onClick={clearLogs} className="px-6 py-3 bg-white dark:bg-slate-900 border border-rose-200 text-rose-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-all flex items-center gap-2"><Trash size={16} /> Purge Cloud Trail</button>
      </div>

      {isFeesAudit && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4">
           <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl">
              <p className="text-4xl font-black">₹{stats.online.toLocaleString('en-IN')}</p>
              <p className="text-xs font-bold text-indigo-100 uppercase mt-2">Cloud Online Total</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <p className="text-4xl font-black text-slate-900 dark:text-white">₹{stats.offline.toLocaleString('en-IN')}</p>
              <p className="text-xs font-bold text-slate-400 uppercase mt-2">Physical Cash Total</p>
           </div>
           <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
              <p className="text-4xl font-black text-emerald-400">₹{stats.total.toLocaleString('en-IN')}</p>
              <p className="text-xs font-bold text-slate-400 uppercase mt-2">Institutional Aggregate</p>
           </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-6">
        <Search className="text-slate-300" size={24} />
        <input type="text" placeholder="Search global audit archive..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center animate-pulse">
            <Loader2 className="animate-spin text-indigo-600" size={64} />
            <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.3em]">Accessing Audit Cloud...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                  <th className="px-10 py-6 text-left">Timestamp</th>
                  <th className="px-8 py-6 text-left">Registrar</th>
                  <th className="px-8 py-6 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                    <td className="px-10 py-6 font-black text-slate-700 dark:text-slate-300 text-xs">{log.timestamp}</td>
                    <td className="px-8 py-6">
                       <p className="font-black text-slate-800 dark:text-white uppercase text-sm">{log.user}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">{log.role}</p>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase leading-relaxed">{log.details}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
