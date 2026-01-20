
import React, { useState, useEffect, useMemo } from 'react';
import { User, Student } from '../types';
import { db, supabase, getErrorMessage } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  UserMinus, Search, Trash2, RotateCcw, X, AlertTriangle, 
  Calendar, Info, Loader2, RefreshCw, CheckCircle2, ShieldCheck,
  User as UserIcon, ArrowRight, ShieldAlert, FileText, UserCheck, Layers,
  Clock, Shield, Terminal, Bug, Wifi, WifiOff
} from 'lucide-react';

interface AdmissionCancellationProps { user: User; }

const ALL_CLASSES = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const AdmissionCancellation: React.FC<AdmissionCancellationProps> = ({ user }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'CANCELLED'>('ACTIVE');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showRevertConfirm, setShowRevertConfirm] = useState<any | null>(null);
  const [showErrorModal, setShowErrorModal] = useState<{message: string, code?: string, raw?: any} | null>(null);
  const [targetStudent, setTargetStudent] = useState<any>(null);
  
  // Form states
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchRegistry = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error("Registry Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
    const channel = supabase.channel('cancellation-sync-v12')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchRegistry().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const isCancelled = s.status === 'CANCELLED';
      const matchesSearch = (s.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (s.gr_number || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = selectedClass === 'All' || s.class === selectedClass;
      const matchesView = viewMode === 'CANCELLED' ? isCancelled : !isCancelled;
      return matchesSearch && matchesClass && matchesView;
    });
  }, [students, searchQuery, selectedClass, viewMode]);

  const handleProcessCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent || !cancelReason.trim()) return;
    
    setIsProcessing(true);
    try {
      const reason = cancelReason.trim().toUpperCase();
      await db.students.cancelAdmission(targetStudent.id, reason, cancelDate, user.name);

      await createAuditLog(user, 'UPDATE', 'Registry', `Admission Cancelled: ${targetStudent.full_name} (GR: ${targetStudent.gr_number})`);
      
      // Update local state immediately for performance
      setStudents(prev => prev.map(s => {
        if (s.id === targetStudent.id) {
           return { ...s, status: 'CANCELLED', cancel_reason: reason, cancel_date: cancelDate, cancelled_by: user.name };
        }
        return s;
      }));

      setShowCancelModal(false);
      setCancelReason('');
      setTargetStudent(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      await fetchRegistry();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setShowErrorModal({ message: msg, code: err?.code, raw: err });
    } finally {
      setIsProcessing(false);
    }
  };

  const executeRevertAdmission = async () => {
    if (!showRevertConfirm || !isOnline) return;
    
    const student = showRevertConfirm;
    setIsSyncing(true);
    setShowRevertConfirm(null);
    
    try {
      // 1. Force local state update for instant visual feedback
      setStudents(prev => prev.map(s => {
        if (s.id === student.id) {
          return { ...s, status: 'ACTIVE', cancel_reason: null, cancel_date: null, cancelled_by: null };
        }
        return s;
      }));

      // 2. Trigger database level update
      await db.students.revertAdmission(student.id);
      
      // 3. Record in institutional audit trail
      await createAuditLog(user, 'UPDATE', 'Registry', `Restored Identity: ${student.full_name} (GR: ${student.gr_number})`);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // 4. Background Fetch to perfectly align state
      setTimeout(async () => {
         await fetchRegistry();
      }, 500);
      
    } catch (err: any) {
      const msg = getErrorMessage(err);
      console.error("REVERT ACTION FAILURE:", err);
      
      // If db fails, roll back local UI state to show record as cancelled again
      await fetchRegistry();
      
      setShowErrorModal({ 
        message: msg, 
        code: err?.code || 'SYNC_TERMINAL_ERROR', 
        raw: JSON.stringify(err, null, 2) 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm("FATAL ACTION: Permanently erase this record? This cannot be undone.")) return;
    
    setIsSyncing(true);
    try {
      await db.students.delete(id);
      await createAuditLog(user, 'DELETE', 'Registry', `Permanently Purged Student Identity Record`);
      setStudents(prev => prev.filter(s => s.id !== id));
      setShowDeleteConfirm(null);
      await fetchRegistry();
    } catch (err: any) {
      alert(`Purge failed: ${getErrorMessage(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      <div className="flex flex-wrap gap-4 no-print">
         <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-2 rounded-full shadow-sm">
            {isOnline ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-rose-500" />}
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{isOnline ? 'Cloud: Online' : 'Cloud: Offline'}</span>
         </div>
         <button onClick={() => { setIsSyncing(true); fetchRegistry().then(() => setIsSyncing(false)); }} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 px-4 py-2 rounded-full shadow-sm hover:bg-indigo-100 transition-all">
            <RefreshCw size={14} className={`text-indigo-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-[8px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Manual Data Resync</span>
         </button>
      </div>

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Operation Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Central Hub Synchronized</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Admission Control <UserMinus className="text-rose-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Identity Revocation and Restoration Manager.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
           <button 
            onClick={() => setViewMode('ACTIVE')}
            className={`px-8 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'ACTIVE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
           >
              Active List
           </button>
           <button 
            onClick={() => setViewMode('CANCELLED')}
            className={`px-8 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'CANCELLED' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
           >
              Cancelled Pool
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative group w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Search archive (Name/GR)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner dark:text-white uppercase text-sm" />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full pb-2 custom-scrollbar">
              <button onClick={() => setSelectedClass('All')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedClass === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>All Grades</button>
              {ALL_CLASSES.map(c => (
                <button key={c} onClick={() => setSelectedClass(c)} className={`whitespace-nowrap px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${selectedClass === c ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{c}</button>
              ))}
          </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center animate-pulse">
            <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
            <p className="font-black text-xs uppercase tracking-widest text-slate-400">Pinging Database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-6 text-left">Identity Profile</th>
                  <th className="px-8 py-6 text-left">Academic Location</th>
                  <th className="px-8 py-6 text-left">Status Trace</th>
                  <th className="px-8 py-6 text-right">Registry Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="px-8 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
                           {student.profile_image ? <img src={student.profile_image} className="w-full h-full object-cover" /> : <UserIcon size={24}/>}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-white text-base uppercase leading-tight">{student.full_name}</p>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">GR: {student.gr_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Standard {student.class}-{student.section}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Roll No: {student.roll_no || 'N/A'}</p>
                       </div>
                    </td>
                    <td className="px-8 py-8">
                      {student.status === 'CANCELLED' ? (
                        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 p-5 rounded-3xl max-w-sm shadow-sm relative">
                           <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                 <ShieldAlert size={14} className="text-rose-600" />
                                 <span className="text-[9px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Revoked Identity</span>
                              </div>
                              <div className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[8px] font-black uppercase">Archived</div>
                           </div>
                           <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900 mb-4 shadow-inner">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><FileText size={10}/> Reason</p>
                              <p className="text-[11px] font-bold text-slate-800 dark:text-white uppercase leading-tight italic line-clamp-2">"{student.cancel_reason || 'TERMINATED'}"</p>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={10}/> Date</p>
                                 <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{student.cancel_date || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Shield size={10}/> Auth</p>
                                 <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase truncate">{student.cancelled_by || 'ADMIN'}</p>
                              </div>
                           </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/20 px-5 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 w-fit">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                           Active Status
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-8 text-right">
                       <div className="flex items-center justify-end gap-3">
                          {student.status === 'CANCELLED' ? (
                            <div className="flex items-center gap-2">
                               <button 
                                onClick={() => setShowRevertConfirm(student)} 
                                disabled={isSyncing || !isOnline}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 border border-indigo-400"
                               >
                                  {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14}/>} 
                                  Revert Admission
                               </button>
                               <button 
                                onClick={() => setShowDeleteConfirm(student.id)} 
                                className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-900 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                               >
                                  <Trash2 size={18}/>
                               </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => { setTargetStudent(student); setShowCancelModal(true); }}
                              className="px-6 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all flex items-center gap-3 border border-rose-50"
                            >
                               <UserMinus size={16} strokeWidth={3} /> Cancel Admission
                            </button>
                          )}
                       </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-40 text-center">
                       <p className="text-slate-300 font-black uppercase text-xs tracking-widest">No matching results found in current registry pool.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REVERT CONFIRMATION MODAL */}
      {showRevertConfirm && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center border border-indigo-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-indigo-100">
                 <RotateCcw size={32} strokeWidth={2.5} className="animate-neural-pulse" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Restore Admission?</h3>
              <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl mb-8 border border-indigo-50 dark:border-indigo-800">
                 <p className="text-slate-800 dark:text-white font-black text-xs uppercase truncate leading-none mb-1">{showRevertConfirm.full_name}</p>
                 <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">GR NO: {showRevertConfirm.gr_number}</p>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] leading-relaxed uppercase tracking-widest">Return this identity to the active student pool. All academic logs will be re-synchronized.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowRevertConfirm(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={executeRevertAdmission} className="py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px]">Restore</button>
              </div>
           </div>
        </div>
      )}

      {/* ERROR MODAL */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-2xl w-full overflow-hidden border border-rose-100 dark:border-rose-900/50 flex flex-col animate-in zoom-in-95">
              <div className="p-10 bg-rose-50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/50 text-center">
                 <div className="w-20 h-20 bg-rose-600 text-white rounded-[2rem] flex items-center justify-center mb-6 mx-auto shadow-2xl">
                    <Bug size={40} strokeWidth={2.5} />
                 </div>
                 <h3 className="text-2xl font-black text-rose-900 dark:text-rose-100 uppercase tracking-tight">Sync Failure Diagnostic</h3>
                 <p className="text-rose-600/60 dark:text-rose-400 font-bold text-[10px] uppercase tracking-widest mt-3">Error Ref: {showErrorModal.code || 'CLOUD_REF'}</p>
              </div>
              
              <div className="p-10 space-y-8">
                 <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="text-slate-800 dark:text-slate-200 font-bold text-sm leading-relaxed uppercase italic">"{showErrorModal.message}"</p>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                       <Terminal size={18} />
                       <span className="font-black text-xs uppercase tracking-widest">Registry Stack Trace</span>
                    </div>
                    <div className="bg-slate-950 p-6 rounded-2xl font-mono text-[9px] text-indigo-300 overflow-auto shadow-inner leading-relaxed border border-white/5 max-h-[150px]">
                      {showErrorModal.raw ? <pre>{typeof showErrorModal.raw === 'string' ? showErrorModal.raw : JSON.stringify(showErrorModal.raw, null, 2)}</pre> : 'No trace captured.'}
                    </div>
                 </div>

                 <button onClick={() => setShowErrorModal(null)} className="w-full py-5 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl">Close Terminal</button>
              </div>
           </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && targetStudent && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Revoke Admission</h3>
                 <button onClick={() => setShowCancelModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleProcessCancellation} className="p-8 space-y-6">
                 <div className="flex items-center gap-5 p-5 bg-rose-50 rounded-[2rem] border border-rose-100 shadow-inner">
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center font-black text-rose-600 shadow-md border border-rose-50 shrink-0">
                       {targetStudent.full_name?.charAt(0) || 'S'}
                    </div>
                    <div className="min-w-0">
                       <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">Target Account</p>
                       <p className="text-lg font-black text-slate-900 truncate leading-tight uppercase">{targetStudent.full_name}</p>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for termination</label>
                       <textarea 
                        required
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                        placeholder="ENTER VALID REASON..."
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-bold outline-none focus:border-rose-500 transition-all resize-none shadow-inner uppercase text-[11px]"
                        rows={3}
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Effective Date</label>
                       <input 
                        type="date" 
                        required
                        value={cancelDate}
                        onChange={e => setCancelDate(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black outline-none focus:border-rose-500 shadow-inner" 
                       />
                    </div>
                 </div>
                 <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowCancelModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase text-[10px]">Discard</button>
                    <button 
                      type="submit" 
                      disabled={isProcessing || !cancelReason.trim()} 
                      className="flex-[2] py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />} Authorize
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* DELETE DIALOG */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-xs w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Purge Data?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] uppercase tracking-widest leading-relaxed">Permanently erase this identity. This action is irreversible.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowDeleteConfirm(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={() => handlePermanentDelete(showDeleteConfirm)} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionCancellation;
