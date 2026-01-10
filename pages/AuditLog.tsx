
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { getAuditLogs, AuditEntry, AuditAction } from '../utils/auditLogger';
import { 
  History, 
  Search, 
  Filter, 
  Trash2, 
  Clock, 
  User as UserIcon, 
  Shield, 
  Zap,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
  Trash,
  Banknote,
  FileClock,
  TrendingUp,
  Receipt,
  Smartphone,
  Globe,
  Building2
} from 'lucide-react';

interface AuditLogProps {
  user: User;
  moduleFilter?: string;
}

const AuditLog: React.FC<AuditLogProps> = ({ user, moduleFilter }) => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<AuditAction | 'ALL'>('ALL');

  useEffect(() => {
    const fetchLogs = () => setLogs(getAuditLogs());
    fetchLogs();
    window.addEventListener('storage', fetchLogs);
    return () => window.removeEventListener('storage', fetchLogs);
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
    
    let onlineVolume = 0;
    let offlineVolume = 0;
    
    paymentLogs.forEach(l => {
      const amountMatch = l.details.match(/₹(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[1]) : 0;
      if (l.details.includes('[ONLINE]')) onlineVolume += amount;
      else offlineVolume += amount;
    });

    return {
      count: filteredLogs.length,
      online: onlineVolume,
      offline: offlineVolume,
      total: onlineVolume + offlineVolume
    };
  }, [filteredLogs, isFeesAudit]);

  const getPaymentMode = (details: string) => {
    if (details.includes('[ONLINE]')) return { label: 'Online', icon: <Globe size={12}/>, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
    if (details.includes('[CHEQUE]')) return { label: 'Cheque', icon: <Building2 size={12}/>, color: 'text-amber-600 bg-amber-50 border-amber-100' };
    return { label: 'Offline', icon: <Banknote size={12}/>, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  };

  const cleanDetails = (details: string) => {
    return details.replace(/\[(ONLINE|OFFLINE|CHEQUE)\]\s*/, '');
  };

  const clearLogs = () => {
    const msg = isFeesAudit 
      ? 'Institutional Safeguard: Purge the financial audit trail? This action is irreversible.'
      : 'Institutional Safeguard: Purge the entire audit history? This action is irreversible.';
    
    if (confirm(msg)) {
      if (isFeesAudit) {
        const remaining = logs.filter(l => l.module !== 'Finance');
        localStorage.setItem('school_audit_logs_v4', JSON.stringify(remaining));
        setLogs(remaining);
      } else {
        localStorage.setItem('school_audit_logs_v4', '[]');
        setLogs([]);
      }
    }
  };

  const getActionColor = (action: AuditAction) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800';
      case 'UPDATE': return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800';
      case 'DELETE': return 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800';
      case 'PAYMENT': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800';
      default: return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">
            {isFeesAudit ? 'Online Fees Audit' : 'System Audit Reports'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
            {isFeesAudit 
              ? 'Institutional tracking of Online, Cheque, and Offline Cash transactions.' 
              : 'Systematic tracking of administrative changes and system events.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={clearLogs}
            className="px-6 py-3 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Trash size={16} /> Purge {isFeesAudit ? 'Finance' : 'History'}
          </button>
        </div>
      </div>

      {isFeesAudit && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100 dark:shadow-none">
              <div className="flex items-center justify-between mb-4">
                 <Globe size={24} className="text-indigo-200" />
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Digital Assets</span>
              </div>
              <p className="text-4xl font-black tracking-tighter">₹{stats.online.toLocaleString('en-IN')}</p>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mt-2">Total Online Collection</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                 <Banknote size={24} className="text-emerald-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Physical Assets</span>
              </div>
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">₹{stats.offline.toLocaleString('en-IN')}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Total Offline (Cash/Cheque)</p>
           </div>
           <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                 <TrendingUp size={24} className="text-emerald-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aggregate</span>
              </div>
              <p className="text-4xl font-black text-white tracking-tighter">₹{stats.total.toLocaleString('en-IN')}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Verified Grand Total</p>
           </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-6">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search logs by staff name, GR, or amount..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-16 pr-8 py-4.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" 
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                <th className="px-10 py-6 text-left w-64">Timestamp</th>
                <th className="px-8 py-6 text-left w-56">Registrar</th>
                <th className="px-8 py-6 text-center w-40">Method</th>
                <th className="px-8 py-6 text-left">Transaction Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const mode = getPaymentMode(log.details);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                           <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                              <Clock size={16} />
                           </div>
                           <span className="text-xs font-black text-slate-700 dark:text-slate-300">{log.timestamp}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                              {log.user.charAt(0)}
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{log.user}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{log.role}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase border ${mode.color}`}>
                           {mode.icon}
                           {mode.label}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed uppercase tracking-tight group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                            {cleanDetails(log.details)}
                         </p>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-32 text-center">
                     <History size={64} className="mx-auto text-slate-100 dark:text-slate-800 mb-6" />
                     <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Vault Empty</h3>
                     <p className="text-slate-400 dark:text-slate-500 font-medium">No archived financial transactions match your query.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
