
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
  Trash
} from 'lucide-react';

interface AuditLogProps {
  user: User;
}

const AuditLog: React.FC<AuditLogProps> = ({ user }) => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<AuditAction | 'ALL'>('ALL');

  useEffect(() => {
    const fetchLogs = () => setLogs(getAuditLogs());
    fetchLogs();
    window.addEventListener('storage', fetchLogs);
    return () => window.removeEventListener('storage', fetchLogs);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = `${log.user} ${log.details} ${log.module}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction = filterAction === 'ALL' || log.action === filterAction;
      return matchesSearch && matchesAction;
    });
  }, [logs, searchQuery, filterAction]);

  const clearLogs = () => {
    if (confirm('Institutional Safeguard: Are you sure you want to purge the entire audit history? This action is irreversible.')) {
      localStorage.setItem('school_audit_logs', '[]');
      setLogs([]);
    }
  };

  const getActionColor = (action: AuditAction) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'UPDATE': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'DELETE': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'PAYMENT': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">Audit Reports</h1>
          <p className="text-slate-500 font-medium text-lg">Systematic tracking of administrative changes and system events.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={clearLogs}
            className="px-6 py-3 bg-white border border-rose-200 text-rose-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-all flex items-center gap-2"
          >
            <Trash size={16} /> Clear History
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search logs by staff name or action details..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-8 py-4.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
          />
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-3">Filter:</span>
           <select 
            value={filterAction}
            onChange={e => setFilterAction(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none"
           >
              <option value="ALL">All Actions</option>
              <option value="CREATE">Creation</option>
              <option value="UPDATE">Modifications</option>
              <option value="DELETE">Deletions</option>
              <option value="PAYMENT">Payments</option>
           </select>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="px-10 py-6 text-left w-64">Date & Time</th>
                <th className="px-8 py-6 text-left w-56">Operator</th>
                <th className="px-8 py-6 text-center w-40">Action</th>
                <th className="px-8 py-6 text-left w-48">Module</th>
                <th className="px-8 py-6 text-left">Transaction Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3">
                         <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <Clock size={16} />
                         </div>
                         <span className="text-xs font-black text-slate-700">{log.timestamp}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">
                            {log.user.charAt(0)}
                         </div>
                         <div>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{log.user}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{log.role}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Zap size={12} className="text-indigo-400" /> {log.module}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-tight group-hover:text-slate-900 transition-colors">
                          {log.details}
                       </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                     <History size={64} className="mx-auto text-slate-100 mb-6" />
                     <h3 className="text-xl font-black text-slate-800">No Registry Events</h3>
                     <p className="text-slate-400 font-medium">Clear of administrative logs matching your query.</p>
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
